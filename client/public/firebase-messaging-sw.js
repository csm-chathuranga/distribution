// Firebase Cloud Messaging service worker — handles background push on web
// IMPORTANT: Fill in your Firebase config values below.
// These must match what is in client/.env
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// ── Fill in your Firebase project config ─────────────────────────────────────
const firebaseConfig = {
  apiKey:            'AIzaSyD1-X-roxkhPlEV9jTuPkDfz7Yk0cljT-o',
  authDomain:        'distribution-7294b.firebaseapp.com',
  projectId:         'distribution-7294b',
  storageBucket:     'distribution-7294b.firebasestorage.app',
  messagingSenderId: '1059968028925',
  appId:             '1:1059968028925:web:bd992e85c25ab72c9fae94',
};
// ─────────────────────────────────────────────────────────────────────────────

if (firebaseConfig.apiKey !== '__FIREBASE_API_KEY__') {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const { title, body } = payload.notification || {};
    self.registration.showNotification(title || 'Lanka Dist', {
      body:  body || '',
      icon:  '/logo.png',
      badge: '/logo.png',
      data:  { link: payload.data?.link || '/' },
    });
  });

  self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const link = event.notification.data?.link || '/';
    event.waitUntil(clients.openWindow(link));
  });
}
