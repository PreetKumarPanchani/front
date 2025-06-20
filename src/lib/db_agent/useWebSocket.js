'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export function useWebSocket(config = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState('Initializing...');
  const [messages, setMessages] = useState([]);
  
  const socketRef = useRef(null);
  const messageQueueRef = useRef([]);
  const unmountingRef = useRef(false);
  
  // Generate client ID
  const clientIdRef = useRef(
    'client-' + Math.random().toString(36).substring(2, 9)
  );
  
  // Get WebSocket URL
  const getWebSocketUrl = useCallback(() => {
    const baseUrl = config.wsUrl || process.env.NEXT_PUBLIC_WS_GATEWAY;
    if (!baseUrl) return null;
    return `${baseUrl}?client_id=${clientIdRef.current}`;
  }, [config.wsUrl]);
  
  // Connect function
  const connect = useCallback(() => {
    // Don't connect if unmounting
    if (unmountingRef.current) {
      console.log("[WebSocket] Not connecting because component is unmounting");
      return;
    }
    
    // Don't reconnect if already connected
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      console.log("[WebSocket] Already connected");
      return;
    }
    
    // Clean up any existing connection
    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch (e) {
        console.error("[WebSocket] Error closing existing connection:", e);
      }
      socketRef.current = null;
    }
    
    // Get WebSocket URL
    const wsUrl = getWebSocketUrl();
    if (!wsUrl) {
      console.error("[WebSocket] No WebSocket URL available");
      setStatus('Configuration error');
      return;
    }
    
    console.log("[WebSocket] Connecting to:", wsUrl);
    
    try {
      // Create WebSocket
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
      
      // Set up event handlers
      socket.onopen = () => {
        console.log("[WebSocket] Connected!");
        setIsConnected(true);
        setStatus('Connected');
        
        // Process any queued messages
        if (messageQueueRef.current.length > 0) {
          console.log(`[WebSocket] Processing ${messageQueueRef.current.length} queued messages`);
          
          // Make a copy to avoid race conditions
          const queuedMessages = [...messageQueueRef.current];
          messageQueueRef.current = [];
          
          queuedMessages.forEach(message => {
            try {
              socket.send(JSON.stringify({
                ...message,
                timestamp: Date.now()
              }));
            } catch (e) {
              console.error("[WebSocket] Error sending queued message:", e);
              // Re-queue on failure
              messageQueueRef.current.push(message);
            }
          });
        }
      };
      
      socket.onclose = (e) => {
        console.log(`[WebSocket] Closed: ${e.code} ${e.reason}`);
        setIsConnected(false);
        setStatus(`Disconnected`);
        socketRef.current = null;
      };
      
      socket.onerror = (e) => {
        console.error("[WebSocket] Error:", e);
        setStatus('Connection error');
      };
      
      socket.onmessage = (e) => {
        // Create a truncated version of data for logging purposes
        let logData = e.data;
        try {
          if (e.data.startsWith('{')) {
            const parsedForLogging = JSON.parse(e.data);
            if (parsedForLogging.type === 'audio_chunk' && parsedForLogging.data) {
              // Create truncated version for audio chunks
              const originalData = parsedForLogging.data;
              const startPart = originalData.substring(0, 20);
              const endPart = originalData.substring(originalData.length - 20);
              parsedForLogging.data = `${startPart}..........${endPart}`;
              logData = JSON.stringify(parsedForLogging);
            }
          }
        } catch (err) {
          // If any error in truncation logic, fall back to original data
          logData = e.data;
        }
        
        // Log the potentially truncated data
        console.log("[WebSocket] Message received:", logData);
        
        try {
          // Use original data for actual processing
          // Check if the message is JSON or plain text
          if (e.data.startsWith('{') || e.data.startsWith('[')) {
            // It's JSON
            const data = JSON.parse(e.data);
            setMessages(prev => [...prev, data]);
          } else {
            // It's plain text
            console.log("[WebSocket] Received plain text message:", e.data);
            // Create a simple object for plain text messages
            const textMessage = {
              type: 'text',
              text: e.data,
              timestamp: Date.now()
            };
            setMessages(prev => [...prev, textMessage]);
          }
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
          // Still add the message as plain text even if parsing fails
          const errorMessage = {
            type: 'error',
            text: e.data,
            timestamp: Date.now()
          };
          setMessages(prev => [...prev, errorMessage]);
        }
      };
    } catch (error) {
      console.error('[WebSocket] Error creating connection:', error);
      setStatus('Connection error');
    }
  }, [getWebSocketUrl]);
  
  // Send message function with queue for disconnected state
  const sendMessage = useCallback((message) => {
    if (!message) return false;
    
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const messageToSend = {
        ...message,
        timestamp: Date.now()
      };
      
      console.log("[WebSocket] Sending message:", message.command);
      try {
        socketRef.current.send(JSON.stringify(messageToSend));
        return true;
      } catch (e) {
        console.error("[WebSocket] Error sending message:", e);
        return false;
      }
    } else {
      console.warn("[WebSocket] Cannot send - not connected");
      
      // Queue important messages
      if (message.command !== 'audio_data') {
        messageQueueRef.current.push(message);
        console.log(`[WebSocket] Message queued (${messageQueueRef.current.length} in queue)`);
        
        // Try to reconnect if socket is closed
        if (!socketRef.current || socketRef.current.readyState === WebSocket.CLOSED) {
          console.log("[WebSocket] Initiating connection after failed send");
          connect();
        }
      }
      
      return false;
    }
  }, [connect]);
  
  // Connect on mount with a slight delay to avoid race conditions
  useEffect(() => {
    console.log("[WebSocket] Hook initialized");
    
    // Set up unmounting flag for cleanup
    unmountingRef.current = false;
    
    // Connect with a slight delay to avoid race conditions
    const timer = setTimeout(() => {
      if (!unmountingRef.current && config.autoConnect !== false) {
        console.log("[WebSocket] Auto-connecting on mount");
        connect();
      }
    }, 100);
    
    return () => {
      console.log("[WebSocket] Component unmounting, cleaning up");
      unmountingRef.current = true;
      clearTimeout(timer);
      
      // Close socket if open
      if (socketRef.current) {
        try {
          socketRef.current.close();
        } catch (e) {
          console.error("[WebSocket] Error closing socket on unmount:", e);
        }
      }
    };
  }, [connect, config.autoConnect]);
  
  return {
    isConnected, 
    status, 
    messages,
    sendMessage,
    connect,
    getClientId: () => clientIdRef.current
  };
}


