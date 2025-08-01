import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import AppRouter from './src/AppRouter';
import { ToastProvider } from './src/contexts/ToastContext';
import { CreditsProvider } from './src/contexts/CreditsContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ToastProvider>
      <CreditsProvider>
        <AppRouter />
      </CreditsProvider>
    </ToastProvider>
  </React.StrictMode>,
);
