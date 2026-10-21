import { NavLink } from 'react-router-dom';
import { Truck, Users, ClipboardList, User, RotateCcw, Gift, CreditCard, Package, Wallet } from 'lucide-react';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../store/authSlice';

const SALES_TABS = [
  { to: '/customers',    icon: Users,         label: 'Customers', color: '#3b82f6' },
  { to: '/sales-orders', icon: ClipboardList, label: 'Orders',    color: '#10b981' },
  { to: '/sales-returns',icon: RotateCcw,     label: 'Returns',   color: '#ef4444' },
  { to: '/free-items',   icon: Gift,          label: 'Free Items',color: '#8b5cf6' },
  { to: '/profile',      icon: User,          label: 'Profile',   color: '#64748b' },
];

const DRIVER_TABS = [
  { to: '/driver/deliveries',  icon: Truck,      label: 'Deliveries', color: '#10b981' },
  { to: '/driver/collections', icon: Wallet,     label: 'My Coll.',   color: '#f59e0b' },
  { to: '/driver/stock',       icon: Package,    label: 'Van Stock',  color: '#6366f1' },
  { to: '/customer-returns',   icon: RotateCcw,  label: 'Returns',    color: '#ef4444' },
  { to: '/profile',            icon: User,       label: 'Profile',    color: '#64748b' },
];

function Tab({ to, icon: Icon, label, color }) {
  return (
    <NavLink to={to} end className="flex-1 flex justify-center items-center h-full">
      {({ isActive }) => (
        isActive ? (
          <div
            className="flex items-center gap-2 rounded-2xl transition-all duration-300"
            style={{
              padding: '10px 16px',
              background: color + '18',
            }}
          >
            <Icon size={22} strokeWidth={2.3} style={{ color, flexShrink: 0 }} />
            <span style={{ color, fontSize: 14, fontWeight: 700, lineHeight: 1, whiteSpace: 'nowrap' }}>
              {label}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-center transition-all duration-200 rounded-xl"
            style={{ width: 48, height: 48 }}>
            <Icon size={24} strokeWidth={1.6} style={{ color: '#94a3b8' }} />
          </div>
        )
      )}
    </NavLink>
  );
}

export default function BottomNav() {
  const user = useSelector(selectCurrentUser);
  const role = user?.Role?.name;

  const tabs = role === 'sales_rep'                  ? SALES_TABS
             : ['driver', 'delivery'].includes(role) ? DRIVER_TABS
             : null;

  if (!tabs) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50"
      style={{ padding: '8px 12px env(safe-area-inset-bottom, 12px)' }}>
      <div
        className="flex items-center"
        style={{
          height: 64,
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRadius: 20,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
          padding: '0 4px',
        }}
      >
        {tabs.map(tab => <Tab key={tab.to} {...tab} />)}
      </div>
    </nav>
  );
}
