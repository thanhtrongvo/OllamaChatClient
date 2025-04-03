import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const alertStyles = {
  error: 'bg-red-100 border-red-500 text-red-700',
  success: 'bg-green-100 border-green-500 text-green-700',
  warning: 'bg-yellow-100 border-yellow-500 text-yellow-700',
  info: 'bg-blue-100 border-blue-500 text-blue-700',
};

function Alert({ 
  type = 'info', 
  message, 
  onClose, 
  autoClose = false, 
  autoCloseTime = 5000,
  className = '',
}) {
  React.useEffect(() => {
    let timer;
    if (autoClose && message) {
      timer = setTimeout(() => {
        if (onClose) onClose();
      }, autoCloseTime);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [message, autoClose, autoCloseTime, onClose]);

  if (!message) return null;
  
  return (
    <div className={`border-l-4 p-3 ${alertStyles[type]} ${className}`}>
      <div className="flex items-center">
        <p className="flex-grow">{message}</p>
        {onClose && (
          <button
            onClick={onClose}
            className={`ml-auto ${type === 'error' ? 'text-red-700 hover:text-red-900' : 
              type === 'success' ? 'text-green-700 hover:text-green-900' :
              type === 'warning' ? 'text-yellow-700 hover:text-yellow-900' :
              'text-blue-700 hover:text-blue-900'}`}
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}

export default Alert; 