/*
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState('Initializing...');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [messages, setMessages] = useState([]);
  const socketRef = useRef(null);
  
  const maxReconnectAttempts = 5;
  const reconnectInterval = 3000; // 3 seconds
  
  // Function to establish WebSocket connection
  const connect = useCallback(() => {
    // Generate a unique client ID
    const clientId = 'client-' + Math.random().toString(36).substring(2, 9);
    
    // Determine WebSocket protocol (ws or wss)
    const protocol = typeof window !== 'undefined' && 
      window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    

    // Construct WebSocket URL
    const host = typeof window !== 'undefined' ? window.location.host : 'localhost:8001';
    //const wsUrl = `${protocol}${host}/ws/${clientId}`;
    

    const wsUrl = typeof window !== 'undefined' ? 
    `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//localhost:8001/ws/${clientId}` :
    '';

    // Close existing socket if open
    if (socketRef.current && 
        (socketRef.current.readyState === WebSocket.OPEN || 
         socketRef.current.readyState === WebSocket.CONNECTING)) {
      socketRef.current.close();
    }
    
    try {
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
      
      socket.onopen = () => {
        setIsConnected(true);
        setStatus('Connected');
        setReconnectAttempts(0);
      };
      
      socket.onclose = (event) => {
        setIsConnected(false);
        
        // Only attempt reconnection if this wasn't a clean close
        if (!event.wasClean && reconnectAttempts < maxReconnectAttempts) {
          const newAttempts = reconnectAttempts + 1;
          setReconnectAttempts(newAttempts);
          setStatus(`Reconnecting (${newAttempts}/${maxReconnectAttempts})...`);
          
          // Schedule reconnection
          setTimeout(connect, reconnectInterval);
        } else if (reconnectAttempts >= maxReconnectAttempts) {
          setStatus('Connection failed');
        } else {
          setStatus('Disconnected');
        }
      };
      
      socket.onerror = () => {
        setStatus('Connection error');
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
      setStatus('Connection error');
    }
  }, [reconnectAttempts]);
  
  // Handle incoming WebSocket messages
  const handleMessage = useCallback((data) => {
    // Add message to state for use in components
    setMessages(prevMessages => [...prevMessages, data]);
  }, []);
  
  // Send a message through WebSocket
  const sendMessage = useCallback((message) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);
  
  // Connect on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      connect();
      
      // Cleanup on unmount
      return () => {
        if (socketRef.current) {
          socketRef.current.close();
        }
      };
    }
  }, [connect]);
  
  return {
    isConnected,
    status,
    messages,
    sendMessage,
    connect,
    socket: socketRef.current,
  };
}

*/