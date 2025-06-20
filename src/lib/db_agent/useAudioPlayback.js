
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export function useAudioPlayback() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  // References for audio handling
  const audioContextRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const pcmBufferRef = useRef([]);
  const isReceivingAudioRef = useRef(false);
  const isProcessingRef = useRef(false);
  const sampleRateRef = useRef(24000);
  
  // Buffer management
  const initialBufferSize = 8;     // Minimum chunks to buffer before playback
  const nextPlayTimeRef = useRef(0); // Next scheduled play time
  
  // Debug counters
  const receivedRef = useRef(0);
  const playedRef = useRef(0);
  
  // Initialize Web Audio API context
  const initAudioContext = useCallback(() => {
    try {
      if (!audioContextRef.current && typeof window !== 'undefined') {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        console.log("Audio context initialized with sample rate:", audioContextRef.current.sampleRate);
      }
      return true;
    } catch (e) {
      console.error('Failed to initialize audio context:', e);
      return false;
    }
  }, []);
  
  // Convert PCM data to AudioBuffer
  const createAudioBuffer = useCallback((pcmData) => {
    if (!audioContextRef.current) return null;
    
    try {
      const numSamples = pcmData.length / 2; // 16-bit = 2 bytes per sample
      const audioBuffer = audioContextRef.current.createBuffer(1, numSamples, sampleRateRef.current);
      const channelData = audioBuffer.getChannelData(0);
      
      // OpenAI PCM format is 16-bit signed little-endian
      let offset = 0;
      for (let i = 0; i < numSamples; i++) {
        // Convert 16-bit PCM to float
        const sample = (pcmData[offset] & 0xff) | ((pcmData[offset + 1] & 0xff) << 8);
        // Handle signed integers (convert to -1.0 to 1.0 range)
        channelData[i] = (sample >= 0x8000) ? -1 + ((sample & 0x7fff) / 0x8000) : sample / 0x7fff;
        offset += 2;
      }
      
      return audioBuffer;
    } catch (e) {
      console.error('Error creating audio buffer:', e);
      return null;
    }
  }, []);
  
  // Play a single chunk with precise scheduling
  const playChunk = useCallback((audioBuffer) => {
    if (!audioContextRef.current || !audioBuffer) return false;
    
    try {
      const ctx = audioContextRef.current;
      const currentTime = ctx.currentTime;
      
      // Create audio source
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      
      // Determine start time - either now or after the previous chunk
      const startTime = Math.max(currentTime, nextPlayTimeRef.current);
      
      // Update next play time
      nextPlayTimeRef.current = startTime + audioBuffer.duration;
      
      // Start playback
      source.start(startTime);
      const playedCount = playedRef.current++;
      
      console.log(`[AUDIO] Playing chunk #${playedCount}: start=${startTime.toFixed(3)}s, duration=${audioBuffer.duration.toFixed(3)}s, buffer=${pcmBufferRef.current.length} remaining, context time=${currentTime.toFixed(3)}`);
      
      return true;
    } catch (e) {
      console.error('[AUDIO] Error playing chunk:', e);
      return false;
    }
  }, []);
  
  // Process audio chunks in the buffer
  const processBuffer = useCallback(() => {
    if (isProcessingRef.current || pcmBufferRef.current.length === 0) {
      console.log(`[AUDIO] Process buffer called but ${isProcessingRef.current ? 'already processing' : 'buffer empty'}`);
      return;
    }
    
    // First time we have enough to start playback
    if (!isPlaying && pcmBufferRef.current.length < initialBufferSize) {
      console.log(`[AUDIO] Buffering: ${pcmBufferRef.current.length}/${initialBufferSize} chunks (${Math.floor(pcmBufferRef.current.length/initialBufferSize*100)}%)`);
      return;
    }
    
    console.log(`[AUDIO] Starting to process ${pcmBufferRef.current.length} buffered chunks`);
    isProcessingRef.current = true;
    
    try {
      // Start playing from buffer - keep playing until buffer is empty
      while (pcmBufferRef.current.length > 0) {
        // Get next chunk
        const pcmData = pcmBufferRef.current.shift();
        console.log(`[AUDIO] Processing chunk: ${pcmData.length} bytes, ${pcmBufferRef.current.length} chunks remaining`);
        
        // Convert to audio buffer
        const audioBuffer = createAudioBuffer(pcmData);
        if (!audioBuffer) {
          console.error('[AUDIO] Failed to create audio buffer, skipping chunk');
          continue;
        }
        
        // Play it
        playChunk(audioBuffer);
        
        // Update UI state if we're starting
        if (!isPlaying) {
          setIsPlaying(true);
          console.log(`[AUDIO] Starting playback with ${initialBufferSize} chunks buffered`);
        }
      }
      
      console.log('[AUDIO] Buffer empty, finished processing');
    } catch (e) {
      console.error('[AUDIO] Error processing buffer:', e);
    } finally {
      isProcessingRef.current = false;
      console.log('[AUDIO] Processing complete, isProcessing=false');
    }
  }, [createAudioBuffer, isPlaying, playChunk]);
  
  // Process incoming PCM chunk
  const processPcmChunk = useCallback((base64data) => {
    if (isMuted || !isReceivingAudioRef.current) return;
    
    try {
      const chunkNumber = receivedRef.current;
      receivedRef.current++;
      
      console.log(`[AUDIO] Received chunk #${chunkNumber} of size ${base64data.length}`);

      // Log buffer state before adding new chunk
      console.log(`[AUDIO] Buffer state before: ${pcmBufferRef.current.length} chunks`);
      
      // Convert base64 to ArrayBuffer
      const binaryString = atob(base64data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Add to buffer
      pcmBufferRef.current.push(bytes);
      
      // Log buffer state after adding new chunk
      console.log(`[AUDIO] Buffer state after: ${pcmBufferRef.current.length} chunks`);
      
      // Process buffer if not already processing
      if (!isProcessingRef.current) {
        console.log(`[AUDIO] Starting buffer processing with ${pcmBufferRef.current.length} chunks`);
        processBuffer();
      } else {
        console.log(`[AUDIO] Already processing buffer, chunk queued`);
      }
    } catch (e) {
      console.error('[AUDIO] Error processing PCM chunk:', e);
    }
  }, [isMuted, processBuffer]);
  
  // Start PCM audio stream
  const startPcmStream = useCallback((sampleRate = 24000) => {
    if (isMuted) return false;
    
    console.log(`[AUDIO] Starting PCM stream with sample rate ${sampleRate}Hz`);
    
    // Initialize audio context
    if (!initAudioContext()) return false;
    
    // Reset state
    pcmBufferRef.current = [];
    isReceivingAudioRef.current = true;
    isProcessingRef.current = false;
    sampleRateRef.current = sampleRate;
    nextPlayTimeRef.current = 0;
    receivedRef.current = 0;
    playedRef.current = 0;
    
    console.log('[AUDIO] PCM stream initialized, waiting for data');
    
    // Update UI state (not actually playing yet, just ready)
    setIsPlaying(false);
    return true;
  }, [isMuted, initAudioContext]);
  
  // End PCM audio stream
  const endPcmStream = useCallback(() => {
    console.log(`[AUDIO] PCM stream ended: received=${receivedRef.current}, played=${playedRef.current}, remaining=${pcmBufferRef.current.length}`);
    isReceivingAudioRef.current = false;
    
    // Process any remaining chunks
    if (pcmBufferRef.current.length > 0 && !isProcessingRef.current) {
      console.log(`[AUDIO] Processing ${pcmBufferRef.current.length} remaining chunks after stream end`);
      processBuffer();
    } else {
      console.log('[AUDIO] No chunks to process after stream end');
    }
  }, [processBuffer]);
  
  // Interrupt playback
  const interruptPlayback = useCallback(() => {
    console.log("[AUDIO] Interrupting playback");
    
    // Reset audio context to stop all sound immediately
    if (audioContextRef.current) {
      try {
        console.log('[AUDIO] Closing audio context');
        audioContextRef.current.close();
        audioContextRef.current = null;
        initAudioContext();
      } catch (e) {
        console.error("[AUDIO] Error resetting audio context:", e);
      }
    }
    
    // Reset everything else
    isReceivingAudioRef.current = false;
    pcmBufferRef.current = [];
    isProcessingRef.current = false;
    nextPlayTimeRef.current = 0;
    
    console.log('[AUDIO] Playback interrupted, all state reset');
    
    // Update UI
    setIsPlaying(false);
    return true;
  }, [initAudioContext]);
  
  // Handle browser interaction for audio playback
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Audio element for standard audio playback if needed
      const audioElement = document.createElement('audio');
      audioElement.style.display = 'none';
      document.body.appendChild(audioElement);
      audioPlayerRef.current = audioElement;
      
      // Init audio context for PCM playback
      initAudioContext();
      
      // Make sure audio context can play by adding user interaction handler
      const handleUserInteraction = () => {
        if (audioContextRef.current && audioContextRef.current.state !== 'running') {
          audioContextRef.current.resume().catch(e => {
            console.error("Error resuming audio context:", e);
          });
        }
      };
      
      // Add event listeners for user interaction
      ['click', 'touchstart', 'keydown'].forEach(event => {
        document.addEventListener(event, handleUserInteraction, { once: false });
      });
      
      return () => {
        // Cleanup
        if (audioElement.parentNode) {
          document.body.removeChild(audioElement);
        }
        
        // Remove event listeners
        ['click', 'touchstart', 'keydown'].forEach(event => {
          document.removeEventListener(event, handleUserInteraction);
        });
        
        // Close audio context
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      };
    }
  }, [initAudioContext]);
  
  return {
    isPlaying,
    isMuted,
    toggleMute: useCallback(() => {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      
      if (newMuted && isPlaying) {
        interruptPlayback();
      }
      
      return newMuted;
    }, [isMuted, isPlaying, interruptPlayback]),
    interruptPlayback,
    startPcmStream,
    endPcmStream,
    processPcmChunk
  };
}

