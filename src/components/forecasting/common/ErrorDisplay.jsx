import React from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, ArrowLeft, ExternalLink, Bug, Wifi, Database } from 'lucide-react';

/**
 * Error display component for showing error messages to the user - Dark Theme Version
 * 
 * @param {Object} props
 * @param {string} props.title - Error title
 * @param {string} props.message - Error message
 * @param {string} props.type - Error type (general, network, database, auth, notFound)
 * @param {string} props.actionText - Text for action button
 * @param {string} props.actionHref - Link for action button
 * @param {Function} props.onRetry - Function to retry the operation
 * @param {boolean} props.showDetails - Whether to show detailed error info
 * @param {Object} props.errorDetails - Additional error details
 * @param {boolean} props.fullScreen - Whether to display as full screen
 */
const ErrorDisplay = ({ 
  title = 'Something went wrong', 
  message = 'An unexpected error occurred', 
  type = 'general',
  actionText = 'Go Back',
  actionHref = '/',
  onRetry = null,
  showDetails = false,
  errorDetails = null,
  fullScreen = false
}) => {
  
  // Get icon and colors based on error type
  const getErrorIcon = () => {
    switch (type) {
      case 'network':
        return <Wifi className="w-16 h-16" style={{ color: 'var(--accent-danger)' }} />;
      case 'database':
        return <Database className="w-16 h-16" style={{ color: 'var(--accent-danger)' }} />;
      case 'notFound':
        return <ExternalLink className="w-16 h-16" style={{ color: 'var(--accent-danger)' }} />;
      case 'auth':
        return <AlertTriangle className="w-16 h-16" style={{ color: 'var(--accent-danger)' }} />;
      default:
        return <Bug className="w-16 h-16" style={{ color: 'var(--accent-danger)' }} />;
    }
  };
  
  const getErrorBackground = () => {
    return {
      backgroundColor: 'rgba(255, 107, 107, 0.1)',
      borderColor: 'var(--accent-danger)',
      border: '1px solid'
    };
  };
  
  const errorContent = (
    <div className="text-center py-8 px-6">
      {/* Error Icon with glow effect */}
      <div className="flex justify-center mb-6">
        <div 
          className="p-4 rounded-full"
          style={{ 
            backgroundColor: 'rgba(255, 107, 107, 0.1)',
            filter: 'drop-shadow(0 0 20px rgba(255, 107, 107, 0.3))'
          }}
        >
          {getErrorIcon()}
        </div>
      </div>
      
      {/* Error Title */}
      <h2 
        className="text-2xl font-bold mb-4"
        style={{ color: 'var(--text-primary)' }}
      >
        {title}
      </h2>
      
      {/* Error Message */}
      <p 
        className="text-lg mb-6 max-w-md mx-auto leading-relaxed"
        style={{ color: 'var(--text-secondary)' }}
      >
        {message}
      </p>
      
      {/* Error Details (Collapsible) */}
      {showDetails && errorDetails && (
        <details className="mb-6 text-left max-w-lg mx-auto">
          <summary 
            className="cursor-pointer text-sm font-medium mb-2 hover:opacity-80"
            style={{ color: 'var(--accent-primary)' }}
          >
            Show Error Details
          </summary>
          <div 
            className="p-4 rounded-lg text-sm font-mono text-left overflow-x-auto"
            style={{ 
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)'
            }}
          >
            <pre className="whitespace-pre-wrap">
              {typeof errorDetails === 'string' 
                ? errorDetails 
                : JSON.stringify(errorDetails, null, 2)}
            </pre>
          </div>
        </details>
      )}
      
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:justify-center gap-4">
        {/* Primary Action */}
        <Link 
          href={actionHref}
          className="btn-primary px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:transform hover:-translate-y-1"
        >
          <ArrowLeft className="w-4 h-4 mr-2 inline" />
          {actionText}
        </Link>
        
        {/* Retry Button */}
        {onRetry && (
          <button 
            onClick={onRetry}
            className="btn-secondary px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:transform hover:-translate-y-1"
          >
            <RefreshCw className="w-4 h-4 mr-2 inline" />
            Try Again
          </button>
        )}
      </div>
      
      {/* Help Text */}
      <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--border-color)' }}>
        <p 
          className="text-sm"
          style={{ color: 'var(--text-secondary)' }}
        >
          If this problem persists, please contact support or try refreshing the page.
        </p>
      </div>
    </div>
  );
  
  // Full screen version
  if (fullScreen) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <div 
          className="max-w-2xl w-full rounded-xl"
          style={{
            ...getErrorBackground(),
            boxShadow: 'var(--shadow-xl)'
          }}
        >
          {errorContent}
        </div>
      </div>
    );
  }
  
  // Inline version
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div 
        className="max-w-2xl mx-auto rounded-xl"
        style={{
          ...getErrorBackground(),
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        {errorContent}
      </div>
    </div>
  );
};

// Specialized error components for common use cases
export const NetworkError = ({ onRetry }) => (
  <ErrorDisplay
    title="Connection Problem"
    message="Unable to connect to the server. Please check your internet connection and try again."
    type="network"
    actionText="Go to Dashboard"
    actionHref="/"
    onRetry={onRetry}
    showDetails={false}
  />
);

export const DataError = ({ errorDetails, onRetry }) => (
  <ErrorDisplay
    title="Data Loading Error"
    message="There was a problem loading the requested data. This might be a temporary issue."
    type="database"
    actionText="Return to Dashboard"
    actionHref="/"
    onRetry={onRetry}
    showDetails={!!errorDetails}
    errorDetails={errorDetails}
  />
);

export const NotFoundError = ({ resource = 'page' }) => (
  <ErrorDisplay
    title={`${resource.charAt(0).toUpperCase() + resource.slice(1)} Not Found`}
    message={`The ${resource} you're looking for doesn't exist or has been moved.`}
    type="notFound"
    actionText="Go Home"
    actionHref="/"
    showDetails={false}
  />
);

export const AuthError = ({ onRetry }) => (
  <ErrorDisplay
    title="Authentication Required"
    message="You need to be logged in to access this feature. Please sign in and try again."
    type="auth"
    actionText="Sign In"
    actionHref="/login"
    onRetry={onRetry}
    showDetails={false}
  />
);

export const UploadError = ({ errorDetails, onRetry }) => (
  <ErrorDisplay
    title="Upload Failed"
    message="There was a problem uploading your file. Please check the file format and try again."
    type="general"
    actionText="Try Upload Again"
    actionHref="/upload"
    onRetry={onRetry}
    showDetails={!!errorDetails}
    errorDetails={errorDetails}
  />
);

// Compact error component for inline use
export const InlineError = ({ message, onDismiss }) => (
  <div 
    className="flex items-center justify-between p-3 rounded-lg mb-4"
    style={{
      backgroundColor: 'rgba(255, 107, 107, 0.1)',
      border: '1px solid var(--accent-danger)'
    }}
  >
    <div className="flex items-center">
      <AlertTriangle 
        className="w-5 h-5 mr-3 flex-shrink-0" 
        style={{ color: 'var(--accent-danger)' }}
      />
      <span 
        className="text-sm font-medium"
        style={{ color: 'var(--accent-danger)' }}
      >
        {message}
      </span>
    </div>
    {onDismiss && (
      <button
        onClick={onDismiss}
        className="ml-3 text-sm hover:opacity-80"
        style={{ color: 'var(--accent-danger)' }}
      >
        ✕
      </button>
    )}
  </div>
);

export default ErrorDisplay;