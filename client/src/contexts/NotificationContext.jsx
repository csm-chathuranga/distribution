import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Bell } from 'lucide-react';
import { selectCurrentUser } from '../store/authSlice';
import { baseApi } from '../api/baseApi';
import { salesApi } from '../api/salesApi';
import { useGetNotificationsQuery, useMarkReadMutation, useMarkAllReadMutation } from '../api/notificationsApi';
import { db } from '../firebase';

const INVALIDATION_MAP = {
  DELIVERY_DISPATCHED: ['Delivery', 'Dashboard'],
  DELIVERY_COMPLETED:  ['Delivery', 'Dashboard'],
  DELIVERY_RETURNED:   ['Delivery', 'Dashboard'],
  INVOICE_POSTED:      ['Invoice',  'Dashboard'],
  CREDIT_NOTE_POSTED:  ['Invoice',  'Dashboard'],
  PAYMENT_CREATED:     ['Payment',  'Dashboard'],
  SHEET_LOADED:        ['Dashboard', 'LoadingSheet'],
};

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const user     = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  const [liveItems,    setLiveItems]    = useState([]);
  const [dismissedIds, setDismissedIds] = useState(() => new Set());
  const seenIds = useRef(new Set());

  const { data: fetched = [], refetch } = useGetNotificationsQuery(undefined, { skip: !user });
  const [markReadMut]    = useMarkReadMutation();
  const [markAllReadMut] = useMarkAllReadMutation();

  // Merge Firestore live items + REST fetched, deduplicate, exclude dismissed
  const notifications = [...liveItems, ...fetched].reduce((acc, n) => {
    if (!acc.some(x => String(x.id) === String(n.id)) && !dismissedIds.has(String(n.id))) acc.push(n);
    return acc;
  }, []);
  const unread = notifications.filter(n => !n.is_read).length;

  const markRead = useCallback(async (id) => {
    setLiveItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    try { await markReadMut(id).unwrap(); } catch (_) {}
    refetch();
  }, [markReadMut, refetch]);

  const markAllRead = useCallback(async () => {
    setLiveItems(prev => prev.map(n => ({ ...n, is_read: true })));
    try { await markAllReadMut().unwrap(); } catch (_) {}
    refetch();
  }, [markAllReadMut, refetch]);

  const clearAll = useCallback(async () => {
    const allIds = new Set([...liveItems, ...fetched].map(n => String(n.id)));
    setDismissedIds(allIds);
    setLiveItems([]);
    try { await markAllReadMut().unwrap(); } catch (_) {}
  }, [liveItems, fetched, markAllReadMut]);

  // Firestore real-time listener — replaces Socket.io
  useEffect(() => {
    if (!user || !db) return;

    const recipientKeys = [`user:${user.id}`];
    if (user.Role?.name) recipientKeys.push(`role:${user.Role.name}`);

    const q = query(
      collection(db, 'notifications'),
      where('recipients', 'array-contains-any', recipientKeys),
      orderBy('created_at', 'desc'),
      limit(50),
    );

    const unsub = onSnapshot(q, (snap) => {
      snap.docChanges().forEach(change => {
        if (change.type !== 'added') return;

        const notif = { id: change.doc.id, ...change.doc.data() };
        const strId = String(notif.id);

        // Only process genuinely new docs (avoid re-toasting on reconnect)
        if (seenIds.current.has(strId)) return;
        seenIds.current.add(strId);

        // Only toast if the notification arrived in the last 30 s (fresh)
        const createdMs = notif.created_at?.toMillis?.() || 0;
        const isFresh   = createdMs && (Date.now() - createdMs < 30_000);

        setLiveItems(prev => {
          if (prev.some(x => String(x.id) === strId)) return prev;
          return [notif, ...prev];
        });

        // Cache invalidation always runs for new-to-session notifications,
        // regardless of age — handles app-was-backgrounded scenario where
        // the notification is >30s old when the app resumes.
        if (notif.type === 'SHEET_LOADED') {
          dispatch(salesApi.endpoints.getActiveSheet.initiate(undefined, { forceRefetch: true, subscribe: false }));
        }
        const tags = INVALIDATION_MAP[notif.type];
        if (tags) dispatch(baseApi.util.invalidateTags(tags));

        // Toast only for genuinely fresh notifications (avoid re-toasting on reconnect)
        if (isFresh) {
          toast(
            (t) => (
              <div
                className="flex items-start gap-3 cursor-pointer"
                onClick={() => { toast.dismiss(t.id); if (notif.link) window.location.hash = notif.link; }}
              >
                <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bell size={14} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 leading-tight">{notif.title}</p>
                  {notif.body && <p className="text-xs text-gray-500 mt-0.5">{notif.body}</p>}
                </div>
              </div>
            ),
            { duration: 6000, style: { padding: '10px 14px', maxWidth: '360px' } },
          );
        }
      });
    });

    return unsub;
  }, [user?.id, user?.Role?.name, dispatch]);

  // Register FCM token (Capacitor native push or web push)
  useEffect(() => {
    if (!user) return;
    registerFcmToken();
  }, [user?.id]);

  return (
    <NotificationContext.Provider value={{ notifications, unread, markRead, markAllRead, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
}

let fcmRegistered = false;

async function registerFcmToken() {
  if (fcmRegistered) return;
  fcmRegistered = true;
  try {
    // Capacitor native push (Android/iOS)
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      await PushNotifications.requestPermissions();
      await PushNotifications.register();
      PushNotifications.addListener('registration', async ({ value: token }) => {
        await saveFcmToken(token);
      });
      return;
    }

    // Web push via Firebase Messaging
    const { messaging: fbMessaging } = await import('../firebase');
    if (!fbMessaging) return;
    const { getToken } = await import('firebase/messaging');
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const token = await getToken(fbMessaging, { vapidKey, serviceWorkerRegistration: reg });
    if (token) await saveFcmToken(token);
  } catch (_) {
    // Push notifications not supported or denied — silent
  }
}

async function saveFcmToken(token) {
  try {
    const authToken = JSON.parse(localStorage.getItem('auth') || '{}')?.token;
    if (!authToken) return;
    const base = import.meta.env.VITE_API_BASE || '';
    await fetch(`${base}/api/auth/fcm-token`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body:    JSON.stringify({ token }),
    });
  } catch (_) {}
}

export function useNotifications() {
  return useContext(NotificationContext);
}
