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
      <Toaster
        position="top-right"
        gutter={10}
        containerStyle={{ top: 16, right: 16 }}
        toastOptions={{
          duration: 4000,
          style: {
            minWidth: '320px',
            maxWidth: '420px',
            padding: '14px 16px',
            borderRadius: '14px',
            fontSize: '14px',
            fontWeight: '500',
            lineHeight: '1.4',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.06)',
            color: '#111827',
            background: '#ffffff',
          },
          success: {
            iconTheme: { primary: '#16a34a', secondary: '#ffffff' },
            style: {
              borderLeft: '4px solid #16a34a',
            },
          },
          error: {
            iconTheme: { primary: '#dc2626', secondary: '#ffffff' },
            style: {
              borderLeft: '4px solid #dc2626',
            },
          },
          loading: {
            iconTheme: { primary: '#2563eb', secondary: '#ffffff' },
            style: {
              borderLeft: '4px solid #2563eb',
            },
          },
        }}
      />
    </NotificationProvider>
  </Provider>
);
