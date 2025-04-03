import React from 'react';

function Spinner({ size = 'medium', color = 'white', className = '' }) {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-5 w-5',
    large: 'h-8 w-8',
  };

  const colorClasses = {
    white: 'text-white',
    gray: 'text-gray-500',
    indigo: 'text-indigo-500',
  };

  return (
    <svg 
      className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]} ${className}`} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      ></circle>
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
}

// Loading cùng với text
export function LoadingText({ text = 'Đang tải...', size = 'medium', color = 'gray' }) {
  return (
    <div className="flex items-center justify-center space-x-2">
      <Spinner size={size} color={color} />
      <span>{text}</span>
    </div>
  );
}

export default Spinner; 