/*
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export function useAudioPlayback() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  // References for audio handling
  const audioContextRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const pcmBufferRef = useRef([]);
  const isReceivingAudioRef = useRef(false);
  const isProcessingRef = useRef(false);
  const sampleRateRef = useRef(24000);
  
  // Enhanced chunk tracking
  const chunkTrackingRef = useRef({
    totalExpected: 0,      // Total chunks expected (if known)
    lastChunkId: -1,       // ID of last received chunk
    receivedChunks: {},    // Object to track received chunks by ID
    missingChunks: [],     // Array to track missing chunk IDs
    startTime: 0,          // Time when streaming started
    lastChunkTime: 0       // Time when last chunk was received
  });
  
  // Buffer management
  const initialBufferSize = 12;    // Increased from 8 to 12 for better buffering
  const nextPlayTimeRef = useRef(0); // Next scheduled play time
  
  // Debug counters
  const receivedRef = useRef(0);
  const playedRef = useRef(0);
  
  // Initialize Web Audio API context
  const initAudioContext = useCallback(() => {
    try {
      if (!audioContextRef.current && typeof window !== 'undefined') {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        console.log("[AUDIO] Audio context initialized with sample rate:", audioContextRef.current.sampleRate);
      }
      return true;
    } catch (e) {
      console.error('[AUDIO] Failed to initialize audio context:', e);
      return false;
    }
  }, []);
  
  // Convert PCM data to AudioBuffer
  const createAudioBuffer = useCallback((pcmData) => {
    if (!audioContextRef.current) return null;
    
    try {
      const numSamples = pcmData.length / 2; // 16-bit = 2 bytes per sample
      const audioBuffer = audioContextRef.current.createBuffer(1, numSamples, sampleRateRef.current);
      const channelData = audioBuffer.getChannelData(0);
      
      // OpenAI PCM format is 16-bit signed little-endian
      let offset = 0;
      for (let i = 0; i < numSamples; i++) {
        // Convert 16-bit PCM to float
        const sample = (pcmData[offset] & 0xff) | ((pcmData[offset + 1] & 0xff) << 8);
        // Handle signed integers (convert to -1.0 to 1.0 range)
        channelData[i] = (sample >= 0x8000) ? -1 + ((sample & 0x7fff) / 0x8000) : sample / 0x7fff;
        offset += 2;
      }
      
      return audioBuffer;
    } catch (e) {
      console.error('[AUDIO] Error creating audio buffer:', e);
      return null;
    }
  }, []);
  
  // Play a single chunk with precise scheduling - improved with gap detection
  const playChunk = useCallback((audioBuffer, chunkId) => {
    if (!audioContextRef.current || !audioBuffer) return false;
    
    try {
      const ctx = audioContextRef.current;
      const currentTime = ctx.currentTime;
      
      // Create audio source
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      
      // IMPORTANT FIX: If next play time is too far in the future (>0.3s gap),
      // reset it to avoid large silent gaps
      if (nextPlayTimeRef.current > currentTime + 0.3) {
        console.log(`[AUDIO] Resetting playback timing (gap too large: ${(nextPlayTimeRef.current - currentTime).toFixed(3)}s)`);
        nextPlayTimeRef.current = currentTime;
      }
      
      // Determine start time - either now or after the previous chunk
      const startTime = Math.max(currentTime, nextPlayTimeRef.current);
      
      // Update next play time
      nextPlayTimeRef.current = startTime + audioBuffer.duration;
      
      // Start playback
      source.start(startTime);
      const playedCount = playedRef.current++;
      
      console.log(`[AUDIO] Playing chunk #${chunkId !== undefined ? chunkId : playedCount}: start=${startTime.toFixed(3)}s, duration=${audioBuffer.duration.toFixed(3)}s, buffer=${pcmBufferRef.current.length} remaining, context time=${currentTime.toFixed(3)}`);
      
      // Mark this chunk as played in tracking
      if (chunkId !== undefined) {
        chunkTrackingRef.current.receivedChunks[chunkId].played = true;
        chunkTrackingRef.current.receivedChunks[chunkId].playTime = Date.now();
      }
      
      return true;
    } catch (e) {
      console.error('[AUDIO] Error playing chunk:', e);
      return false;
    }
  }, []);
  
  // Process audio chunks in the buffer - improved with rebuffering logic
  const processBuffer = useCallback(() => {
    if (isProcessingRef.current || pcmBufferRef.current.length === 0) {
      console.log(`[AUDIO] Process buffer called but ${isProcessingRef.current ? 'already processing' : 'buffer empty'}`);
      return;
    }
    
    // First time we have enough to start playback
    if (!isPlaying && pcmBufferRef.current.length < initialBufferSize) {
      console.log(`[AUDIO] Buffering: ${pcmBufferRef.current.length}/${initialBufferSize} chunks (${Math.floor(pcmBufferRef.current.length/initialBufferSize*100)}%)`);
      return;
    }
    
    // IMPORTANT NEW LOGIC: If we're already playing but buffer is getting low,
    // wait until we have at least 4 chunks before continuing
    if (isPlaying && pcmBufferRef.current.length < 4 && isReceivingAudioRef.current) {
      console.log(`[AUDIO] Rebuffering: ${pcmBufferRef.current.length}/4 chunks`);
      return;
    }
    
    console.log(`[AUDIO] Starting to process ${pcmBufferRef.current.length} buffered chunks`);
    isProcessingRef.current = true;
    
    try {
      // Start playing from buffer - keep playing until buffer is empty or rebuffering needed
      while (pcmBufferRef.current.length > 0) {
        // Check if we need to rebuffer
        if (isPlaying && pcmBufferRef.current.length < 3 && isReceivingAudioRef.current) {
          console.log(`[AUDIO] Pausing playback to rebuffer: ${pcmBufferRef.current.length} chunks remaining`);
          break;
        }
        
        // Get next chunk
        const nextChunk = pcmBufferRef.current.shift();
        const chunkId = nextChunk.chunkId;
        const pcmData = nextChunk.data;
        
        console.log(`[AUDIO] Processing chunk #${chunkId}: ${pcmData.length} bytes, ${pcmBufferRef.current.length} chunks remaining`);
        
        // Convert to audio buffer
        const audioBuffer = createAudioBuffer(pcmData);
        if (!audioBuffer) {
          console.error(`[AUDIO] Failed to create audio buffer for chunk #${chunkId}, skipping`);
          continue;
        }
        
        // Play it
        playChunk(audioBuffer, chunkId);
        
        // Update UI state if we're starting
        if (!isPlaying) {
          setIsPlaying(true);
          console.log(`[AUDIO] Starting playback with ${initialBufferSize} chunks buffered`);
        }
      }
      
      if (pcmBufferRef.current.length === 0) {
        console.log('[AUDIO] Buffer empty, finished processing');
      }
    } catch (e) {
      console.error('[AUDIO] Error processing buffer:', e);
    } finally {
      isProcessingRef.current = false;
      console.log('[AUDIO] Processing complete, isProcessing=false');
    }
  }, [createAudioBuffer, isPlaying, playChunk]);
  
  // Process incoming PCM chunk - improved with context recovery and chunk tracking
  const processPcmChunk = useCallback((base64data, metadata = {}) => {
    if (isMuted || !isReceivingAudioRef.current) return;
    
    // IMPORTANT: Check if audio context is suspended and resume it
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      console.log('[AUDIO] Resuming suspended audio context');
      audioContextRef.current.resume().catch(e => {
        console.error('[AUDIO] Error resuming audio context:', e);
      });
    }
    
    try {
      const now = Date.now();
      const chunkNumber = receivedRef.current++;
      
      // Extract chunk metadata if available
      const chunkIndex = metadata.chunkIndex !== undefined ? metadata.chunkIndex : chunkNumber;
      const totalChunks = metadata.totalChunks;
      const audioSampleId = metadata.audioSampleId || 'unknown';
      
      // Update tracking information
      if (totalChunks && chunkTrackingRef.current.totalExpected === 0) {
        chunkTrackingRef.current.totalExpected = totalChunks;
        chunkTrackingRef.current.startTime = now;
        console.log(`[AUDIO] Starting to receive ${totalChunks} chunks for audio sample ${audioSampleId}`);
      }
      
      // Track this chunk
      chunkTrackingRef.current.receivedChunks[chunkIndex] = {
        received: true,
        played: false,
        receiveTime: now,
        playTime: null,
        size: base64data.length
      };
      
      chunkTrackingRef.current.lastChunkId = chunkIndex;
      chunkTrackingRef.current.lastChunkTime = now;
      
      // Check for missing chunks
      if (chunkIndex > 0 && chunkTrackingRef.current.receivedChunks[chunkIndex-1] === undefined) {
        console.warn(`[AUDIO] Missing previous chunk: ${chunkIndex-1}`);
        chunkTrackingRef.current.missingChunks.push(chunkIndex-1);
      }
      
      // Comprehensive log about received chunk and status
      console.log(`[AUDIO] Received chunk #${chunkIndex}${totalChunks ? ` of ${totalChunks}` : ''} for sample ${audioSampleId}: size=${base64data.length}, delay=${chunkIndex > 0 && chunkTrackingRef.current.receivedChunks[chunkIndex-1] ? now - chunkTrackingRef.current.receivedChunks[chunkIndex-1].receiveTime : 'N/A'}ms`);

      // Log buffer state before adding new chunk
      console.log(`[AUDIO] Buffer state before: ${pcmBufferRef.current.length} chunks`);
      
      // Convert base64 to ArrayBuffer
      const binaryString = atob(base64data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Add to buffer with chunk ID
      pcmBufferRef.current.push({
        data: bytes,
        chunkId: chunkIndex,
        metadata: metadata
      });
      
      // Log buffer state after adding new chunk
      console.log(`[AUDIO] Buffer state after: ${pcmBufferRef.current.length} chunks`);
      
      // Process buffer if not already processing
      if (!isProcessingRef.current) {
        console.log(`[AUDIO] Starting buffer processing with ${pcmBufferRef.current.length} chunks`);
        processBuffer();
      } else {
        console.log(`[AUDIO] Already processing buffer, chunk queued`);
      }
      
      // If this was the last chunk, log a summary
      if (totalChunks && chunkIndex === totalChunks - 1) {
        const received = Object.keys(chunkTrackingRef.current.receivedChunks).length;
        console.log(`[AUDIO] Received all chunks (${received}/${totalChunks}) for audio sample ${audioSampleId}`);
        
        if (chunkTrackingRef.current.missingChunks.length > 0) {
          console.warn(`[AUDIO] Missing chunks: ${chunkTrackingRef.current.missingChunks.join(', ')}`);
        }
      }
    } catch (e) {
      console.error('[AUDIO] Error processing PCM chunk:', e);
    }
  }, [isMuted, processBuffer]);
  
  // Start PCM audio stream
  const startPcmStream = useCallback((sampleRate = 24000) => {
    if (isMuted) return false;
    
    console.log(`[AUDIO] Starting PCM stream with sample rate ${sampleRate}Hz`);
    
    // Initialize audio context
    if (!initAudioContext()) return false;
    
    // Reset state
    pcmBufferRef.current = [];
    isReceivingAudioRef.current = true;
    isProcessingRef.current = false;
    sampleRateRef.current = sampleRate;
    nextPlayTimeRef.current = 0;
    receivedRef.current = 0;
    playedRef.current = 0;
    
    // Reset chunk tracking
    chunkTrackingRef.current = {
      totalExpected: 0,
      lastChunkId: -1,
      receivedChunks: {},
      missingChunks: [],
      startTime: 0,
      lastChunkTime: 0
    };
    
    // Make sure audio context is in running state
    if (audioContextRef.current && audioContextRef.current.state !== 'running') {
      console.log(`[AUDIO] Attempting to resume audio context from ${audioContextRef.current.state} state`);
      audioContextRef.current.resume().catch(e => {
        console.error('[AUDIO] Error resuming audio context:', e);
      });
    }
    
    console.log('[AUDIO] PCM stream initialized, waiting for data');
    
    // Update UI state (not actually playing yet, just ready)
    setIsPlaying(false);
    return true;
  }, [isMuted, initAudioContext]);
  
  // End PCM audio stream with enhanced reporting
  const endPcmStream = useCallback(() => {
    const received = Object.keys(chunkTrackingRef.current.receivedChunks).length;
    const totalExpected = chunkTrackingRef.current.totalExpected;
    
    console.log(`[AUDIO] PCM stream ended: received=${receivedRef.current}, played=${playedRef.current}, remaining=${pcmBufferRef.current.length}`);
    
    if (totalExpected > 0) {
      console.log(`[AUDIO] Stream completion: ${received}/${totalExpected} chunks (${Math.round(received/totalExpected*100)}%)`);
      
      // Report on missing chunks
      if (chunkTrackingRef.current.missingChunks.length > 0) {
        console.warn(`[AUDIO] Stream had ${chunkTrackingRef.current.missingChunks.length} missing chunks: ${chunkTrackingRef.current.missingChunks.join(', ')}`);
      }
      
      // Calculate timing statistics
      if (chunkTrackingRef.current.startTime > 0 && chunkTrackingRef.current.lastChunkTime > 0) {
        const totalTime = chunkTrackingRef.current.lastChunkTime - chunkTrackingRef.current.startTime;
        const avgChunkInterval = received > 1 ? totalTime / (received - 1) : 0;
        console.log(`[AUDIO] Stream timing: ${totalTime}ms total, ~${avgChunkInterval.toFixed(2)}ms between chunks`);
      }
    }
    
    isReceivingAudioRef.current = false;
    
    // Process any remaining chunks
    if (pcmBufferRef.current.length > 0 && !isProcessingRef.current) {
      console.log(`[AUDIO] Processing ${pcmBufferRef.current.length} remaining chunks after stream end`);
      processBuffer();
    } else {
      console.log('[AUDIO] No chunks to process after stream end');
    }
  }, [processBuffer]);
  
  // Interrupt playback
  const interruptPlayback = useCallback(() => {
    console.log("[AUDIO] Interrupting playback");
    
    // Reset audio context to stop all sound immediately
    if (audioContextRef.current) {
      try {
        console.log('[AUDIO] Closing audio context');
        audioContextRef.current.close();
        audioContextRef.current = null;
        initAudioContext();
      } catch (e) {
        console.error("[AUDIO] Error resetting audio context:", e);
      }
    }
    
    // Reset everything else
    isReceivingAudioRef.current = false;
    pcmBufferRef.current = [];
    isProcessingRef.current = false;
    nextPlayTimeRef.current = 0;
    
    console.log('[AUDIO] Playback interrupted, all state reset');
    
    // Update UI
    setIsPlaying(false);
    return true;
  }, [initAudioContext]);
  
  // Handle browser interaction for audio playback
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Audio element for standard audio playback if needed
      const audioElement = document.createElement('audio');
      audioElement.style.display = 'none';
      document.body.appendChild(audioElement);
      audioPlayerRef.current = audioElement;
      
      // Init audio context for PCM playback
      initAudioContext();
      
      // Make sure audio context can play by adding user interaction handler
      const handleUserInteraction = () => {
        if (audioContextRef.current && audioContextRef.current.state !== 'running') {
          audioContextRef.current.resume().catch(e => {
            console.error("Error resuming audio context:", e);
          });
        }
      };
      
      // Add event listeners for user interaction
      ['click', 'touchstart', 'keydown'].forEach(event => {
        document.addEventListener(event, handleUserInteraction, { once: false });
      });
      
      return () => {
        // Cleanup
        if (audioElement.parentNode) {
          document.body.removeChild(audioElement);
        }
        
        // Remove event listeners
        ['click', 'touchstart', 'keydown'].forEach(event => {
          document.removeEventListener(event, handleUserInteraction);
        });
        
        // Close audio context
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      };
    }
  }, [initAudioContext]);
  
  return {
    isPlaying,
    isMuted,
    toggleMute: useCallback(() => {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      
      if (newMuted && isPlaying) {
        interruptPlayback();
      }
      
      return newMuted;
    }, [isMuted, isPlaying, interruptPlayback]),
    interruptPlayback,
    startPcmStream,
    endPcmStream,
    processPcmChunk
  };
}



/*

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export function useAudioPlayback() {
  // State management
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Audio context and nodes
  const audioContextRef = useRef(null);
  const scriptProcessorNodeRef = useRef(null);
  const bufferSourceRef = useRef(null);
  
  // Audio data storage
  const audioBufferRef = useRef([]);
  const audioQueueRef = useRef([]);
  const pcmDataQueueRef = useRef([]);
  
  // Stream state tracking
  const streamActiveRef = useRef(false);
  const sampleRateRef = useRef(24000);
  const contextSampleRateRef = useRef(48000);
  
  // Playback state
  const isReadyToPlayRef = useRef(false);
  const hasStartedPlayingRef = useRef(false);
  
  // Stats for debugging
  const statsRef = useRef({
    chunksReceived: 0,
    chunksProcessed: 0,
    underruns: 0,
    overruns: 0
  });
  
  // Initialize audio context
  useEffect(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        contextSampleRateRef.current = audioContextRef.current.sampleRate;
        console.log(`Audio context initialized with sample rate: ${contextSampleRateRef.current}Hz`);
      } catch (error) {
        console.error('Failed to initialize audio context:', error);
      }
    }
    
    // Add user interaction handlers to start audio context
    const resumeAudioContext = () => {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        console.log('Resuming audio context from user interaction');
        audioContextRef.current.resume().catch(err => {
          console.error('Failed to resume audio context:', err);
        });
      }
    };
    
    document.addEventListener('click', resumeAudioContext);
    document.addEventListener('touchstart', resumeAudioContext);
    document.addEventListener('keydown', resumeAudioContext);
    
    return () => {
      document.removeEventListener('click', resumeAudioContext);
      document.removeEventListener('touchstart', resumeAudioContext);
      document.removeEventListener('keydown', resumeAudioContext);
      
      // Cleanup
      if (scriptProcessorNodeRef.current) {
        scriptProcessorNodeRef.current.disconnect();
        scriptProcessorNodeRef.current = null;
      }
      
      if (bufferSourceRef.current) {
        try {
          bufferSourceRef.current.stop();
          bufferSourceRef.current.disconnect();
        } catch (e) {
          // Ignore errors
        }
        bufferSourceRef.current = null;
      }
    };
  }, []);
  
  // Create and setup scriptProcessor for continuous audio
  const setupScriptProcessor = useCallback(() => {
    if (!audioContextRef.current) return false;
    
    try {
      // Clean up existing processor if any
      if (scriptProcessorNodeRef.current) {
        scriptProcessorNodeRef.current.disconnect();
      }
      
      // Buffer size must be a power of 2, and determines how often the callback runs
      // Smaller values reduce latency but increase CPU usage
      const bufferSize = 4096;
      
      // Create a scriptProcessor node
      // Number of input channels = 0 (we're generating audio)
      // Number of output channels = 1 (mono)
      scriptProcessorNodeRef.current = audioContextRef.current.createScriptProcessor(
        bufferSize, 0, 1
      );
      
      // This is where we feed audio data to the output
      scriptProcessorNodeRef.current.onaudioprocess = (audioProcessingEvent) => {
        // Get the output buffer
        const outputBuffer = audioProcessingEvent.outputBuffer;
        const outputData = outputBuffer.getChannelData(0);
        
        // Fill with silence by default
        let hasData = false;
        
        // If we have buffered PCM data
        if (pcmDataQueueRef.current.length > 0) {
          hasData = true;
          
          // Get the next chunk of PCM data
          const pcmData = pcmDataQueueRef.current[0]; 
          
          // Calculate how much data we need to fill the output buffer
          const samplesToUse = Math.min(outputData.length, pcmData.length);
          
          // Copy data to output buffer
          for (let i = 0; i < samplesToUse; i++) {
            outputData[i] = pcmData[i];
          }
          
          // Remove used samples from the PCM data
          if (samplesToUse === pcmData.length) {
            // Used all data from this chunk
            pcmDataQueueRef.current.shift();
            statsRef.current.chunksProcessed++;
          } else {
            // Used partial data, keep the rest for next time
            pcmDataQueueRef.current[0] = pcmData.slice(samplesToUse);
          }
          
          // Fill the rest with silence if needed
          if (samplesToUse < outputData.length) {
            for (let i = samplesToUse; i < outputData.length; i++) {
              outputData[i] = 0;
            }
            statsRef.current.underruns++;
            console.log(`Buffer underrun: filled ${samplesToUse}/${outputData.length} samples`);
          }
        } else {
          // No data available, fill with silence
          for (let i = 0; i < outputData.length; i++) {
            outputData[i] = 0;
          }
          
          if (hasStartedPlayingRef.current && streamActiveRef.current) {
            statsRef.current.underruns++;
            console.log('Buffer underrun: no data available');
          }
        }
        
        // Indicate that we're playing if we have data
        if (hasData && !hasStartedPlayingRef.current) {
          hasStartedPlayingRef.current = true;
          setIsPlaying(true);
        }
      };
      
      // Connect the scriptProcessor node to the destination
      scriptProcessorNodeRef.current.connect(audioContextRef.current.destination);
      
      return true;
    } catch (error) {
      console.error('Failed to setup script processor:', error);
      return false;
    }
  }, []);
  
  // Convert PCM data from base64 to Float32Array
  const convertPcmToFloat32 = useCallback((base64Data) => {
    try {
      // Decode base64 to binary
      const binaryString = atob(base64Data);
      const byteArray = new Uint8Array(binaryString.length);
      
      // Convert to byte array
      for (let i = 0; i < binaryString.length; i++) {
        byteArray[i] = binaryString.charCodeAt(i);
      }
      
      // Create a DataView for proper 16-bit PCM handling
      const dataView = new DataView(byteArray.buffer);
      const pcmData = new Float32Array(binaryString.length / 2);
      
      // Convert to Float32Array using proper 16-bit PCM conversion
      for (let i = 0; i < binaryString.length; i += 2) {
        // Get 16-bit sample using little-endian ordering (second param is true)
        const sample = dataView.getInt16(i, true);
        
        // Convert to float in range [-1.0, 1.0]
        pcmData[i/2] = sample / 32768.0;
      }
      
      return pcmData;
    } catch (error) {
      console.error('Error converting PCM data:', error);
      return new Float32Array(0);
    }
  }, []);
  
  // Resample audio data
  const resampleAudio = useCallback((audioData, fromRate, toRate) => {
    if (fromRate === toRate) return audioData;
    
    try {
      const ratio = toRate / fromRate;
      const outputLength = Math.floor(audioData.length * ratio);
      const output = new Float32Array(outputLength);
      
      for (let i = 0; i < outputLength; i++) {
        const inputIndex = i / ratio;
        const inputIndexFloor = Math.floor(inputIndex);
        const inputIndexCeil = Math.min(Math.ceil(inputIndex), audioData.length - 1);
        
        if (inputIndexFloor === inputIndexCeil) {
          output[i] = audioData[inputIndexFloor];
        } else {
          const weight = inputIndex - inputIndexFloor;
          output[i] = (1 - weight) * audioData[inputIndexFloor] + weight * audioData[inputIndexCeil];
        }
      }
      
      return output;
    } catch (error) {
      console.error('Error resampling audio:', error);
      return audioData;
    }
  }, []);
  
  // Process buffered audio data
  const processAudio = useCallback(() => {
    if (!isReadyToPlayRef.current) return;
    
    // Process up to 5 chunks at a time to add to the PCM queue
    const maxChunks = 5;
    const chunksToProcess = Math.min(maxChunks, audioQueueRef.current.length);
    
    for (let i = 0; i < chunksToProcess; i++) {
      const pcmData = audioQueueRef.current.shift();
      
      // If stream has been resampled, add directly to PCM data queue
      pcmDataQueueRef.current.push(pcmData);
    }
    
    // Check if we need to start playing
    if (!hasStartedPlayingRef.current && pcmDataQueueRef.current.length >= 2) {
      console.log(`Starting playback with ${pcmDataQueueRef.current.length} chunks in buffer`);
      hasStartedPlayingRef.current = true;
      setIsPlaying(true);
    }
  }, []);
  
  // Start PCM stream
  const startPcmStream = useCallback((sampleRate = 24000) => {
    console.log(`Starting PCM stream with sample rate: ${sampleRate}Hz`);
    
    // Reset state
    streamActiveRef.current = true;
    sampleRateRef.current = sampleRate;
    audioBufferRef.current = [];
    audioQueueRef.current = [];
    pcmDataQueueRef.current = [];
    hasStartedPlayingRef.current = false;
    isReadyToPlayRef.current = false;
    
    // Reset stats
    statsRef.current = {
      chunksReceived: 0,
      chunksProcessed: 0,
      underruns: 0,
      overruns: 0
    };
    
    setIsPlaying(false);
    
    // Ensure audio context is running
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    // Setup script processor for continuous audio
    const result = setupScriptProcessor();
    
    if (result) {
      // We're ready to accept PCM data
      isReadyToPlayRef.current = true;
      return true;
    }
    
    return false;
  }, [setupScriptProcessor]);
  
  // Process incoming PCM chunk
  const processPcmChunk = useCallback((base64Data) => {
    if (!streamActiveRef.current || !isReadyToPlayRef.current) return;
    
    try {
      // Convert base64 to PCM Float32Array
      const pcmData = convertPcmToFloat32(base64Data);
      
      // Skip empty data
      if (pcmData.length === 0) return;
      
      // Increment counter
      statsRef.current.chunksReceived++;
      
      // Resample if needed
      const contextRate = contextSampleRateRef.current;
      const streamRate = sampleRateRef.current;
      
      const processedData = (contextRate !== streamRate) 
        ? resampleAudio(pcmData, streamRate, contextRate)
        : pcmData;
        
      // Add to audio queue
      audioQueueRef.current.push(processedData);
      
      // Process audio queue
      processAudio();
      
      // Log progress every 10 chunks
      if (statsRef.current.chunksReceived % 10 === 0) {
        console.log(`Received ${statsRef.current.chunksReceived} chunks, processed ${statsRef.current.chunksProcessed}, queue: ${audioQueueRef.current.length}, PCM queue: ${pcmDataQueueRef.current.length}`);
      }
    } catch (error) {
      console.error('Error processing PCM chunk:', error);
    }
  }, [convertPcmToFloat32, resampleAudio, processAudio]);
  
  // End PCM stream
  const endPcmStream = useCallback(() => {
    console.log('Ending PCM stream');
    console.log(`Stats: Received ${statsRef.current.chunksReceived}, Processed ${statsRef.current.chunksProcessed}, Underruns: ${statsRef.current.underruns}, Overruns: ${statsRef.current.overruns}`);
    
    streamActiveRef.current = false;
    
    // Allow any remaining audio to play out
    const checkComplete = () => {
      if (pcmDataQueueRef.current.length === 0) {
        // All audio played
        console.log('All audio played');
        
        // Disconnect script processor after a short delay
        setTimeout(() => {
          if (scriptProcessorNodeRef.current) {
            scriptProcessorNodeRef.current.disconnect();
            scriptProcessorNodeRef.current = null;
          }
          
          setIsPlaying(false);
        }, 200);
      } else {
        // Check again later
        setTimeout(checkComplete, 100);
      }
    };
    
    // Start checking for completion
    checkComplete();
  }, []);
  
  // Interrupt playback
  const interruptPlayback = useCallback(() => {
    console.log('Interrupting playback');
    
    // Clear all buffers
    audioBufferRef.current = [];
    audioQueueRef.current = [];
    pcmDataQueueRef.current = [];
    
    // Reset state
    streamActiveRef.current = false;
    hasStartedPlayingRef.current = false;
    isReadyToPlayRef.current = false;
    
    // Disconnect script processor
    if (scriptProcessorNodeRef.current) {
      scriptProcessorNodeRef.current.disconnect();
      scriptProcessorNodeRef.current = null;
    }
    
    setIsPlaying(false);
    
    return true;
  }, []);
  
  return {
    isPlaying,
    startPcmStream,
    endPcmStream,
    processPcmChunk,
    interruptPlayback
  };
}

*/

