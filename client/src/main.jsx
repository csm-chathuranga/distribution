import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { registerSW } from 'virtual:pwa-register';
import store from './store/index';
import App from './App';
import { NotificationProvider } from './contexts/NotificationContext';
import { baseApi } from './api/baseApi';
import './index.css';

registerSW({ immediate: true });

// When the app resumes from background (screen unlock / switch back),
// invalidate all cached data so every active query refetches immediately.
import('@capacitor/app').then(({ App: CapApp }) => {
  CapApp.addListener('appStateChange', ({ isActive }) => {
    if (isActive) {
      store.dispatch(baseApi.util.invalidateTags([
        'Delivery', 'Invoice', 'Dashboard', 'Notification',
        'SalesOrder', 'Customer', 'Stock',
      ]));
    }
  });
}).catch(() => {
  // Not running in Capacitor (browser dev) — use visibilitychange instead
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      store.dispatch(baseApi.util.invalidateTags([
        'Delivery', 'Invoice', 'Dashboard', 'Notification',
        'SalesOrder', 'Customer', 'Stock',
      ]));
    }
  });
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <NotificationProvider>
      <App />
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
    </NotificationProvider>
  </Provider>
);
