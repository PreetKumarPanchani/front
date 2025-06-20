'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export function useOpenAISpeechRecognition(options = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  
  // References for audio recording
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  
  // Callback function for when transcript is ready
  const onTranscriptReady = options.onTranscriptReady || (() => {});
  
  // Configuration for recording
  const apiEndpoint = options.apiEndpoint || '/api/transcribe'; // Backend proxy for OpenAI
  
  // Convert audio blob to base64
  const convertBlobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result.split(',')[1];
        resolve(base64data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };
  
  // Send audio to OpenAI Whisper via backend proxy
  const transcribeAudio = async (audioBlob) => {
    try {
      setIsProcessing(true);
      
      // Create form data with audio file
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      formData.append('model', 'whisper-1');
      
      // Send to backend proxy endpoint
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      const transcribedText = result.text;
      
      console.log('Transcription result:', transcribedText);
      setTranscript(transcribedText);
      
      // Notify parent component
      if (transcribedText && transcribedText.trim()) {
        onTranscriptReady(transcribedText);
      }
      
      return transcribedText;
    } catch (err) {
      console.error('Transcription error:', err);
      setError(err.message || 'Failed to transcribe audio');
      return null;
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Start recording
  const startListening = useCallback(() => {
    if (isListening) return false;
    
    if (!navigator.mediaDevices) {
      setError('Media devices not supported in this browser');
      return false;
    }
    
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        streamRef.current = stream;
        audioChunksRef.current = [];
        
        try {
          // Configure media recorder
          const options = { mimeType: 'audio/webm' };
          const recorder = new MediaRecorder(stream, options);
          mediaRecorderRef.current = recorder;
          
          // Collect audio chunks
          recorder.addEventListener('dataavailable', (e) => {
            if (e.data.size > 0) {
              audioChunksRef.current.push(e.data);
            }
          });
          
          // Process when recording stops
          recorder.addEventListener('stop', async () => {
            if (audioChunksRef.current.length > 0) {
              const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
              await transcribeAudio(audioBlob);
            }
            
            // Stop all tracks
            if (streamRef.current) {
              streamRef.current.getTracks().forEach(track => track.stop());
              streamRef.current = null;
            }
            
            setIsListening(false);
          });
          
          // Start recording
          recorder.start();
          setIsListening(true);
          setTranscript('');
          setError(null);
          
          return true;
        } catch (err) {
          console.error('Error starting recorder:', err);
          setError('Failed to start recording: ' + err.message);
          
          // Clean up stream
          stream.getTracks().forEach(track => track.stop());
          return false;
        }
      })
      .catch(err => {
        console.error('Microphone access error:', err);
        setError('Microphone access denied or not available');
        return false;
      });
      
    return true;
  }, [isListening, apiEndpoint, onTranscriptReady]);
  
  // Stop recording
  const stopListening = useCallback(() => {
    if (!isListening || !mediaRecorderRef.current) return false;
    
    try {
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      
      return true;
    } catch (err) {
      console.error('Error stopping recorder:', err);
      setError('Failed to stop recording: ' + err.message);
      
      // Ensure stream is cleaned up
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      setIsListening(false);
      return false;
    }
  }, [isListening]);
  
  // Toggle recording
  const toggleListening = useCallback(() => {
    return isListening ? stopListening() : startListening();
  }, [isListening, startListening, stopListening]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (err) {
          console.error('Error stopping recorder during cleanup:', err);
        }
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);
  
  return {
    isListening,
    isProcessing,
    transcript,
    error,
    toggleListening,
    startListening,
    stopListening,
  };
}

export default useOpenAISpeechRecognition;