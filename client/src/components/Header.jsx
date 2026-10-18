import { Bell, ChevronDown, LogOut, HelpCircle, Check, CheckCheck, Truck, X, RefreshCw, ArrowLeft } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
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
  const [spinning, setSpinning] = useState(false);

  const handleRefresh = useCallback(() => {
    setSpinning(true);
    setTimeout(() => window.location.reload(), 300);
  }, []);
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
    const path = location.pathname;

    const SUB_TITLES = {
      '/sales-orders/new':     'New Sales Order',
      '/customer-returns/new': 'New Return',
      '/invoices/new':         'New Invoice',
    };

    function getSubTitle(p) {
      if (SUB_TITLES[p])                     return SUB_TITLES[p];
      if (p.startsWith('/sales-orders/'))    return 'Sales Order';
      if (p.startsWith('/invoices/'))        return 'Invoice';
      if (p.startsWith('/customers/'))       return 'Customer';
      if (p.startsWith('/loading-sheets/'))  return 'Loading Sheet';
      if (p.startsWith('/customer-returns/'))return 'Return';
      if (p.startsWith('/deliveries/'))      return 'Delivery';
      return 'Back';
    }

    const pathParts = path.split('/').filter(Boolean);
    const isSubPage = pathParts.length > 1 || Object.keys(SUB_TITLES).includes(path);
    const pageTitle = isSubPage ? getSubTitle(path) : (PAGE_TITLES[path] || 'Lanka Dist');

    return (
      <header className="flex-shrink-0 z-50" style={{
        background: 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 1px 0 rgba(0,0,0,0.07), 0 4px 20px rgba(0,0,0,0.05)',
      }}>
        <div className="flex items-center justify-between px-4" style={{ height: 80 }}>

          {/* Left: back button or brand */}
          {isSubPage ? (
            <button onClick={() => navigate(-1)}
              className="flex items-center justify-center rounded-2xl active:scale-95 transition-transform"
              style={{ width: 52, height: 52, background: 'rgba(0,0,0,0.06)' }}>
              <ArrowLeft size={26} strokeWidth={2.5} className="text-gray-800" />
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center rounded-2xl shadow-md"
                style={{ width: 50, height: 50, background: 'linear-gradient(135deg, #1d4ed8 0%, #60a5fa 100%)' }}>
                <Truck size={24} className="text-white" />
              </div>
              <span className="font-extrabold text-gray-900 tracking-tight" style={{ fontSize: 22 }}>
                Lanka<span className="text-blue-600">Dist</span>
              </span>
            </div>
          )}

          {/* Centered page title (sub-pages only) */}
          {isSubPage && (
            <h1 className="absolute left-1/2 -translate-x-1/2 font-bold text-gray-900 tracking-tight pointer-events-none"
              style={{ fontSize: 20 }}>
              {pageTitle}
            </h1>
          )}

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button onClick={handleRefresh}
              className="flex items-center justify-center rounded-2xl text-gray-500 active:opacity-60 transition-all"
              style={{ width: 48, height: 48, background: 'rgba(0,0,0,0.05)' }}>
              <RefreshCw size={21} className={spinning ? 'animate-spin' : ''} />
            </button>

            {/* Avatar — circular gradient */}
            <button onClick={() => navigate('/profile')}
              className="flex items-center justify-center text-white font-extrabold rounded-full active:opacity-70 shadow-md transition-all"
              style={{
                width: 48, height: 48, fontSize: 17,
                background: 'linear-gradient(135deg, #1d4ed8 0%, #60a5fa 100%)',
              }}>
              {initials}
            </button>
          </div>
        </div>
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
            <div className="absolute right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden"
              style={{ width: 'min(320px, calc(100vw - 20px))' }}>
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
