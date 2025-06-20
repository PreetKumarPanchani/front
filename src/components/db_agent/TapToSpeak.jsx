'use client';

// Voice activation component using DayseAI logo
const TapToSpeak = ({ 
  isRecording, 
  toggleRecording, 
  disabled, 
  isProcessing,
  isSpeaking,
  onInterrupt = () => console.log('No interrupt handler provided') 
}) => {
  
  const handleClick = () => {
    // If something is speaking, interrupt it and start listening
    if (isSpeaking) {
      onInterrupt();
      // Small delay before starting listening to ensure interruption completes
      setTimeout(() => {
        toggleRecording();
      }, 50);
      return;
    }
    
    // Otherwise toggle recording as usual
    toggleRecording();
  };
  
  return (
    <div className="tap-to-speak">
      <button 
        className={`tap-button ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`}
        onClick={handleClick}
        disabled={disabled || isProcessing}
        aria-label={isRecording ? 'Stop listening' : 'Start listening'}
      >
        <img 
          src="/dayseai.png" 
          alt="DayseAI Logo" 
          className="tap-logo"
        />
      </button>
      <div className="tap-text">
        {disabled ? 
          'Speech Recognition' : 
          (isProcessing ? 
            'Processing speech...' : 
            (isRecording ? 'Listening...' : 'Tap to Speak'))}
      </div>
    </div>
  );
};

export default TapToSpeak;