/*
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export function useAudioPlayback() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  // References for audio handling
  const audioContextRef = useRef(null);
  const pcmQueueRef = useRef([]);
  const isReceivingPcmRef = useRef(false);
  const isProcessingPcmRef = useRef(false);
  const pcmSampleRateRef = useRef(24000);
  
  // New refs for better tracking
  const activeSourceRef = useRef(null);  // Track the currently playing audio source
  const sessionIdRef = useRef(null);     // Track the current audio session
  
  // Initialize Web Audio API context with better handling
  const initAudioContext = useCallback(() => {
    try {
      // If context is closed or doesn't exist, create a new one
      if (!audioContextRef.current || 
          (audioContextRef.current && audioContextRef.current.state === 'closed')) {
        console.log("Creating new AudioContext");
        
        // Use default settings for best browser compatibility
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        console.log("Audio context initialized with sample rate:", audioContextRef.current.sampleRate);
      }
      
      // Try to resume context if suspended
      if (audioContextRef.current.state === 'suspended') {
        console.log("Resuming AudioContext from suspended state");
        audioContextRef.current.resume().catch(err => {
          console.error("Failed to resume context:", err);
        });
      }
      
      return true;
    } catch (e) {
      console.error('Failed to initialize audio context:', e);
      return false;
    }
  }, []);
  
  // Convert PCM data to AudioBuffer - simplified for reliability
  const convertPcmToAudioBuffer = useCallback((pcmData) => {
    if (!audioContextRef.current) {
      console.error("No AudioContext available");
      return null;
    }
    
    try {
      const numSamples = pcmData.length / 2; // 16-bit = 2 bytes per sample
      const audioBuffer = audioContextRef.current.createBuffer(1, numSamples, pcmSampleRateRef.current);
      const channelData = audioBuffer.getChannelData(0);
      
      // OpenAI PCM format is 16-bit signed little-endian
      let offset = 0;
      for (let i = 0; i < numSamples; i++) {
        // Convert 16-bit PCM to float
        const sample = (pcmData[offset] & 0xff) | ((pcmData[offset + 1] & 0xff) << 8);
        // Handle signed integers (convert to -1.0 to 1.0 range)
        channelData[i] = (sample >= 0x8000) ? -1 + ((sample & 0x7fff) / 0x8000) : sample / 0x7fff;
        offset += 2;
      }
      
      return audioBuffer;
    } catch (e) {
      console.error('Error converting PCM data to AudioBuffer:', e);
      return null;
    }
  }, []);
  
  // Start PCM stream with a new session ID
  const startPcmStream = useCallback((sampleRate = 24000) => {
    if (isMuted) return false;
    
    console.log(`Starting new PCM stream with sampleRate=${sampleRate}`);
    
    // Always interrupt any previous stream
    if (isPlaying) {
      interruptCurrentStream();
    }
    
    // Ensure audio context is initialized
    if (!initAudioContext()) {
      console.error("Failed to initialize audio context");
      return false;
    }
    
    // Generate new session ID
    sessionIdRef.current = `session-${Date.now()}`;
    
    // Reset stream state
    pcmSampleRateRef.current = sampleRate;
    isReceivingPcmRef.current = true;
    pcmQueueRef.current = [];
    isProcessingPcmRef.current = false;
    
    // Update UI state
    setIsPlaying(true);
    
    console.log(`PCM stream started with ID: ${sessionIdRef.current}`);
    return true;
  }, [isMuted, isPlaying]);
  
  // Helper function to interrupt the current stream
  const interruptCurrentStream = useCallback(() => {
    console.log("Interrupting current stream");
    
    // Stop currently playing source if any
    if (activeSourceRef.current) {
      try {
        activeSourceRef.current.stop();
        activeSourceRef.current.disconnect();
      } catch (e) {
        console.error("Error stopping active source:", e);
      }
      activeSourceRef.current = null;
    }
    
    // Clear stream state
    isReceivingPcmRef.current = false;
    pcmQueueRef.current = [];
    isProcessingPcmRef.current = false;
    
    // Reset session
    sessionIdRef.current = null;
  }, []);
  
  // Process PCM queue with improved error handling
  const processPcmQueue = useCallback(async () => {
    if (pcmQueueRef.current.length === 0 || isProcessingPcmRef.current || !audioContextRef.current) {
      return;
    }
    
    // Skip processing if we're not supposed to be playing
    if (!isPlaying) {
      console.log("Not processing queue because isPlaying is false");
      return;
    }
    
    // Save current session ID for comparison during processing
    const currentSessionId = sessionIdRef.current;
    
    isProcessingPcmRef.current = true;
    console.log(`Processing queue with ${pcmQueueRef.current.length} chunks`);
    
    try {
      // Process chunks until the queue is empty or interrupted
      while (pcmQueueRef.current.length > 0) {
        // Check if we've been interrupted by a session change
        if (sessionIdRef.current !== currentSessionId) {
          console.log("Session changed during processing, stopping");
          break;
        }
        
        // Get next chunk
        const pcmData = pcmQueueRef.current.shift();
        
        // Convert PCM data to audio buffer
        const audioBuffer = convertPcmToAudioBuffer(pcmData);
        if (!audioBuffer) {
          continue; // Skip this chunk if conversion failed
        }
        
        // Create and set up source
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        
        // Store reference to current source
        activeSourceRef.current = source;
        
        // Create a promise to detect when the chunk finishes playing
        const playbackPromise = new Promise(resolve => {
          source.onended = resolve;
          // Fallback timeout (slightly longer than chunk duration)
          const durationMs = (audioBuffer.length / audioBuffer.sampleRate) * 1000;
          setTimeout(resolve, durationMs + 10);
        });
        
        // Start playing - wrap in try/catch for better error handling
        try {
          source.start(0);
          await playbackPromise;
        } catch (e) {
          console.error("Error during playback:", e);
          break; // Stop processing on playback error
        } finally {
          // Clean up source reference when done
          if (activeSourceRef.current === source) {
            activeSourceRef.current = null;
          }
        }
      }
    } catch (e) {
      console.error('Error in PCM queue processing:', e);
    } finally {
      isProcessingPcmRef.current = false;
      
      // Check if we should continue or stop playing
      if (!isReceivingPcmRef.current && pcmQueueRef.current.length === 0) {
        // Stream is finished
        console.log("Stream finished - no more chunks to process");
        setIsPlaying(false);
      } else if (pcmQueueRef.current.length > 0 && sessionIdRef.current === currentSessionId) {
        // More chunks to process for this session
        console.log(`Continuing processing with ${pcmQueueRef.current.length} chunks remaining`);
        processPcmQueue();
      }
    }
  }, [convertPcmToAudioBuffer, isPlaying]);
  
  // Process PCM chunk with simplified approach
  const processPcmChunk = useCallback((base64data) => {
    if (isMuted || !isReceivingPcmRef.current) {
      return;
    }
    
    try {
      // Skip processing if no active session
      if (!sessionIdRef.current) {
        console.log("No active session, ignoring chunk");
        return;
      }
      
      // Convert base64 to ArrayBuffer
      const binaryString = atob(base64data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Queue the data
      pcmQueueRef.current.push(bytes);
      
      // Process queue if not already processing
      if (!isProcessingPcmRef.current) {
        processPcmQueue();
      }
    } catch (e) {
      console.error('Error processing PCM chunk:', e);
    }
  }, [isMuted, isReceivingPcmRef, processPcmQueue]);
  
  // End PCM stream with better cleanup
  const endPcmStream = useCallback(() => {
    console.log("Ending PCM stream");
    
    // Mark that we're no longer receiving data
    isReceivingPcmRef.current = false;
    
    // Process any remaining queued data if we have an active session
    if (sessionIdRef.current && pcmQueueRef.current.length > 0 && !isProcessingPcmRef.current) {
      processPcmQueue();
    }
  }, [processPcmQueue]);
  
  // Improved interrupt function that fully stops everything
  const interruptPlayback = useCallback(() => {
    console.log("Interrupting playback");
    
    // Stop active stream
    interruptCurrentStream();
    
    // Update UI state
    setIsPlaying(false);
    
    return true;
  }, [interruptCurrentStream]);
  
  // Initialize audio context on component mount
  useEffect(() => {
    // Add global event listeners to handle user interaction for audio context
    const handleUserInteraction = () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'running') {
        audioContextRef.current.resume().catch(e => {
          console.error("Error resuming audio context:", e);
        });
      }
    };
    
    // Add multiple event listeners for better chances of catching user interaction
    ['click', 'touchstart', 'keydown'].forEach(event => {
      document.addEventListener(event, handleUserInteraction, { once: false });
    });
    
    // Initialize audio context
    initAudioContext();
    
    // Cleanup on unmount
    return () => {
      // Clean up event listeners
      ['click', 'touchstart', 'keydown'].forEach(event => {
        document.removeEventListener(event, handleUserInteraction);
      });
      
      // Interrupt any playing audio
      interruptCurrentStream();
      
      // Don't close the AudioContext - it can cause issues
      // Just reset our state
      isReceivingPcmRef.current = false;
      pcmQueueRef.current = [];
      isProcessingPcmRef.current = false;
      sessionIdRef.current = null;
    };
  }, [initAudioContext, interruptCurrentStream]);
  
  return {
    isPlaying,
    isMuted,
    toggleMute: useCallback(() => {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      
      if (newMuted && isPlaying) {
        interruptPlayback();
      }
      
      return newMuted;
    }, [isMuted, isPlaying, interruptPlayback]),
    interruptPlayback,
    startPcmStream,
    endPcmStream,
    processPcmChunk
  };
}







/*
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export function useAudioPlayback() {
  // State management
  const [isPlaying, setIsPlaying] = useState(false);
  
  // References
  const pcmDataRef = useRef([]);
  const sampleRateRef = useRef(24000);
  const downloadButtonRef = useRef(null);
  const statsRef = useRef({
    chunksReceived: 0
  });
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Remove any download buttons
      if (downloadButtonRef.current && document.body.contains(downloadButtonRef.current)) {
        document.body.removeChild(downloadButtonRef.current);
      }
    };
  }, []);
  
  // Start PCM stream
  const startPcmStream = useCallback((sampleRate = 24000) => {
    console.log(`Starting PCM stream with sample rate: ${sampleRate}Hz`);
    
    // Store the sample rate
    sampleRateRef.current = sampleRate;
    
    // Reset data
    pcmDataRef.current = [];
    statsRef.current = {
      chunksReceived: 0
    };
    
    // Reset UI state
    setIsPlaying(false);
    
    // Remove any existing download button
    if (downloadButtonRef.current && document.body.contains(downloadButtonRef.current)) {
      document.body.removeChild(downloadButtonRef.current);
      downloadButtonRef.current = null;
    }
    
    return true;
  }, []);
  
  // Process PCM chunk
  const processPcmChunk = useCallback((base64Data) => {
    // Store the base64 data directly
    pcmDataRef.current.push(base64Data);
    
    // Update stats
    statsRef.current.chunksReceived++;
    
    console.log(`Received chunk ${statsRef.current.chunksReceived} (${base64Data.length} bytes)`);
  }, []);
  
  // Create a WAV file from PCM data
  const createWavFromPcm = useCallback((pcmBase64Chunks, sampleRate) => {
    try {
      // Convert all base64 chunks to a single binary array
      let totalLength = 0;
      const chunks = [];
      
      for (const base64Chunk of pcmBase64Chunks) {
        const binary = atob(base64Chunk);
        const chunk = new Uint8Array(binary.length);
        
        for (let i = 0; i < binary.length; i++) {
          chunk[i] = binary.charCodeAt(i);
        }
        
        chunks.push(chunk);
        totalLength += chunk.length;
      }
      
      // Combine all chunks
      const combinedPcm = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        combinedPcm.set(chunk, offset);
        offset += chunk.length;
      }
      
      // Prepare WAV header
      const wavHeaderSize = 44;
      const wavFile = new Uint8Array(wavHeaderSize + combinedPcm.length);
      
      // "RIFF" header
      wavFile[0] = 0x52; // R
      wavFile[1] = 0x49; // I
      wavFile[2] = 0x46; // F
      wavFile[3] = 0x46; // F
      
      // RIFF chunk size
      const fileSize = wavHeaderSize + combinedPcm.length - 8;
      wavFile[4] = (fileSize & 0xff);
      wavFile[5] = ((fileSize >> 8) & 0xff);
      wavFile[6] = ((fileSize >> 16) & 0xff);
      wavFile[7] = ((fileSize >> 24) & 0xff);
      
      // "WAVE" format
      wavFile[8] = 0x57; // W
      wavFile[9] = 0x41; // A
      wavFile[10] = 0x56; // V
      wavFile[11] = 0x45; // E
      
      // "fmt " sub-chunk
      wavFile[12] = 0x66; // f
      wavFile[13] = 0x6d; // m
      wavFile[14] = 0x74; // t
      wavFile[15] = 0x20; // space
      
      // Sub-chunk size (16 for PCM)
      wavFile[16] = 16;
      wavFile[17] = 0;
      wavFile[18] = 0;
      wavFile[19] = 0;
      
      // Audio format (1 = PCM)
      wavFile[20] = 1;
      wavFile[21] = 0;
      
      // Number of channels (1 = mono)
      wavFile[22] = 1;
      wavFile[23] = 0;
      
      // Sample rate
      wavFile[24] = (sampleRate & 0xff);
      wavFile[25] = ((sampleRate >> 8) & 0xff);
      wavFile[26] = ((sampleRate >> 16) & 0xff);
      wavFile[27] = ((sampleRate >> 24) & 0xff);
      
      // Byte rate (SampleRate * NumChannels * BitsPerSample/8)
      const byteRate = sampleRate * 1 * 16 / 8;
      wavFile[28] = (byteRate & 0xff);
      wavFile[29] = ((byteRate >> 8) & 0xff);
      wavFile[30] = ((byteRate >> 16) & 0xff);
      wavFile[31] = ((byteRate >> 24) & 0xff);
      
      // Block align (NumChannels * BitsPerSample/8)
      wavFile[32] = 2;
      wavFile[33] = 0;
      
      // Bits per sample
      wavFile[34] = 16;
      wavFile[35] = 0;
      
      // "data" sub-chunk
      wavFile[36] = 0x64; // d
      wavFile[37] = 0x61; // a
      wavFile[38] = 0x74; // t
      wavFile[39] = 0x61; // a
      
      // Data chunk size
      wavFile[40] = (combinedPcm.length & 0xff);
      wavFile[41] = ((combinedPcm.length >> 8) & 0xff);
      wavFile[42] = ((combinedPcm.length >> 16) & 0xff);
      wavFile[43] = ((combinedPcm.length >> 24) & 0xff);
      
      // Copy PCM data after header
      wavFile.set(combinedPcm, wavHeaderSize);
      
      console.log(`Created WAV file: ${Math.round(wavFile.length / 1024)} KB (${wavFile.length} bytes)`);
      
      return new Blob([wavFile], { type: 'audio/wav' });
    } catch (error) {
      console.error('Error creating WAV file:', error);
      return null;
    }
  }, []);
  
  // End PCM stream and create download button
  const endPcmStream = useCallback(() => {
    console.log(`Ending PCM stream. Received ${statsRef.current.chunksReceived} chunks.`);
    
    if (pcmDataRef.current.length === 0) {
      console.log('No audio data received');
      return;
    }
    
    try {
      // Create WAV from PCM data
      const wavBlob = createWavFromPcm(pcmDataRef.current, sampleRateRef.current);
      
      if (!wavBlob) {
        console.error('Failed to create WAV file');
        return;
      }
      
      // Create a download URL
      const downloadUrl = URL.createObjectURL(wavBlob);
      
      console.log('Created downloadable audio file');
      
      // Create a button for downloading/playing the audio
      const button = document.createElement('button');
      button.innerHTML = 'Play Full Audio';
      button.style.position = 'fixed';
      button.style.bottom = '20px';
      button.style.right = '20px';
      button.style.zIndex = '9999';
      button.style.padding = '10px 20px';
      button.style.background = '#007bff';
      button.style.color = 'white';
      button.style.border = 'none';
      button.style.borderRadius = '5px';
      button.style.cursor = 'pointer';
      button.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
      button.style.fontSize = '16px';
      
      // On click, play the audio
      button.onclick = () => {
        const audio = new Audio(downloadUrl);
        audio.onplay = () => {
          setIsPlaying(true);
          console.log('Audio playback started');
          button.innerHTML = 'Playing...';
        };
        audio.onended = () => {
          setIsPlaying(false);
          console.log('Audio playback ended');
          button.innerHTML = 'Play Full Audio';
        };
        audio.onerror = (e) => {
          console.error('Audio playback error:', e);
          setIsPlaying(false);
          button.innerHTML = 'Error - Try Again';
        };
        
        // Set max volume and play
        audio.volume = 1.0;
        audio.play().catch(error => {
          console.error('Audio playback failed:', error);
        });
      };
      
      // Also add a download link
      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      downloadLink.download = 'audio-response.wav';
      downloadLink.innerHTML = 'Download Audio';
      downloadLink.style.position = 'fixed';
      downloadLink.style.bottom = '60px';
      downloadLink.style.right = '20px';
      downloadLink.style.zIndex = '9999';
      downloadLink.style.padding = '10px 20px';
      downloadLink.style.background = '#28a745';
      downloadLink.style.color = 'white';
      downloadLink.style.border = 'none';
      downloadLink.style.borderRadius = '5px';
      downloadLink.style.cursor = 'pointer';
      downloadLink.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
      downloadLink.style.fontSize = '16px';
      downloadLink.style.textDecoration = 'none';
      downloadLink.style.textAlign = 'center';
      
      // Add the button and link to the page
      document.body.appendChild(button);
      document.body.appendChild(downloadLink);
      
      // Store reference for cleanup
      downloadButtonRef.current = button;
      
      console.log('Added play and download buttons to the page');
    } catch (error) {
      console.error('Error creating audio file:', error);
    }
  }, [createWavFromPcm]);
  
  // Interrupt playback
  const interruptPlayback = useCallback(() => {
    console.log('Interrupting playback');
    
    // Reset state
    pcmDataRef.current = [];
    setIsPlaying(false);
    
    // Remove any buttons
    if (downloadButtonRef.current && document.body.contains(downloadButtonRef.current)) {
      document.body.removeChild(downloadButtonRef.current);
      downloadButtonRef.current = null;
    }
    
    return true;
  }, []);
  
  return {
    isPlaying,
    startPcmStream,
    endPcmStream,
    processPcmChunk,
    interruptPlayback
  };
}



/*

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export function useAudioPlayback() {
  // State management
  const [isPlaying, setIsPlaying] = useState(false);
  
  // References
  const pcmChunksRef = useRef([]);
  const rawBinaryChunksRef = useRef([]);
  const sampleRateRef = useRef(24000);
  const buttonContainerRef = useRef(null);
  const statsRef = useRef({
    chunksReceived: 0,
    totalBytes: 0
  });
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Remove any UI elements
      if (buttonContainerRef.current && document.body.contains(buttonContainerRef.current)) {
        document.body.removeChild(buttonContainerRef.current);
      }
    };
  }, []);
  
  // Start PCM stream
  const startPcmStream = useCallback((sampleRate = 24000) => {
    console.log(`Starting PCM stream with sample rate: ${sampleRate}Hz`);
    
    // Store the sample rate
    sampleRateRef.current = sampleRate;
    
    // Reset data
    pcmChunksRef.current = [];
    rawBinaryChunksRef.current = [];
    statsRef.current = {
      chunksReceived: 0,
      totalBytes: 0
    };
    
    // Reset UI state
    setIsPlaying(false);
    
    // Remove any existing UI elements
    if (buttonContainerRef.current && document.body.contains(buttonContainerRef.current)) {
      document.body.removeChild(buttonContainerRef.current);
      buttonContainerRef.current = null;
    }
    
    return true;
  }, []);
  
  // Convert base64 to binary
  const base64ToBinary = useCallback((base64) => {
    try {
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      return bytes;
    } catch (error) {
      console.error('Error converting base64 to binary:', error);
      return new Uint8Array(0);
    }
  }, []);
  
  // Process PCM chunk
  const processPcmChunk = useCallback((base64Data) => {
    try {
      // Increment counter
      statsRef.current.chunksReceived++;
      
      // Store the base64 data
      pcmChunksRef.current.push(base64Data);
      
      // Convert to binary for inspection
      const binaryData = base64ToBinary(base64Data);
      rawBinaryChunksRef.current.push(binaryData);
      
      // Update stats
      statsRef.current.totalBytes += binaryData.length;
      
      // Analyze the first few bytes
      let bytePreview = '';
      for (let i = 0; i < Math.min(16, binaryData.length); i++) {
        bytePreview += binaryData[i].toString(16).padStart(2, '0') + ' ';
      }
      
      // Check for audio energy in the chunk
      let sum = 0;
      let min = 32767;
      let max = -32768;
      
      for (let i = 0; i < binaryData.length; i += 2) {
        const sample = (binaryData[i+1] << 8) | binaryData[i];
        const signedSample = sample > 32767 ? sample - 65536 : sample;
        
        sum += Math.abs(signedSample);
        min = Math.min(min, signedSample);
        max = Math.max(max, signedSample);
      }
      
      const avgEnergy = sum / (binaryData.length / 2);
      const hasAudio = avgEnergy > 100; // Threshold for "has audio content"
      
      console.log(`Chunk ${statsRef.current.chunksReceived}: ${binaryData.length} bytes, Avg: ${avgEnergy.toFixed(2)}, Min: ${min}, Max: ${max}, HasAudio: ${hasAudio}, Preview: ${bytePreview}`);
    } catch (error) {
      console.error('Error processing PCM chunk:', error);
    }
  }, [base64ToBinary]);
  
  // Create WAV header
  const createWavHeader = useCallback((dataLength, sampleRate) => {
    const headerLength = 44;
    const header = new Uint8Array(headerLength);
    
    // "RIFF" chunk
    header[0] = 0x52; // R
    header[1] = 0x49; // I
    header[2] = 0x46; // F
    header[3] = 0x46; // F
    
    // Chunk size (file size - 8)
    const fileSize = dataLength + 36;
    header[4] = (fileSize & 0xff);
    header[5] = ((fileSize >> 8) & 0xff);
    header[6] = ((fileSize >> 16) & 0xff);
    header[7] = ((fileSize >> 24) & 0xff);
    
    // "WAVE" format
    header[8] = 0x57; // W
    header[9] = 0x41; // A
    header[10] = 0x56; // V
    header[11] = 0x45; // E
    
    // "fmt " sub-chunk
    header[12] = 0x66; // f
    header[13] = 0x6d; // m
    header[14] = 0x74; // t
    header[15] = 0x20; // space
    
    // Sub-chunk size (16 for PCM)
    header[16] = 16;
    header[17] = 0;
    header[18] = 0;
    header[19] = 0;
    
    // Audio format (1 = PCM)
    header[20] = 1;
    header[21] = 0;
    
    // Number of channels (1 = mono)
    header[22] = 1;
    header[23] = 0;
    
    // Sample rate
    header[24] = (sampleRate & 0xff);
    header[25] = ((sampleRate >> 8) & 0xff);
    header[26] = ((sampleRate >> 16) & 0xff);
    header[27] = ((sampleRate >> 24) & 0xff);
    
    // Byte rate (SampleRate * NumChannels * BitsPerSample/8)
    const byteRate = sampleRate * 1 * 16 / 8;
    header[28] = (byteRate & 0xff);
    header[29] = ((byteRate >> 8) & 0xff);
    header[30] = ((byteRate >> 16) & 0xff);
    header[31] = ((byteRate >> 24) & 0xff);
    
    // Block align (NumChannels * BitsPerSample/8)
    header[32] = 2;
    header[33] = 0;
    
    // Bits per sample
    header[34] = 16;
    header[35] = 0;
    
    // "data" sub-chunk
    header[36] = 0x64; // d
    header[37] = 0x61; // a
    header[38] = 0x74; // t
    header[39] = 0x61; // a
    
    // Data chunk size
    header[40] = (dataLength & 0xff);
    header[41] = ((dataLength >> 8) & 0xff);
    header[42] = ((dataLength >> 16) & 0xff);
    header[43] = ((dataLength >> 24) & 0xff);
    
    return header;
  }, []);
  
  // Create combined WAV file
  const createCombinedWav = useCallback(() => {
    try {
      // Calculate total data size
      let totalSize = 0;
      for (const chunk of rawBinaryChunksRef.current) {
        totalSize += chunk.length;
      }
      
      // Create WAV header
      const header = createWavHeader(totalSize, sampleRateRef.current);
      
      // Create combined file
      const wav = new Uint8Array(header.length + totalSize);
      
      // Add header
      wav.set(header);
      
      // Add all PCM data
      let offset = header.length;
      for (const chunk of rawBinaryChunksRef.current) {
        wav.set(chunk, offset);
        offset += chunk.length;
      }
      
      return new Blob([wav], { type: 'audio/wav' });
    } catch (error) {
      console.error('Error creating combined WAV:', error);
      return null;
    }
  }, [createWavHeader]);
  
  // Create individual WAV files for each chunk
  const createIndividualWavs = useCallback(() => {
    const wavFiles = [];
    
    try {
      // Create a WAV file for each chunk
      for (let i = 0; i < rawBinaryChunksRef.current.length; i++) {
        const chunk = rawBinaryChunksRef.current[i];
        const header = createWavHeader(chunk.length, sampleRateRef.current);
        
        // Create WAV file
        const wav = new Uint8Array(header.length + chunk.length);
        wav.set(header);
        wav.set(chunk, header.length);
        
        // Add to files list
        wavFiles.push({
          index: i + 1,
          blob: new Blob([wav], { type: 'audio/wav' }),
          size: wav.length
        });
      }
    } catch (error) {
      console.error('Error creating individual WAVs:', error);
    }
    
    return wavFiles;
  }, [createWavHeader]);
  
  // Create audio visualization
  const createAudioVisualization = useCallback(() => {
    // Create a canvas for visualization
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 200;
    canvas.style.backgroundColor = '#f5f5f5';
    canvas.style.border = '1px solid #ddd';
    canvas.style.marginTop = '10px';
    canvas.style.marginBottom = '10px';
    
    const ctx = canvas.getContext('2d');
    
    // Draw background
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    try {
      // Draw chunk boundaries
      let totalSamples = 0;
      for (const chunk of rawBinaryChunksRef.current) {
        totalSamples += chunk.length / 2;
      }
      
      const samplesPerPixel = totalSamples / canvas.width;
      
      // Draw waveform
      ctx.strokeStyle = '#007bff';
      ctx.beginPath();
      
      let sampleOffset = 0;
      
      // Draw each chunk with a different color
      for (let chunkIndex = 0; chunkIndex < rawBinaryChunksRef.current.length; chunkIndex++) {
        const chunk = rawBinaryChunksRef.current[chunkIndex];
        const chunkColor = chunkIndex % 2 === 0 ? '#007bff' : '#28a745';
        
        // Mark chunk boundary
        const chunkStartX = (sampleOffset / totalSamples) * canvas.width;
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(chunkStartX, 0, 1, canvas.height);
        
        // Draw text label
        ctx.fillStyle = '#000';
        ctx.font = '10px Arial';
        ctx.fillText(`${chunkIndex + 1}`, chunkStartX + 3, 10);
        
        ctx.strokeStyle = chunkColor;
        ctx.beginPath();
        
        // Draw chunk waveform
        for (let i = 0; i < chunk.length; i += 2) {
          const sampleIndex = i / 2;
          const x = ((sampleOffset + sampleIndex) / totalSamples) * canvas.width;
          
          // Get 16-bit sample value
          const sample = (chunk[i+1] << 8) | chunk[i];
          const signedSample = sample > 32767 ? sample - 65536 : sample;
          
          // Scale to fit canvas height (-32768 to 32767 -> 0 to canvas.height)
          const y = canvas.height / 2 - (signedSample / 32768) * (canvas.height / 2);
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        
        ctx.stroke();
        sampleOffset += chunk.length / 2;
      }
    } catch (error) {
      console.error('Error creating visualization:', error);
      ctx.fillStyle = '#ff0000';
      ctx.font = '14px Arial';
      ctx.fillText('Error creating visualization: ' + error.message, 10, canvas.height / 2);
    }
    
    return canvas;
  }, []);
  
  // End PCM stream and create diagnostic UI
  const endPcmStream = useCallback(() => {
    console.log(`Ending PCM stream. Received ${statsRef.current.chunksReceived} chunks, total ${statsRef.current.totalBytes} bytes.`);
    
    if (rawBinaryChunksRef.current.length === 0) {
      console.log('No audio data received');
      return;
    }
    
    try {
      // Create container for diagnostic UI
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.bottom = '20px';
      container.style.right = '20px';
      container.style.zIndex = '9999';
      container.style.padding = '20px';
      container.style.background = 'white';
      container.style.border = '1px solid #ddd';
      container.style.borderRadius = '5px';
      container.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
      container.style.maxWidth = '850px';
      container.style.maxHeight = '80vh';
      container.style.overflowY = 'auto';
      
      // Add title
      const title = document.createElement('h2');
      title.innerHTML = 'Audio Diagnostic';
      title.style.margin = '0 0 10px 0';
      title.style.fontSize = '18px';
      container.appendChild(title);
      
      // Add stats info
      const statsInfo = document.createElement('div');
      statsInfo.innerHTML = `
        <p><strong>Stats:</strong> ${statsRef.current.chunksReceived} chunks, ${Math.round(statsRef.current.totalBytes / 1024)} KB total</p>
        <p><strong>Duration:</strong> ~${(statsRef.current.totalBytes / 2 / sampleRateRef.current).toFixed(2)} seconds</p>
        <p><strong>Sample Rate:</strong> ${sampleRateRef.current} Hz</p>
      `;
      container.appendChild(statsInfo);
      
      // Add visualization
      const visualizationTitle = document.createElement('h3');
      visualizationTitle.innerHTML = 'Audio Waveform';
      visualizationTitle.style.margin = '15px 0 5px 0';
      visualizationTitle.style.fontSize = '16px';
      container.appendChild(visualizationTitle);
      
      const visualization = createAudioVisualization();
      container.appendChild(visualization);
      
      // Create combined WAV
      const combinedWav = createCombinedWav();
      const combinedWavUrl = URL.createObjectURL(combinedWav);
      
      // Add combined audio player
      const combinedPlayerTitle = document.createElement('h3');
      combinedPlayerTitle.innerHTML = 'Full Audio';
      combinedPlayerTitle.style.margin = '15px 0 5px 0';
      combinedPlayerTitle.style.fontSize = '16px';
      container.appendChild(combinedPlayerTitle);
      
      const combinedPlayer = document.createElement('audio');
      combinedPlayer.controls = true;
      combinedPlayer.src = combinedWavUrl;
      combinedPlayer.style.width = '100%';
      combinedPlayer.style.marginBottom = '10px';
      container.appendChild(combinedPlayer);
      
      // Add download link for combined WAV
      const combinedDownload = document.createElement('a');
      combinedDownload.href = combinedWavUrl;
      combinedDownload.download = 'full-audio.wav';
      combinedDownload.innerHTML = 'Download Full Audio';
      combinedDownload.style.display = 'inline-block';
      combinedDownload.style.padding = '5px 10px';
      combinedDownload.style.background = '#28a745';
      combinedDownload.style.color = 'white';
      combinedDownload.style.textDecoration = 'none';
      combinedDownload.style.borderRadius = '3px';
      combinedDownload.style.marginBottom = '15px';
      container.appendChild(combinedDownload);
      
      // Create individual WAVs
      const individualWavs = createIndividualWavs();
      
      if (individualWavs.length > 0) {
        // Add section for individual chunks
        const chunksTitle = document.createElement('h3');
        chunksTitle.innerHTML = 'Individual Chunks';
        chunksTitle.style.margin = '15px 0 5px 0';
        chunksTitle.style.fontSize = '16px';
        container.appendChild(chunksTitle);
        
        // Create table for chunks
        const chunksTable = document.createElement('table');
        chunksTable.style.width = '100%';
        chunksTable.style.borderCollapse = 'collapse';
        chunksTable.style.marginBottom = '15px';
        
        // Add table header
        chunksTable.innerHTML = `
          <thead>
            <tr>
              <th style="text-align: left; padding: 5px; border-bottom: 1px solid #ddd;">Chunk</th>
              <th style="text-align: left; padding: 5px; border-bottom: 1px solid #ddd;">Size</th>
              <th style="text-align: left; padding: 5px; border-bottom: 1px solid #ddd;">Actions</th>
            </tr>
          </thead>
          <tbody id="chunks-tbody"></tbody>
        `;
        container.appendChild(chunksTable);
        
        const tbody = chunksTable.querySelector('#chunks-tbody');
        
        // Add each chunk
        for (const wavFile of individualWavs) {
          const url = URL.createObjectURL(wavFile.blob);
          
          const row = document.createElement('tr');
          row.innerHTML = `
            <td style="padding: 5px; border-bottom: 1px solid #eee;">Chunk ${wavFile.index}</td>
            <td style="padding: 5px; border-bottom: 1px solid #eee;">${Math.round(wavFile.size / 1024)} KB</td>
            <td style="padding: 5px; border-bottom: 1px solid #eee;">
              <audio controls style="width: 200px; height: 30px;"><source src="${url}" type="audio/wav"></audio>
              <a href="${url}" download="chunk-${wavFile.index}.wav" style="margin-left: 5px; font-size: 12px;">Download</a>
            </td>
          `;
          tbody.appendChild(row);
        }
      }
      
      // Add close button
      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = 'Close';
      closeBtn.style.display = 'block';
      closeBtn.style.padding = '5px 10px';
      closeBtn.style.marginTop = '10px';
      closeBtn.style.border = 'none';
      closeBtn.style.borderRadius = '3px';
      closeBtn.style.background = '#dc3545';
      closeBtn.style.color = 'white';
      closeBtn.style.cursor = 'pointer';
      closeBtn.onclick = () => {
        document.body.removeChild(container);
        buttonContainerRef.current = null;
      };
      container.appendChild(closeBtn);
      
      // Add to page
      document.body.appendChild(container);
      buttonContainerRef.current = container;
      
      console.log('Added diagnostic UI to the page');
    } catch (error) {
      console.error('Error creating diagnostic UI:', error);
    }
  }, [createAudioVisualization, createCombinedWav, createIndividualWavs]);
  
  // Interrupt playback
  const interruptPlayback = useCallback(() => {
    console.log('Interrupting playback');
    
    // Reset state
    pcmChunksRef.current = [];
    rawBinaryChunksRef.current = [];
    setIsPlaying(false);
    
    // Remove any UI elements
    if (buttonContainerRef.current && document.body.contains(buttonContainerRef.current)) {
      document.body.removeChild(buttonContainerRef.current);
      buttonContainerRef.current = null;
    }
    
    return true;
  }, []);
  
  return {
    isPlaying,
    startPcmStream,
    endPcmStream,
    processPcmChunk,
    interruptPlayback
  };
}







/*

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export function useAudioPlayback() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  // Audio context and processing references
  const audioContextRef = useRef(null);
  const audioBufferRef = useRef([]);
  const sessionIdRef = useRef(null);
  const isProcessingRef = useRef(false);
  const nextPlayTimeRef = useRef(0);
  const sampleRateRef = useRef(24000);
  
  // Playback control flags
  const bufferingRef = useRef(false);
  const playbackStartedRef = useRef(false);
  const sourceNodeRef = useRef(null);
  
  // Buffer management parameters
  const initialBufferSizeRef = useRef(5); // Increased from 3 to 5 chunks for more resilient buffering
  const maxBufferSize = 20;    // Max number of chunks to keep in buffer
  
  // Timing analysis for adaptive buffering
  const chunkTimestampsRef = useRef([]);
  
  // Debug counters
  const receivedChunksRef = useRef(0);
  const processedChunksRef = useRef(0);
  
  // Initialize Web Audio API context
  const initAudioContext = useCallback(() => {
    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        console.log("Audio context initialized with sample rate:", audioContextRef.current.sampleRate);
      }
      
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(err => {
          console.error("Failed to resume context:", err);
        });
      }
      
      return true;
    } catch (e) {
      console.error('Failed to initialize audio context:', e);
      return false;
    }
  }, []);
  
  // Create a continuous audio buffer from PCM data
  const createAudioBuffer = useCallback((pcmData, sampleRate) => {
    if (!audioContextRef.current) return null;
    
    try {
      // Calculate number of samples
      const numSamples = pcmData.length / 2; // 16-bit = 2 bytes per sample
      
      // Create audio buffer
      const buffer = audioContextRef.current.createBuffer(1, numSamples, sampleRate);
      const channelData = buffer.getChannelData(0);
      
      // Process PCM data (16-bit signed little-endian)
      let offset = 0;
      for (let i = 0; i < numSamples; i++) {
        // Combine two bytes into a 16-bit sample
        const sample = (pcmData[offset] & 0xff) | ((pcmData[offset + 1] & 0xff) << 8);
        // Convert to float (-1.0 to 1.0)
        channelData[i] = sample >= 0x8000 ? (sample - 0x10000) / 32768 : sample / 32767;
        offset += 2;
      }
      
      return buffer;
    } catch (e) {
      console.error('Error creating audio buffer:', e);
      return null;
    }
  }, []);
  
  // Schedule the playback of the next audio chunk
  const scheduleNextChunk = useCallback(() => {
    if (!audioContextRef.current || audioBufferRef.current.length === 0) return;
    
    // Get the next PCM data chunk
    const pcmData = audioBufferRef.current.shift();
    processedChunksRef.current++;
    
    // Create audio buffer
    const audioBuffer = createAudioBuffer(pcmData, sampleRateRef.current);
    if (!audioBuffer) return;
    
    // Create source node
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    
    // Current time of audio context
    const currentTime = audioContextRef.current.currentTime;
    
    // Determine the exact start time to eliminate gaps
    // If this is the first chunk or we've been interrupted, start immediately
    // Otherwise, schedule it to start exactly when the previous chunk ends
    let startTime;
    if (!playbackStartedRef.current) {
      startTime = currentTime;
      playbackStartedRef.current = true;
    } else {
      startTime = Math.max(currentTime, nextPlayTimeRef.current);
    }
    
    // Update the next play time reference
    nextPlayTimeRef.current = startTime + audioBuffer.duration;
    
    // Set up callback for when this chunk ends
    source.onended = () => {
      sourceNodeRef.current = null;
      
      // If we have more chunks, schedule the next one immediately
      if (audioBufferRef.current.length > 0) {
        // Schedule next chunk with zero delay
        scheduleNextChunk();
      } else {
        // No more chunks available - we'll wait for more to come in
        isProcessingRef.current = false;
        
        // If we're still buffering, don't log
        if (!bufferingRef.current) {
          console.log("Waiting for more audio chunks...");
        }
      }
    };
    
    // Start playback at the precise scheduled time
    source.start(startTime);
    sourceNodeRef.current = source;
    
    console.log(`Playing audio: start=${startTime.toFixed(3)}s, duration=${audioBuffer.duration.toFixed(3)}s, end=${nextPlayTimeRef.current.toFixed(3)}s, remaining=${audioBufferRef.current.length}`);
    
    // If we have more chunks and are below the max buffer size, process the next chunk
    if (audioBufferRef.current.length > 0 && !bufferingRef.current) {
      scheduleNextChunk();
    }
  }, [createAudioBuffer]);
  
  // Process the audio buffer queue
  const processAudioQueue = useCallback(() => {
    if (isProcessingRef.current || audioBufferRef.current.length === 0 || !audioContextRef.current) {
      return;
    }
    
    isProcessingRef.current = true;
    
    // Check if we have enough chunks to start playback
    if (!playbackStartedRef.current && audioBufferRef.current.length < initialBufferSizeRef.current) {
      // Still buffering initial chunks
      bufferingRef.current = true;
      console.log(`Buffering audio: ${audioBufferRef.current.length}/${initialBufferSizeRef.current} chunks`);
      isProcessingRef.current = false;
      return;
    }
    
    // We have enough chunks, start/continue playback
    bufferingRef.current = false;
    
    // Schedule the first/next chunk
    scheduleNextChunk();
  }, [scheduleNextChunk]);
  
  // Decode base64 to Uint8Array
  const decodeBase64 = useCallback((base64data) => {
    try {
      const binaryString = atob(base64data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } catch (e) {
      console.error('Error decoding base64:', e);
      return new Uint8Array(0);
    }
  }, []);
  
  // Reset audio playback state
  const resetPlayback = useCallback(() => {
    console.log("Resetting audio playback");
    audioBufferRef.current = [];
    nextPlayTimeRef.current = 0;
    isProcessingRef.current = false;
    bufferingRef.current = false;
    playbackStartedRef.current = false;
    receivedChunksRef.current = 0;
    processedChunksRef.current = 0;
    chunkTimestampsRef.current = []; // Reset timing analysis data
    
    // Stop any currently playing source
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch (e) {
        // Ignore errors during stop
      }
      sourceNodeRef.current = null;
    }
  }, []);
  
  // Start PCM stream
  const startPcmStream = useCallback((sampleRate = 24000) => {
    if (isMuted) return false;
    
    console.log(`Starting new PCM stream with sampleRate=${sampleRate}`);
    
    // Ensure audio context is initialized
    if (!initAudioContext()) {
      console.error("Failed to initialize audio context");
      return false;
    }
    
    // Reset playback state
    resetPlayback();
    
    // Set sample rate
    sampleRateRef.current = sampleRate;
    
    // Generate new session ID
    sessionIdRef.current = `session-${Date.now()}`;
    
    // Update UI state
    setIsPlaying(true);
    
    console.log(`PCM stream started with ID: ${sessionIdRef.current}`);
    return true;
  }, [isMuted, initAudioContext, resetPlayback]);
  
  // Process PCM chunk
  const processPcmChunk = useCallback((base64data) => {
    if (isMuted || !sessionIdRef.current) return;
    
    try {
      receivedChunksRef.current++;
      
      // Decode base64 data
      const pcmData = decodeBase64(base64data);
      
      // Skip empty chunks
      if (pcmData.length === 0) return;
      
      // Track chunk arrival time for adaptive buffering
      const now = performance.now();
      chunkTimestampsRef.current.push(now);
      if (chunkTimestampsRef.current.length > 10) {
        chunkTimestampsRef.current.shift(); // Keep last 10 timestamps
        
        // Calculate average time between chunks
        let avgGap = 0;
        for (let i = 1; i < chunkTimestampsRef.current.length; i++) {
          avgGap += chunkTimestampsRef.current[i] - chunkTimestampsRef.current[i-1];
        }
        avgGap /= (chunkTimestampsRef.current.length - 1);
        
        // Adjust buffer size based on timing
        if (avgGap > 150 && initialBufferSizeRef.current < 8) {
          initialBufferSizeRef.current++; // Increase buffer for unstable connections
          console.log(`Increased buffer size to ${initialBufferSizeRef.current} (avg gap: ${avgGap.toFixed(0)}ms)`);
        } else if (avgGap < 80 && initialBufferSizeRef.current > 3) {
          initialBufferSizeRef.current--; // Decrease buffer for stable connections
          console.log(`Decreased buffer size to ${initialBufferSizeRef.current} (avg gap: ${avgGap.toFixed(0)}ms)`);
        }
      }
      
      // Add to buffer (limit total buffer size)
      if (audioBufferRef.current.length < maxBufferSize) {
        audioBufferRef.current.push(pcmData);
      } else {
        console.warn(`Buffer full (${maxBufferSize} chunks), dropping oldest chunk`);
        audioBufferRef.current.shift(); // Remove oldest chunk
        audioBufferRef.current.push(pcmData); // Add new chunk
      }
      
      // Process queue if not already processing
      if (!isProcessingRef.current) {
        processAudioQueue();
      }
    } catch (e) {
      console.error('Error processing PCM chunk:', e);
    }
  }, [isMuted, decodeBase64, processAudioQueue]);
  
  // End PCM stream
  const endPcmStream = useCallback(() => {
    console.log(`Ending PCM stream. Received ${receivedChunksRef.current} chunks, processed ${processedChunksRef.current} chunks, ${audioBufferRef.current.length} remaining`);
    
    // Let remaining audio play out naturally
    bufferingRef.current = false;
    
    // Process any remaining audio in the buffer
    if (audioBufferRef.current.length > 0 && !isProcessingRef.current) {
      processAudioQueue();
    }
  }, [processAudioQueue]);
  
  // Interrupt playback
  const interruptPlayback = useCallback(() => {
    console.log("Interrupting playback");
    
    // Reset session
    sessionIdRef.current = null;
    
    // Stop any currently playing source
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch (e) {
        console.error("Error stopping source:", e);
      }
      sourceNodeRef.current = null;
    }
    
    // Stop all audio context activities
    if (audioContextRef.current) {
      try {
        // Create a new context to immediately stop all audio
        audioContextRef.current.close();
        audioContextRef.current = null;
        initAudioContext();
      } catch (e) {
        console.error("Error closing audio context:", e);
      }
    }
    
    // Reset playback state
    resetPlayback();
    
    // Update UI state
    setIsPlaying(false);
    
    return true;
  }, [initAudioContext, resetPlayback]);
  
  // Initialize audio context on component mount
  useEffect(() => {
    // Add event listeners for user interaction
    const handleUserInteraction = () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'running') {
        audioContextRef.current.resume().catch(e => {
          console.error("Error resuming audio context:", e);
        });
      }
    };
    
    // Add event listeners
    ['click', 'touchstart', 'keydown'].forEach(event => {
      document.addEventListener(event, handleUserInteraction, { once: false });
    });
    
    // Initialize audio context
    initAudioContext();
    
    // Cleanup on unmount
    return () => {
      // Remove event listeners
      ['click', 'touchstart', 'keydown'].forEach(event => {
        document.removeEventListener(event, handleUserInteraction);
      });
      
      // Clean up audio context
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (e) {
          console.error("Error closing audio context:", e);
        }
      }
    };
  }, [initAudioContext]);
  
  return {
    isPlaying,
    isMuted,
    toggleMute: useCallback(() => {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      
      if (newMuted && isPlaying) {
        interruptPlayback();
      }
      
      return newMuted;
    }, [isMuted, isPlaying, interruptPlayback]),
    interruptPlayback,
    startPcmStream,
    endPcmStream,
    processPcmChunk
  };
}

*/






