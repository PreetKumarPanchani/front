'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import useBrowserSpeechRecognition from './useBrowserSpeechRecognition';

export function useSpeechRecognition(options = {}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [useOpenAI, setUseOpenAI] = useState(false);
  
  // References for audio recording
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  
  // Browser's native speech recognition as fallback
  const browserSpeechRecognition = useBrowserSpeechRecognition({
    onTranscriptReady: (text) => {
      // When browser recognition is done, pass the text to the parent
      if (options.onTranscriptReady && text) {
        options.onTranscriptReady(text);
      }
    }
  });
  
  // Get transcript from browser recognition
  const [transcript, setTranscript] = useState('');
  
  // Update our transcript when browser recognition updates
  useEffect(() => {
    setTranscript(browserSpeechRecognition.transcript);
  }, [browserSpeechRecognition.transcript]);
  
  // Toggle between OpenAI and browser speech recognition
  const toggleRecognitionType = useCallback(() => {
    // Stop any ongoing recording
    if (browserSpeechRecognition.isListening) {
      browserSpeechRecognition.stopListening();
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    setUseOpenAI(!useOpenAI);
  }, [useOpenAI, browserSpeechRecognition]);
  
  // Transcribe audio with OpenAI Whisper
  const transcribeAudio = async (audioBlob) => {
    try {
      setIsProcessing(true);
      
      // Create form data with audio file
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      
      // Send to backend proxy endpoint
      const response = await fetch('/api/transcribe', {
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
      if (options.onTranscriptReady && transcribedText && transcribedText.trim()) {
        options.onTranscriptReady(transcribedText);
      }
      
      return transcribedText;
    } catch (err) {
      console.error('Transcription error:', err);
      setError(err.message || 'Failed to transcribe audio');
      
      // Try browser recognition as fallback
      setUseOpenAI(false);
      browserSpeechRecognition.startListening();
      
      return null;
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Start recording with OpenAI Whisper
  const startOpenAIListening = useCallback(() => {
    if (browserSpeechRecognition.isListening) {
      browserSpeechRecognition.stopListening();
    }
    
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
          });
          
          // Start recording
          recorder.start();
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
  }, [browserSpeechRecognition]);
  
  // Stop OpenAI recording
  const stopOpenAIListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
        return true;
      } catch (err) {
        console.error('Error stopping recorder:', err);
        setError('Failed to stop recording: ' + err.message);
        
        // Ensure stream is cleaned up
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        return false;
      }
    }
    return false;
  }, []);
  
  // Get the current listening state
  const isListening = useOpenAI 
    ? (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording')
    : browserSpeechRecognition.isListening;
  
  // Toggle recording based on current mode
  const toggleListening = useCallback(() => {
    if (useOpenAI) {
      if (isListening) {
        return stopOpenAIListening();
      } else {
        return startOpenAIListening();
      }
    } else {
      return browserSpeechRecognition.toggleListening();
    }
  }, [useOpenAI, isListening, startOpenAIListening, stopOpenAIListening, browserSpeechRecognition]);
  
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
    toggleRecognitionType,
    useOpenAI,
    supported: useOpenAI || browserSpeechRecognition.supported
  };
}

export default useSpeechRecognition;