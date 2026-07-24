import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { Bell } from 'lucide-react';
import { selectCurrentUser } from '../store/authSlice';
import { baseApi } from '../api/baseApi';
import { useGetNotificationsQuery, useMarkReadMutation, useMarkAllReadMutation } from '../api/notificationsApi';

// Which RTK Query tags to invalidate per notification type so UI data refreshes instantly
const INVALIDATION_MAP = {
  DELIVERY_DISPATCHED: ['Delivery', 'Dashboard'],
  DELIVERY_COMPLETED:  ['Delivery', 'Dashboard'],
  DELIVERY_RETURNED:   ['Delivery', 'Dashboard'],
  INVOICE_POSTED:      ['Invoice',  'Dashboard'],
  CREDIT_NOTE_POSTED:  ['Invoice',  'Dashboard'],
  PAYMENT_CREATED:     ['Payment',  'Dashboard'],
  SHEET_LOADED:        ['Dashboard'],
};

const NotificationContext = createContext(null);

// In Capacitor APK window.location.origin is "https://localhost" (the webview),
// so use the absolute production URL when VITE_API_BASE is set.
const SOCKET_URL = import.meta.env.VITE_API_BASE || window.location.origin;

export function NotificationProvider({ children }) {
  const user     = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  const [liveItems, setLiveItems] = useState([]);

  const { data: fetched = [], refetch } = useGetNotificationsQuery(undefined, { skip: !user });
  const [markReadMut]    = useMarkReadMutation();
  const [markAllReadMut] = useMarkAllReadMutation();

  // Merge live socket items + REST items, deduplicate by id (live first)
  const notifications = [...liveItems, ...fetched].reduce((acc, n) => {
    if (!acc.some(x => x.id === n.id)) acc.push(n);
    return acc;
  }, []);
  const unread = notifications.filter(n => !n.is_read).length;

  const markRead = useCallback(async (id) => {
    setLiveItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    try { await markReadMut(id).unwrap(); } catch (_) { /* non-critical */ }
    refetch();
  }, [markReadMut, refetch]);

  const markAllRead = useCallback(async () => {
    setLiveItems(prev => prev.map(n => ({ ...n, is_read: true })));
    try { await markAllReadMut().unwrap(); } catch (_) { /* non-critical */ }
    refetch();
  }, [markAllReadMut, refetch]);

  useEffect(() => {
    if (!user) return;

    const socket = io(SOCKET_URL, {
      auth: { userId: user.id, roleName: user.Role?.name },
      transports: ['websocket', 'polling'],
      path: '/socket.io',
    });

    socket.on('notification', (notif) => {
      // 1. Add to bell list
      setLiveItems(prev => [notif, ...prev]);

      // 2. Toast so the user sees it immediately even if the bell isn't open
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
        { duration: 6000, style: { padding: '10px 14px', maxWidth: '360px' } }
      );

      // 3. Invalidate relevant RTK Query tags so data re-fetches immediately
      const tags = INVALIDATION_MAP[notif.type];
      if (tags) dispatch(baseApi.util.invalidateTags(tags));
    });

    return () => socket.disconnect();
  }, [user?.id, user?.Role?.name]);

  return (
    <NotificationContext.Provider value={{ notifications, unread, markRead, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
