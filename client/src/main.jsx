import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { registerSW } from 'virtual:pwa-register';
import store from './store/index';
import App from './App';
import { NotificationProvider } from './contexts/NotificationContext';
import './index.css';

registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <NotificationProvider>
      <App />
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
    </NotificationProvider>
  </Provider>
);
