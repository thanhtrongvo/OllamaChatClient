import React, { useEffect } from 'react';
import { 
  CheckCircleIcon, 
  ExclamationCircleIcon, 
  InformationCircleIcon, 
  XCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const toastTypeConfig = {
  success: {
    icon: CheckCircleIcon,
    bgColor: 'bg-gradient-to-r from-green-50 to-green-100',
    borderColor: 'border-green-400',
    textColor: 'text-green-800',
    iconColor: 'text-green-500'
  },
  error: {
    icon: XCircleIcon,
    bgColor: 'bg-gradient-to-r from-red-50 to-red-100',
    borderColor: 'border-red-400',
    textColor: 'text-red-800',
    iconColor: 'text-red-500'
  },
  warning: {
    icon: ExclamationCircleIcon,
    bgColor: 'bg-gradient-to-r from-yellow-50 to-yellow-100',
    borderColor: 'border-yellow-400',
    textColor: 'text-yellow-800',
    iconColor: 'text-yellow-500'
  },
  info: {
    icon: InformationCircleIcon,
    bgColor: 'bg-gradient-to-r from-blue-50 to-purple-100',
    borderColor: 'border-blue-400',
    textColor: 'text-blue-800',
    iconColor: 'text-blue-500'
  }
};

const Toast = ({ type, message, isVisible, onClose, autoClose = true, duration = 5000 }) => {
  const config = toastTypeConfig[type] || toastTypeConfig.info;
  const IconComponent = config.icon;
  
  useEffect(() => {
    if (autoClose && isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose, autoClose, duration]);

  if (!isVisible) return null;

  return (
    <div className="w-full animate-slide-in-right">
      <div 
        className={`flex items-center p-4 rounded-xl shadow-lg border ${config.bgColor} ${config.borderColor} w-full backdrop-blur-sm`}
        role="alert"
      >
        <IconComponent className={`w-5 h-5 mr-3 ${config.iconColor} flex-shrink-0`} />
        <div className={`text-sm font-medium ${config.textColor} flex-grow`}>{message}</div>
        <button 
          onClick={onClose}
          className="ml-4 p-1 rounded-full hover:bg-gray-200/50 transition-colors flex-shrink-0"
          aria-label="Close"
        >
          <XMarkIcon className="w-5 h-5 text-gray-500" />
        </button>
      </div>
    </div>
  );
};

export default Toast;