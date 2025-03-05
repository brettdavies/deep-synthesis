import React from 'react';

interface LoadingProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  className?: string;
}

const Loading: React.FC<LoadingProps> = ({ 
  size = 'medium', 
  message = 'Loading...', 
  className = '' 
}) => {
  const sizeClasses = {
    small: 'w-4 h-4 border-2',
    medium: 'w-8 h-8 border-3',
    large: 'w-12 h-12 border-4'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div 
        className={`${sizeClasses[size]} border-t-primary animate-spin rounded-full`}
        role="status"
        aria-label="Loading"
      />
      {message && (
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{message}</p>
      )}
    </div>
  );
};

export { Loading }; 