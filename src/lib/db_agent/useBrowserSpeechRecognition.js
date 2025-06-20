'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export function useBrowserSpeechRecognition(options = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  
  // Initialize speech recognition with browser API
  const recognitionRef = useRef(null);
  const browserSupportsSpeechRecognition = typeof window !== 'undefined' && 
    (window.SpeechRecognition || window.webkitSpeechRecognition);
  
  // Callback function for when transcript is ready
  const onTranscriptReady = options.onTranscriptReady || (() => {});
  
  // Initialize speech recognition
  const initRecognition = useCallback(() => {
    if (!browserSupportsSpeechRecognition) {
      setError('Browser does not support speech recognition');
      return false;
    }
    
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      // Configure recognition
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = options.language || 'en-US';
      
      // Set up event handlers
      recognition.onstart = () => {
        console.log('Speech recognition started');
        setIsListening(true);
        setTranscript('');
        setError(null);
      };
      
      recognition.onresult = (event) => {
        const current = event.resultIndex;
        const result = event.results[current];
        const transcriptText = result[0].transcript;
        
        console.log('Speech recognized:', transcriptText);
        setTranscript(transcriptText);
        
        // If this is a final result, not interim
        if (result.isFinal) {
          onTranscriptReady(transcriptText);
        }
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setError(event.error);
        setIsListening(false);
      };
      
      recognition.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
      return true;
    } catch (err) {
      console.error('Error initializing speech recognition:', err);
      setError('Failed to initialize speech recognition');
      return false;
    }
  }, [browserSupportsSpeechRecognition, options.language, onTranscriptReady]);
  
  // Start listening
  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      if (!initRecognition()) {
        return false;
      }
    }
    
    try {
      recognitionRef.current.start();
      return true;
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      setError('Failed to start speech recognition');
      return false;
    }
  }, [initRecognition]);
  
  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        return true;
      } catch (err) {
        console.error('Error stopping speech recognition:', err);
        return false;
      }
    }
    return false;
  }, []);
  
  // Toggle listening state
  const toggleListening = useCallback(() => {
    if (isListening) {
      return stopListening();
    } else {
      return startListening();
    }
  }, [isListening, startListening, stopListening]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
    };
  }, [isListening]);
  
  return {
    isListening,
    transcript,
    error,
    toggleListening,
    startListening,
    stopListening,
    supported: browserSupportsSpeechRecognition
  };
}

export default useBrowserSpeechRecognition;