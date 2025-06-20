'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import TapToSpeak from './TapToSpeak';
import SqlDisplay from './SqlDisplay';
import ResultsTable from './ResultsTable';
import ExampleQueries from './ExampleQueries';

import { useWebSocket } from '@/lib/db_agent/useWebSocket';
import useSpeechRecognition from '@/lib/db_agent/useSpeechRecognition';
import useSpeechSynthesis from '@/lib/db_agent/useSpeechSynthesis';

const ChatInterface = () => {
  // State management for UI
  const [inputText, setInputText] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [sqlQuery, setSqlQuery] = useState('');
  const [queryResults, setQueryResults] = useState([]);
  const [isActivated, setIsActivated] = useState(false);
  const [assistantCreated, setAssistantCreated] = useState(false);
  const [examplesCollapsed, setExamplesCollapsed] = useState(false);
  
  // Reference to help manage interruption better
  const isInterruptingRef = useRef(false);
  
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  
  // Simple message processing tracking
  const lastProcessedIndexRef = useRef(-1);
  
  // Initialize WebSocket connection
  const { 
    isConnected, 
    status, 
    messages: wsMessages, 
    sendMessage,
    getClientId,
    connect
  } = useWebSocket({
    wsUrl: process.env.NEXT_PUBLIC_WS_GATEWAY || 'wss://5nu02h2v13.execute-api.eu-west-2.amazonaws.com/production',
    autoConnect: true
  });
  
  // Speech recognition with fallback capability
  const { 
    isListening,
    isProcessing: isProcessingAudio,
    transcript,
    toggleListening,
    toggleRecognitionType: toggleRecognitionMode,
    useOpenAI: useOpenAIRecognition,
    error: speechRecognitionError
  } = useSpeechRecognition({
    onTranscriptReady: (text) => {
      if (text && text.trim()) {
        // Add user message to chat
        addMessage('user', text);
        
        // Send transcribed text to backend
        sendTextQuery(text);
      }
    }
  });
  
  // Speech synthesis with fallback capability
  const {
    speak,
    cancel: cancelSpeech,
    processAudioChunk,
    toggleSynthesisType: toggleSynthesisMode,
    isSpeaking,
    isLoading: isLoadingSpeech,
    useOpenAI: useOpenAISynthesis,
    error: speechSynthesisError
  } = useSpeechSynthesis({
    voice: 'onyx' // OpenAI voices: alloy, echo, fable, onyx, nova, shimmer
  });
  
  // Create assistant once connected
  useEffect(() => {
    const createAssistant = async () => {
      if (isConnected && !assistantCreated) {
        console.log("WebSocket connected, requesting assistant creation");
        
        // Wait a moment to ensure WebSocket is fully established
        setTimeout(() => {
          try {
            setAssistantCreated(true);
            setIsActivated(true);
          } catch (error) {
            console.error("Failed to send ready message, will retry when connected");
          }
        }, 1000);
      }
    };
    
    createAssistant();
  }, [isConnected, assistantCreated, sendMessage]);
  
  // Simple message addition - NO duplicate checking
  const addMessage = useCallback((role, content, isError = false) => {
    setChatMessages(prev => {
      const newMessage = { 
        role, 
        content, 
        isError, 
        timestamp: new Date(),
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      };
      
      console.log(`Added ${role} message:`, content.substring(0, 50));
      return [...prev, newMessage];
    });
  }, []);
  
  // Handle sending text query to backend
  const sendTextQuery = useCallback((text) => {
    if (!text || !isConnected) return;
    
    // If TTS is speaking, stop it
    if (isSpeaking) {
      cancelSpeech();
    }
    
    // Send text to backend
    sendMessage({
      command: 'text_query',
      text
    });
    
    // Clear input
    setInputText('');
  }, [isConnected, isSpeaking, cancelSpeech, sendMessage]);
  
  // Handle form submission
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (inputText.trim()) {
      // Add user message to chat
      addMessage('user', inputText);
      sendTextQuery(inputText);
    }
  }, [inputText, addMessage, sendTextQuery]);
  
  // Handle example query selection
  const handleExampleQuery = useCallback((query) => {
    setInputText(query);
    // Add user message to chat
    addMessage('user', query);
    sendTextQuery(query);
  }, [addMessage, sendTextQuery]);
  
  // Handle interrupt button click with improved handling
  const handleInterrupt = useCallback(() => {
    console.log('Interrupt requested');
    
    // Set interrupting flag
    isInterruptingRef.current = true;
    
    // First, cancel client-side speech
    cancelSpeech();
    
    // Then tell the server to stop processing
    sendMessage({ 
      command: 'interrupt_speech',
      timestamp: Date.now()
    });
    
    console.log('Interrupt signal sent to server');
    
    // Reset the interrupting flag after a delay
    setTimeout(() => {
      isInterruptingRef.current = false;
    }, 2000);
  }, [cancelSpeech, sendMessage]);
  
  // Toggle examples section
  const toggleExamples = useCallback(() => {
    setExamplesCollapsed(prev => !prev);
  }, []);
  
  // Add quick interrupt function
  const handleQuickInterrupt = useCallback(() => {
    console.log('Quick interrupt triggered by tap button');
    
    // Cancel speech immediately
    cancelSpeech();
    
    // Set interrupting flag
    isInterruptingRef.current = true;
    
    // Reset the interrupting flag after a shorter delay
    setTimeout(() => {
      isInterruptingRef.current = false;
    }, 500); // Shorter delay for quicker recovery
  }, [cancelSpeech]);

  // Simplified WebSocket message processing - Process only new messages
  useEffect(() => {
    if (!wsMessages || wsMessages.length === 0) return;
    
    // Process only messages we haven't processed yet
    const newMessages = wsMessages.slice(lastProcessedIndexRef.current + 1);
    
    if (newMessages.length === 0) return;
    
    console.log(`Processing ${newMessages.length} new messages`);
    
    newMessages.forEach((message, index) => {
      const actualIndex = lastProcessedIndexRef.current + 1 + index;
      
      // Skip debug logs for non-critical message types
      if (!['audio_chunk', 'pong'].includes(message.type)) {
        console.log(`Processing message ${actualIndex}:`, {
          type: message.type,
          text: message.text?.substring(0, 50),
          hasData: !!message.data,
          hasQuery: !!message.query,
          time: new Date().toISOString()
        });
      }
      
      // Don't process audio chunks if we're interrupting
      if (message.type === 'audio_chunk' && isInterruptingRef.current) {
        console.log('Ignoring audio chunk during interruption');
        return;
      }
      
      try {
        switch (message.type) {
          case 'transcription':
            // We're handling transcription in the frontend now,
            // but keep this for backward compatibility
            break;
            
          case 'response':
            console.log('Processing response message:', message.text?.substring(0, 100));
            // Add assistant's response to the chat
            if (message.text) {
              addMessage('assistant', message.text);
              
              // Speak the response using TTS if not interrupting
              if (!isInterruptingRef.current) {
                speak(message.text);
              }
            }
            break;
            
          case 'status':
            console.log('Status message:', message.text);
            if (message.text && message.text.includes('activated')) {
              setIsActivated(true);
            } else if (message.text && message.text.includes('deactivated')) {
              setIsActivated(false);
            }
            break;
            
          case 'error':
            console.error('Error from server:', message.text);
            if (message.text) {
              addMessage('system', message.text, true);
            }
            break;
            
          case 'results':
            console.log('Processing results message:', message.data?.length || 0, 'items');
            // Always set results, even if empty array
            if (message.data !== undefined) {
              setQueryResults(Array.isArray(message.data) ? message.data : []);
            }
            break;
            
          case 'sql':
            console.log('Processing SQL message:', message.query?.substring(0, 100));
            // Always set SQL query, even if empty
            if (message.query !== undefined) {
              setSqlQuery(message.query || '');
            }
            break;
            
          case 'audio_chunk':
            // Process audio chunk if not in interrupted state
            if (!isInterruptingRef.current) {
              // Handle audio chunk with the processAudioChunk function
              if (message.data) {
                processAudioChunk(message.data);
              }
            }
            break;
            
          case 'audio_stream_start':
            // Reset any previous interruption state
            isInterruptingRef.current = false;
            break;
            
          case 'audio_stream_end':
            // Nothing special needed here
            break;
            
          default:
            console.warn('Unknown message type:', message.type);
            break;
        }
      } catch (error) {
        console.error(`Error processing message type ${message.type}:`, error, message);
      }
    });
    
    // Update the last processed index
    lastProcessedIndexRef.current = wsMessages.length - 1;
    
  }, [wsMessages, addMessage, speak, processAudioChunk]);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);
  
  // Display errors about speech recognition/synthesis if present
  useEffect(() => {
    if (speechRecognitionError) {
      console.error('Speech recognition error:', speechRecognitionError);
    }
    
    if (speechSynthesisError) {
      console.error('Speech synthesis error:', speechSynthesisError);
    }
  }, [speechRecognitionError, speechSynthesisError]);
  
  return (
    <div className="chat-interface">
      <header className="chat-header">
        <h2></h2>
        <div className="header-controls">
          
          {/* Add this button before the existing controls */}
          {/*
          <button
            type="button"
            onClick={() => window.location.href = '/'}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '1.5rem',
              fontSize: '0.875rem',
              backgroundColor: 'transparent',
              color: 'var(--accent-primary)',
              border: '1px solid var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              height: '32px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <i className="bi bi-house"></i>
            Warehouse
          </button>
          */}
          
          {/* API mode toggle buttons moved to header */}
          <div className="api-toggle-container">
            <div className="api-toggle">
              <span>STT:</span>
              <button 
                onClick={toggleRecognitionMode}
                className={`toggle-api-button ${useOpenAIRecognition ? 'openai' : 'browser'}`}
              >
                {useOpenAIRecognition ? 'OpenAI API' : 'Browser API'}
              </button>
            </div>
            
            <div className="api-toggle">
              <span>TTS:</span>
              <button 
                onClick={toggleSynthesisMode}
                className={`toggle-api-button ${useOpenAISynthesis ? 'openai' : 'browser'}`}
              >
                {useOpenAISynthesis ? 'OpenAI API' : 'Browser API'}
              </button>
            </div>
          </div>
          <div className={`status-badge ${isListening ? 'listening' : ''}`}>
            {isProcessingAudio ? 'Processing speech...' : 
             (isListening ? 'Listening...' : 
              (isLoadingSpeech ? 'Generating speech...' : 
               (isSpeaking ? 'Speaking...' : status)))}
          </div>
        </div>
      </header>
      
      {/* Central tap to speak button */}
      <TapToSpeak 
        isRecording={isListening} 
        toggleRecording={toggleListening} 
        disabled={!isConnected || !isActivated}
        isProcessing={isProcessingAudio}
        isSpeaking={isSpeaking}
        onInterrupt={handleQuickInterrupt}
      />
      
      {/* Messages container with fixed height */}
      <div className="messages-container fixed-height" ref={messagesContainerRef}>
        {chatMessages.length === 0 ? (
          <div className="message system">
            <div className="message-content">
              {isConnected ? (
                isActivated ? 
                "AI Assistant Ready" :
                "Initializing assistant..."
              ) : (
                "Connecting to server..."
              )}
            </div>
          </div>
        ) : (
          chatMessages.filter(msg => !msg.isError).map((msg) => (
            <div 
              key={msg.id || `${msg.role}-${msg.timestamp.getTime()}`}
              className={`message ${msg.role}`}
            >
              <div className="message-content">
                {msg.content}
              </div> 
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* SQL query display (if available) */}
      {sqlQuery && <SqlDisplay query={sqlQuery} />}
      
      {/* Results table (if available) */}
      {queryResults.length > 0 && <ResultsTable results={queryResults} />}
      
      {/* Text input and controls */}
      <form onSubmit={handleSubmit} className="input-container">
        <input
          type="text"
          className="query-input"
          placeholder="Type your query here..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={!isConnected || !isActivated}
        />
        <div className="button-group">
          <button 
            type="submit" 
            className="send-button"
            disabled={!isConnected || !isActivated || !inputText.trim()}
          >
            <i className="bi bi-send"></i>
            Send
          </button>
          <button
            type="button"
            className="interrupt-button"
            onClick={handleInterrupt}
            disabled={!isSpeaking && !isLoadingSpeech && !isInterruptingRef.current}
          >
            <i className="bi bi-x-circle"></i>
            Interrupt
          </button>
        </div>
      </form>
      
      {/* Collapsible Example queries section */}
      <div className="examples-section">
        <div className="examples-header" onClick={toggleExamples}>
          <h4>Example Queries</h4>
          <button className="toggle-button">
            <i className={`bi ${examplesCollapsed ? 'bi-chevron-down' : 'bi-chevron-up'}`}></i>
          </button>
        </div>
        
        {!examplesCollapsed && (
          <ExampleQueries onSelectQuery={handleExampleQuery} />
        )}
      </div>
    </div>
  );
};

export default ChatInterface;