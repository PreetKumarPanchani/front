import React from 'react';

/**
 * Loading spinner component with customizable message - Dark Theme Version
 * 
 * @param {Object} props
 * @param {string} props.message - Loading message to display
 * @param {string} props.size - Size of the spinner (small, medium, large)
 * @param {string} props.color - Color theme (primary, secondary, accent)
 * @param {boolean} props.fullScreen - Whether to display as full screen overlay
 */
const LoadingSpinner = ({ 
  message = 'Loading', 
  size = 'medium',
  color = 'primary',
  fullScreen = false
}) => {
  // Determine spinner size
  const spinnerSizes = {
    small: 'w-4 h-4 border-2',
    medium: 'w-8 h-8 border-4',
    large: 'w-12 h-12 border-4',
    xlarge: 'w-16 h-16 border-4',
  };
  
  const spinnerSize = spinnerSizes[size] || spinnerSizes.medium;
  
  // Determine spinner color based on theme
  const getSpinnerColor = () => {
    switch (color) {
      case 'primary':
        return 'var(--accent-primary)';
      case 'secondary':
        return 'var(--accent-secondary)';
      case 'accent':
        return 'var(--accent-primary)';
      case 'danger':
        return 'var(--accent-danger)';
      default:
        return 'var(--accent-primary)';
    }
  };
  
  const spinnerColor = getSpinnerColor();
  
  // Determine text size based on spinner size
  const getTextSize = () => {
    switch (size) {
      case 'small':
        return 'text-sm';
      case 'large':
        return 'text-lg';
      case 'xlarge':
        return 'text-xl';
      default:
        return 'text-base';
    }
  };
  
  const textSize = getTextSize();
  
  const spinnerElement = (
    <div className="flex flex-col items-center justify-center p-12">
      {/* Spinner with glow effect */}
      <div 
        className={`animate-spin ${spinnerSize} border-t-transparent rounded-full mb-4`}
        style={{ 
          borderColor: `${spinnerColor} transparent ${spinnerColor} transparent`,
          filter: `drop-shadow(0 0 8px ${spinnerColor})`
        }}
      ></div>
      
      {/* Loading message */}
      {message && (
        <div className="text-center">
          <span 
            className={`${textSize} font-medium`}
            style={{ color: 'var(--text-secondary)' }}
          >
            {message}
          </span>
          
          {/* Animated dots */}
          <span 
            className="ml-1 animate-pulse"
            style={{ color: 'var(--accent-primary)' }}
          >
            
          </span>
        </div>
      )}
      
      {/* Optional subtle background pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, ${spinnerColor} 1px, transparent 0)`,
            backgroundSize: '20px 20px',
            animation: 'backgroundMove 4s linear infinite'
          }}
        ></div>
      </div>
    </div>
  );
  
  // Full screen overlay version
  if (fullScreen) {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ 
          backgroundColor: 'rgba(15, 15, 15, 0.9)',
          backdropFilter: 'blur(4px)'
        }}
      >
        <div 
          className="card p-8 rounded-xl"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-xl)'
          }}
        >
          {spinnerElement}
        </div>
      </div>
    );
  }
  
  // Regular inline version
  return (
    <div className="relative">
      {spinnerElement}
      
      {/* Custom CSS for background animation */}
      <style jsx>{`
        @keyframes backgroundMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(20px, 20px); }
        }
      `}</style>
    </div>
  );
};

// Specialized loading components for common use cases
export const DashboardLoader = () => (
  <LoadingSpinner 
    message="Loading dashboard" 
    size="large" 
    color="primary"
    fullScreen={true}
  />
);

export const ChartLoader = () => (
  <LoadingSpinner 
    message="Preparing charts" 
    size="medium" 
    color="secondary"
  />
);

export const DataLoader = () => (
  <LoadingSpinner 
    message="Processing data" 
    size="medium" 
    color="primary"
  />
);

export const UploadLoader = () => (
  <LoadingSpinner 
    message="Uploading file" 
    size="large" 
    color="accent"
  />
);

// Pulse loading for skeleton screens
export const PulseLoader = ({ className = '', children }) => (
  <div 
    className={`animate-pulse ${className}`}
    style={{ backgroundColor: 'var(--bg-tertiary)' }}
  >
    {children}
  </div>
);

// Skeleton loading component
export const SkeletonLoader = ({ 
  lines = 3, 
  width = '100%', 
  height = '1rem',
  className = ''
}) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: lines }, (_, index) => (
      <PulseLoader 
        key={index}
        className={`rounded ${index === lines - 1 ? 'w-3/4' : 'w-full'}`}
        style={{ 
          height: height,
          width: index === lines - 1 ? '75%' : width
        }}
      />
    ))}
  </div>
);

// Progress bar loader
export const ProgressLoader = ({ 
  progress = 0, 
  message = 'Loading', 
  showPercentage = true 
}) => (
  <div className="w-full max-w-md mx-auto p-6">
    <div className="flex justify-between items-center mb-2">
      <span 
        className="text-sm font-medium"
        style={{ color: 'var(--text-secondary)' }}
      >
        {message}
      </span>
      {showPercentage && (
        <span 
          className="text-sm font-bold"
          style={{ color: 'var(--accent-primary)' }}
        >
          {Math.round(progress)}%
        </span>
      )}
    </div>
    <div 
      className="w-full rounded-full h-2"
      style={{ backgroundColor: 'var(--bg-tertiary)' }}
    >
      <div 
        className="h-2 rounded-full transition-all duration-300 ease-out"
        style={{ 
          width: `${progress}%`,
          backgroundColor: 'var(--accent-primary)',
          boxShadow: `0 0 10px var(--accent-glow)`
        }}
      ></div>
    </div>
  </div>
);

export default LoadingSpinner;