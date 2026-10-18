import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, X, Check } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';

export default function FloatingNotification() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const { notifications, unread, markRead, markAllRead, clearAll } = useNotifications() || {};

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNotifClick = (n) => {
    if (!n.is_read) markRead?.(n.id);
    if (n.link) { setOpen(false); navigate(n.link); }
  };

  return (
    <div ref={ref} style={{ position: 'fixed', bottom: 100, right: 16, zIndex: 60 }}>
      {/* Dropdown panel — opens upward */}
      {open && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-3"
          style={{
            width: 'min(320px, calc(100vw - 32px))',
            boxShadow: '0 8px 40px rgba(0,0,0,0.16)',
            position: 'absolute',
            bottom: '100%',
            right: 0,
          }}>
          {/* Header */}
          <div className="px-4 pt-3 pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-semibold text-gray-800">Notifications</span>
              {unread > 0 && (
                <span className="text-xs text-white bg-red-500 font-bold px-1.5 rounded-full leading-none flex items-center justify-center" style={{ height: 18 }}>
                  {unread}
                </span>
              )}
            </div>
            {(unread > 0 || notifications?.length > 0) && (
              <div className="flex items-center gap-3">
                {unread > 0 && (
                  <button onClick={() => markAllRead?.()} className="flex items-center gap-1 text-xs text-primary-600 font-medium">
                    <CheckCheck size={12} /> Mark all read
                  </button>
                )}
                {notifications?.length > 0 && (
                  <button onClick={() => { clearAll?.(); setOpen(false); }}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 font-medium transition-colors">
                    <X size={12} /> Clear
                  </button>
                )}
              </div>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto divide-y divide-gray-50" style={{ maxHeight: 280 }}>
            {(!notifications || notifications.length === 0) ? (
              <p className="text-sm text-gray-400 text-center py-8">No notifications</p>
            ) : notifications.slice(0, 20).map(n => (
              <button key={n.id} onClick={() => handleNotifClick(n)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 flex gap-3 items-start transition-colors ${!n.is_read ? 'bg-blue-50/50' : ''}`}>
                <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${!n.is_read ? 'bg-primary-500' : 'bg-gray-200'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-800 leading-snug">{n.title}</p>
                  {n.body && <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>}
                </div>
                {!n.is_read && (
                  <button onClick={e => { e.stopPropagation(); markRead?.(n.id); }}
                    className="flex-shrink-0 p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-primary-600">
                    <Check size={12} />
                  </button>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* FAB button */}
      <button onClick={() => setOpen(v => !v)}
        className="relative flex items-center justify-center text-white active:scale-95 transition-all"
        style={{
          width: 56, height: 56,
          borderRadius: 18,
          background: open
            ? 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)'
            : 'linear-gradient(135deg, #1d4ed8 0%, #60a5fa 100%)',
          boxShadow: '0 6px 24px rgba(29,78,216,0.40)',
        }}>
        <Bell size={24} strokeWidth={2} />
        {unread > 0 && (
          <span className="absolute flex items-center justify-center bg-red-500 text-white font-bold rounded-full"
            style={{ top: -4, right: -4, minWidth: 20, height: 20, fontSize: 11, padding: '0 4px' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    </div>
  );
}
