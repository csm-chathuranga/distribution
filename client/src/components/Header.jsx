import { Bell, ChevronDown, LogOut, HelpCircle, Check, CheckCheck, Truck, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout, selectCurrentUser } from '../store/authSlice';
import Breadcrumb from './ui/Breadcrumb';
import GettingStartedGuide from './GettingStartedGuide';
import { useNotifications } from '../contexts/NotificationContext';

const PAGE_TITLES = {
  '/customers':  'Customers',
  '/invoices':   'Invoices',
  '/van':        'Van Stock',
  '/deliveries': 'Deliveries',
  '/profile':    'Profile',
};

export default function Header({ minimal = false }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector(selectCurrentUser);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const dropdownRef = useRef(null);
  const bellRef = useRef(null);
  const { notifications, unread, markRead, markAllRead, clearAll } = useNotifications() || {};

  const initials = user?.name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleNotifClick = (n) => {
    if (!n.is_read) markRead?.(n.id);
    if (n.link) { setBellOpen(false); navigate(n.link); }
  };

  if (minimal) {
    const pageTitle = PAGE_TITLES[location.pathname] || 'Lanka Dist';

    return (
      <header className="bg-white flex-shrink-0 z-10"
        style={{ boxShadow: '0 1px 0 0 #f0f0f0, 0 2px 8px rgba(0,0,0,0.06)' }}>
        <div className="h-14 flex items-center justify-between px-4">
          {/* Brand logo left */}
          <div className="flex items-center gap-2 w-10">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)' }}>
              <Truck size={16} className="text-white" />
            </div>
          </div>

          {/* Centered page title */}
          <h1 className="absolute left-1/2 -translate-x-1/2 text-base font-bold text-gray-900 tracking-tight">{pageTitle}</h1>

          {/* Right: bell + avatar */}
          <div className="flex items-center gap-1">
            <div className="relative" ref={bellRef}>
              <button onClick={() => setBellOpen(v => !v)}
                className="relative w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-colors">
                <Bell size={19} />
                {unread > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-800">
                      Notifications
                      {unread > 0 && <span className="ml-1.5 text-xs text-white bg-red-500 font-bold px-1.5 py-0.5 rounded-full">{unread}</span>}
                    </p>
                    <div className="flex items-center gap-2">
                      {unread > 0 && (
                        <button onClick={() => markAllRead?.()} className="flex items-center gap-1 text-xs text-primary-600 font-medium">
                          <CheckCheck size={12} /> Mark all read
                        </button>
                      )}
                      {notifications?.length > 0 && (
                        <button onClick={() => { clearAll?.(); setBellOpen(false); }}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 font-medium transition-colors">
                          <X size={12} /> Clear
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
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
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button onClick={() => navigate('/profile')}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold transition-opacity active:opacity-70 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)' }}>
              {initials}
            </button>
          </div>
        </div>

        {/* Blue accent line */}
        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, #1d4ed8, #3b82f6, #60a5fa)' }} />
      </header>
    );
  }

  return (
    <>
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0 z-10">
      <Breadcrumb />

      <div className="flex items-center gap-3">
        {/* Getting started guide */}
        <button
          onClick={() => setGuideOpen(true)}
          className="relative p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          title="Getting Started Guide"
        >
          <HelpCircle size={18} />
        </button>

        {/* Notification bell */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={() => setBellOpen(v => !v)}
            className="relative p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800">Notifications {unread > 0 && <span className="ml-1 text-xs text-red-500 font-bold">({unread})</span>}</p>
                <div className="flex items-center gap-2">
                  {unread > 0 && (
                    <button onClick={() => markAllRead?.()} className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium">
                      <CheckCheck size={12} /> Mark all read
                    </button>
                  )}
                  {notifications?.length > 0 && (
                    <button onClick={() => { clearAll?.(); setBellOpen(false); }}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 font-medium transition-colors">
                      <X size={12} /> Clear
                    </button>
                  )}
                </div>
              </div>

              {/* List */}
              <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                {(!notifications || notifications.length === 0) ? (
                  <p className="text-sm text-gray-400 text-center py-8">No notifications</p>
                ) : notifications.slice(0, 20).map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex gap-3 items-start ${!n.is_read ? 'bg-blue-50/40' : ''}`}
                  >
                    <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${!n.is_read ? 'bg-primary-500' : 'bg-gray-200'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-800 leading-snug truncate">{n.title}</p>
                      {n.body && <p className="text-xs text-gray-500 mt-0.5 truncate">{n.body}</p>}
                    </div>
                    {!n.is_read && (
                      <button
                        onClick={e => { e.stopPropagation(); markRead?.(n.id); }}
                        className="flex-shrink-0 p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-primary-600"
                        title="Mark read"
                      >
                        <Check size={12} />
                      </button>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">{initials}</span>
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-gray-800 leading-none">{user?.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{user?.Role?.display_name}</p>
            </div>
            <ChevronDown size={14} className={`text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50 animate-fade-in">
              <div className="px-4 py-2 border-b border-gray-100 mb-1">
                <p className="text-xs font-semibold text-gray-800">{user?.name}</p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>

    <GettingStartedGuide open={guideOpen} onClose={() => setGuideOpen(false)} />
    </>
  );
}
