import React, { createContext, useState, useCallback } from 'react';
import Toast from '../components/Toast';

export const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((type, message, duration = 5000) => {
    const id = Date.now();
    setToasts(prevToasts => [...prevToasts, { id, type, message, duration }]);
    return id;
  }, []);

  const hideToast = useCallback((id) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  // Helper functions for different toast types
  const success = useCallback((message, duration) => showToast('success', message, duration), [showToast]);
  const error = useCallback((message, duration) => showToast('error', message, duration), [showToast]);
  const warning = useCallback((message, duration) => showToast('warning', message, duration), [showToast]);
  const info = useCallback((message, duration) => showToast('info', message, duration), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, hideToast, success, error, warning, info }}>
      {children}
      
      {/* Render all active toasts */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col items-end pointer-events-none">
        {toasts.map((toast, index) => (
          <div 
            key={toast.id} 
            className="mb-3 pointer-events-auto w-full max-w-md transform transition-all duration-300 ease-in-out"
            style={{
              marginTop: index > 0 ? '0.75rem' : '0'
            }}
          >
            <Toast 
              type={toast.type}
              message={toast.message}
              isVisible={true}
              duration={toast.duration}
              onClose={() => hideToast(toast.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;