'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export function useOpenAISpeechSynthesis(options = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Audio elements and management
  const audioRef = useRef(null);
  const currentTextRef = useRef('');
  
  // Configuration
  const apiEndpoint = options.apiEndpoint || '/api/tts';
  const voice = options.voice || 'onyx'; // OpenAI voices: alloy, echo, fable, onyx, nova, shimmer
  
  // Create audio element on client
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioRef.current) {
      const audio = new Audio();
      
      audio.addEventListener('play', () => {
        setIsSpeaking(true);
      });
      
      audio.addEventListener('ended', () => {
        setIsSpeaking(false);
        audioRef.current.src = '';
      });
      
      audio.addEventListener('pause', () => {
        setIsSpeaking(false);
      });
      
      audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        setIsSpeaking(false);
        setError('Audio playback failed');
      });
      
      audioRef.current = audio;
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);
  
  // Speak text using OpenAI TTS
  const speak = useCallback(async (text, customOptions = {}) => {
    if (!text || text.trim() === '') {
      setError('No text provided to speak');
      return false;
    }
    
    try {
      // Cancel any current speech
      if (isSpeaking) {
        cancel();
      }
      
      setIsLoading(true);
      setError(null);
      currentTextRef.current = text;
      
      // Prepare request
      const speakOptions = {
        voice: customOptions.voice || voice,
        speed: customOptions.speed || 1,
        model: 'tts-1'
      };
      
      // Make API request through backend proxy
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: speakOptions.voice,
          speed: speakOptions.speed,
          model: speakOptions.model
        })
      });
      
      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.status} ${response.statusText}`);
      }
      
      // Get audio URL or audio data
      const responseData = await response.json();
      
      if (responseData.audioUrl) {
        // If backend returns a URL to the audio
        if (!audioRef.current) {
          throw new Error('Audio element not initialized');
        }
        
        audioRef.current.src = responseData.audioUrl;
        audioRef.current.play().catch(e => {
          console.error('Error playing audio:', e);
          setError('Failed to play audio');
        });
      } else if (responseData.audioData) {
        // If backend returns base64 audio data
        if (!audioRef.current) {
          throw new Error('Audio element not initialized');
        }
        
        const audioSrc = `data:audio/mp3;base64,${responseData.audioData}`;
        audioRef.current.src = audioSrc;
        audioRef.current.play().catch(e => {
          console.error('Error playing audio:', e);
          setError('Failed to play audio');
        });
      } else {
        throw new Error('No audio data received from server');
      }
      
      return true;
    } catch (err) {
      console.error('TTS error:', err);
      setError(err.message || 'Failed to generate speech');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [apiEndpoint, voice, isSpeaking]);
  
  // Cancel ongoing speech
  const cancel = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      setIsSpeaking(false);
      return true;
    }
    return false;
  }, []);
  
  // Set up browser's fallback TTS in case OpenAI TTS fails
  const speakFallback = useCallback((text) => {
    if (!text || typeof window === 'undefined' || !window.speechSynthesis) {
      return false;
    }
    
    try {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      // Create utterance
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Find a good voice
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(v => v.lang.startsWith('en'));
      if (englishVoice) {
        utterance.voice = englishVoice;
      }
      
      // Set up event handlers
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (e) => {
        console.error('Speech synthesis error:', e);
        setIsSpeaking(false);
        setError('Fallback speech synthesis failed');
      };
      
      // Start speaking
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (err) {
      console.error('Fallback speech synthesis error:', err);
      return false;
    }
  }, []);
  
  // Combined speak function with fallback
  const speakWithFallback = useCallback(async (text, options = {}) => {
    try {
      // Try OpenAI TTS first
      const success = await speak(text, options);
      
      // Fall back to browser TTS if OpenAI fails
      if (!success && !options.noFallback) {
        console.log('Falling back to browser speech synthesis');
        return speakFallback(text);
      }
      
      return success;
    } catch (err) {
      console.error('Speech synthesis error:', err);
      
      // Try fallback unless explicitly disabled
      if (!options.noFallback) {
        console.log('Falling back to browser speech synthesis after error');
        return speakFallback(text);
      }
      
      return false;
    }
  }, [speak, speakFallback]);
  
  return {
    speak: speakWithFallback,
    cancel,
    isSpeaking,
    isLoading,
    error,
  };
}

export default useOpenAISpeechSynthesis;