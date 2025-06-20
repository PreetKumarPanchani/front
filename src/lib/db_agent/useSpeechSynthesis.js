'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export function useSpeechSynthesis(options = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [useOpenAI, setUseOpenAI] = useState(false);
  
  // Audio elements and management
  const audioRef = useRef(null);
  const utteranceRef = useRef(null);
  const abortControllerRef = useRef(null);
  
  // Check if browser speech synthesis is supported
  const browserSynthesisSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  
  // Configuration
  const defaultOptions = {
    voice: 'onyx',    // Default OpenAI voice
    speed: 1.0,       // Default speed
    pitch: 1.0,       // Default pitch (for browser TTS)
    volume: 1.0       // Default volume (for browser TTS)
  };
  
  const mergedOptions = { ...defaultOptions, ...options };
  
  // Create audio element on client
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioRef.current) {
      const audio = new Audio();
      
      audio.addEventListener('play', () => {
        setIsSpeaking(true);
      });
      
      audio.addEventListener('ended', () => {
        setIsSpeaking(false);
        if (audioRef.current) {
          audioRef.current.src = '';
        }
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
      
      if (browserSynthesisSupported && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  
  // Process WebSocket audio chunks directly
  const processAudioChunk = useCallback((base64data) => {
    if (!audioRef.current || !base64data) return;
    
    try {
      // We need to create an audio context on first chunk
      if (!window.audioContext) {
        window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      // Decode base64 to array buffer
      const binaryString = atob(base64data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Create audio buffer from the bytes
      window.audioContext.decodeAudioData(bytes.buffer, (buffer) => {
        // Create audio source
        const source = window.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(window.audioContext.destination);
        source.start(0);
        
        // Set speaking state
        setIsSpeaking(true);
        
        // Handle completion
        source.onended = () => {
          setIsSpeaking(false);
        };
      });
      
    } catch (err) {
      console.error('Error processing audio chunk:', err);
    }
  }, []);
  
  // Toggle between OpenAI TTS and browser TTS
  const toggleSynthesisType = useCallback(() => {
    // Cancel any ongoing speech
    cancel();
    setUseOpenAI(!useOpenAI);
  }, [useOpenAI]);
  
  // Speak using OpenAI TTS
  const speakWithOpenAI = useCallback(async (text, customOptions = {}) => {
    if (!text || text.trim() === '') {
      setError('No text provided to speak');
      return false;
    }
    
    try {
      // Cancel any current speech
      if (isSpeaking) {
        cancel();
      }
      
      // Create new abort controller for this request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      
      setIsLoading(true);
      setError(null);
      
      // Prepare request
      const speakOptions = {
        voice: customOptions.voice || mergedOptions.voice,
        speed: customOptions.speed || mergedOptions.speed
      };
      
      // Make API request through backend proxy
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: speakOptions.voice,
          speed: speakOptions.speed
        }),
        signal: abortControllerRef.current.signal
      });
      
      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.status} ${response.statusText}`);
      }
      
      // Get audio data
      const responseData = await response.json();
      
      if (responseData.audioData) {
        if (!audioRef.current) {
          throw new Error('Audio element not initialized');
        }
        
        const audioSrc = `data:audio/mp3;base64,${responseData.audioData}`;
        
        // Make sure we haven't been interrupted during the fetch
        if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
          audioRef.current.src = audioSrc;
          
          try {
            await audioRef.current.play();
            return true;
          } catch (playError) {
            console.error('Audio playback error:', playError);
            throw new Error('Failed to play audio: ' + playError.message);
          }
        } else {
          // Request was aborted during fetch
          console.log('TTS request was aborted, not playing audio');
          return false;
        }
      } else {
        throw new Error('No audio data received from server');
      }
    } catch (err) {
      // Don't show error if it was just an abort
      if (err.name === 'AbortError') {
        console.log('TTS request aborted');
        return false;
      }
      
      console.error('OpenAI TTS error:', err);
      setError(err.message || 'Failed to generate speech');
      
      // Try browser TTS as fallback
      if (browserSynthesisSupported) {
        console.log('Falling back to browser TTS');
        return speakWithBrowser(text, customOptions);
      }
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSpeaking, mergedOptions.voice, mergedOptions.speed]);
  
  // Speak using browser's built-in speech synthesis
  const speakWithBrowser = useCallback((text, customOptions = {}) => {
    if (!text || !browserSynthesisSupported) {
      return false;
    }
    
    try {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      // Create utterance
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Apply options
      utterance.rate = customOptions.rate || mergedOptions.speed;
      utterance.pitch = customOptions.pitch || mergedOptions.pitch;
      utterance.volume = customOptions.volume || mergedOptions.volume;
      
      // Try to find a good voice
      if (window.speechSynthesis.getVoices().length > 0) {
        const voices = window.speechSynthesis.getVoices();
        const englishVoice = voices.find(v => v.lang.startsWith('en'));
        if (englishVoice) {
          utterance.voice = englishVoice;
        }
      }
      
      // Set up event handlers
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (e) => {
        console.error('Speech synthesis error:', e);
        setIsSpeaking(false);
        setError('Browser speech synthesis failed');
      };
      
      // Store for later reference
      utteranceRef.current = utterance;
      
      // Start speaking
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (err) {
      console.error('Browser speech synthesis error:', err);
      setError('Browser speech synthesis failed: ' + err.message);
      return false;
    }
  }, [mergedOptions.speed, mergedOptions.pitch, mergedOptions.volume]);
  
  // Main speak function that uses the appropriate implementation
  const speak = useCallback((text, customOptions = {}) => {
    if (useOpenAI) {
      return speakWithOpenAI(text, customOptions);
    } else {
      return speakWithBrowser(text, customOptions);
    }
  }, [useOpenAI, speakWithOpenAI, speakWithBrowser]);
  
  // Cancel ongoing speech
  const cancel = useCallback(() => {
    // Cancel any pending fetch requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Stop audio element
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    
    // Stop Web Audio API if it's being used
    if (window.audioContext) {
      // Close all audio contexts
      try {
        window.audioContext.close();
        window.audioContext = null;
      } catch (e) {
        console.error('Error closing audio context:', e);
      }
    }
    
    // Cancel browser speech synthesis
    if (browserSynthesisSupported) {
      window.speechSynthesis.cancel();
    }
    
    setIsSpeaking(false);
    setIsLoading(false);
    
    return true;
  }, []);
  
  return {
    speak,
    cancel,
    processAudioChunk,
    toggleSynthesisType,
    isSpeaking,
    isLoading,
    error,
    useOpenAI,
    supported: useOpenAI || browserSynthesisSupported
  };
}

export default useSpeechSynthesis;

/*
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export function useSpeechSynthesis(options = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [useOpenAI, setUseOpenAI] = useState(true);
  
  // Audio elements and management
  const audioRef = useRef(null);
  const utteranceRef = useRef(null);
  
  // Check if browser speech synthesis is supported
  const browserSynthesisSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  
  // Configuration
  const defaultOptions = {
    voice: 'onyx',    // Default OpenAI voice
    speed: 1.0,       // Default speed
    pitch: 1.0,       // Default pitch (for browser TTS)
    volume: 1.0       // Default volume (for browser TTS)
  };
  
  const mergedOptions = { ...defaultOptions, ...options };
  
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
      
      if (browserSynthesisSupported && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);
  
  // Toggle between OpenAI TTS and browser TTS
  const toggleSynthesisType = useCallback(() => {
    // Cancel any ongoing speech
    cancel();
    setUseOpenAI(!useOpenAI);
  }, [useOpenAI]);
  
  // Speak using OpenAI TTS
  const speakWithOpenAI = useCallback(async (text, customOptions = {}) => {
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
      
      // Prepare request
      const speakOptions = {
        voice: customOptions.voice || mergedOptions.voice,
        speed: customOptions.speed || mergedOptions.speed
      };
      
      // Make API request through backend proxy
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: speakOptions.voice,
          speed: speakOptions.speed
        })
      });
      
      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.status} ${response.statusText}`);
      }
      
      // Get audio data
      const responseData = await response.json();
      
      if (responseData.audioData) {
        if (!audioRef.current) {
          throw new Error('Audio element not initialized');
        }
        
        const audioSrc = `data:audio/mp3;base64,${responseData.audioData}`;
        audioRef.current.src = audioSrc;
        await audioRef.current.play();
        return true;
      } else {
        throw new Error('No audio data received from server');
      }
    } catch (err) {
      console.error('OpenAI TTS error:', err);
      setError(err.message || 'Failed to generate speech');
      
      // Try browser TTS as fallback
      if (browserSynthesisSupported) {
        console.log('Falling back to browser TTS');
        return speakWithBrowser(text, customOptions);
      }
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSpeaking, mergedOptions.voice, mergedOptions.speed]);
  
  // Speak using browser's built-in speech synthesis
  const speakWithBrowser = useCallback((text, customOptions = {}) => {
    if (!text || !browserSynthesisSupported) {
      return false;
    }
    
    try {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      // Create utterance
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Apply options
      utterance.rate = customOptions.rate || mergedOptions.speed;
      utterance.pitch = customOptions.pitch || mergedOptions.pitch;
      utterance.volume = customOptions.volume || mergedOptions.volume;
      
      // Try to find a good voice
      if (window.speechSynthesis.getVoices().length > 0) {
        const voices = window.speechSynthesis.getVoices();
        const englishVoice = voices.find(v => v.lang.startsWith('en'));
        if (englishVoice) {
          utterance.voice = englishVoice;
        }
      }
      
      // Set up event handlers
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (e) => {
        console.error('Speech synthesis error:', e);
        setIsSpeaking(false);
        setError('Browser speech synthesis failed');
      };
      
      // Store for later reference
      utteranceRef.current = utterance;
      
      // Start speaking
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (err) {
      console.error('Browser speech synthesis error:', err);
      setError('Browser speech synthesis failed: ' + err.message);
      return false;
    }
  }, [mergedOptions.speed, mergedOptions.pitch, mergedOptions.volume]);
  
  // Main speak function that uses the appropriate implementation
  const speak = useCallback((text, customOptions = {}) => {
    if (useOpenAI) {
      return speakWithOpenAI(text, customOptions);
    } else {
      return speakWithBrowser(text, customOptions);
    }
  }, [useOpenAI, speakWithOpenAI, speakWithBrowser]);
  
  // Cancel ongoing speech
  const cancel = useCallback(() => {
    if (useOpenAI && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      setIsSpeaking(false);
      return true;
    } else if (!useOpenAI && browserSynthesisSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return true;
    }
    return false;
  }, [useOpenAI]);
  
  return {
    speak,
    cancel,
    toggleSynthesisType,
    isSpeaking,
    isLoading,
    error,
    useOpenAI,
    supported: useOpenAI || browserSynthesisSupported
  };
}

export default useSpeechSynthesis;

*/