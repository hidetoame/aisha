import React, { createContext, useContext, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastContextValue {
  toastMessage: string | null;
  toastType: ToastType | null;
  showToast: (type: ToastType, message: string) => void;
  clearToast: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<ToastType | null>(null);

  const showToast = (type: ToastType, message: string) => {
    setToastMessage(message);
    setToastType(type);
  };

  const clearToast = () => {
    setToastMessage(null);
    setToastType(null);
  };

  return (
    <ToastContext.Provider value={{ toastMessage, toastType, showToast, clearToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
