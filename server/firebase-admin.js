let db        = null;
let messaging = null;

try {
  const { initializeApp, getApps, cert } = require('firebase-admin/app');
  const { getFirestore }  = require('firebase-admin/firestore');
  const { getMessaging }  = require('firebase-admin/messaging');
  const serviceAccount    = require('./serviceAccountKey.json');

  if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount) });
  }

  db        = getFirestore();
  messaging = getMessaging();
  console.log('[Firebase] Admin SDK initialised — project:', serviceAccount.project_id);
} catch (err) {
  console.warn('[Firebase] Admin SDK disabled:', err.message);
}

module.exports = { db, messaging };
