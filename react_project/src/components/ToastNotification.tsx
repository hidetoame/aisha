import React, { useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon, XMarkIcon } from './icons/HeroIcons';
import { useToast } from '@/contexts/ToastContext';

export const ToastNotification: React.FC = () => {
  const { toastMessage: message, toastType: type, clearToast } = useToast();

  useEffect(() => {
    if (message && type) {
      const timer = setTimeout(() => {
        clearToast();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, type, clearToast]);

  if (!message || !type) {
    return null;
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="w-6 h-6 text-green-400" />;
      case 'error':
        return <XCircleIcon className="w-6 h-6 text-red-400" />;
      case 'info':
        return <InformationCircleIcon className="w-6 h-6 text-blue-400" />;
      default:
        return null;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-600 border-green-500';
      case 'error':
        return 'bg-red-600 border-red-500';
      case 'info':
        return 'bg-blue-600 border-blue-500';
      default:
        return 'bg-gray-700 border-gray-600';
    }
  };

  return (
    <div 
      className={`fixed bottom-5 right-5 z-[100] p-4 rounded-lg shadow-2xl border text-white transition-all duration-300 ease-in-out transform ${getBackgroundColor()}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center">
        <div className="flex-shrink-0 mr-3">{getIcon()}</div>
        <div className="flex-grow text-sm font-medium">{message}</div>
        <button 
          onClick={clearToast}
          className="ml-4 -mr-1 p-1 rounded-md hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="通知を閉じる"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
