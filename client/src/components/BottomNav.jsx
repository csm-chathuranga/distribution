import { NavLink } from 'react-router-dom';
import { Truck, FileText, Users, Package, User } from 'lucide-react';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../store/authSlice';

const SALES_TABS = [
  { to: '/customers',  icon: Users,    label: 'Customers',  color: '#3b82f6' },
  { to: '/invoices',   icon: FileText, label: 'Invoices',   color: '#10b981' },
  { to: '/van',        icon: Package,  label: 'Van Stock',  color: '#f97316' },
  { to: '/deliveries', icon: Truck,    label: 'Deliveries', color: '#8b5cf6' },
  { to: '/profile',    icon: User,     label: 'Profile',    color: '#64748b' },
];

const DRIVER_TABS = [
  { to: '/deliveries', icon: Truck, label: 'Deliveries', color: '#8b5cf6' },
  { to: '/profile',    icon: User,  label: 'Profile',    color: '#64748b' },
];

function Tab({ to, icon: Icon, label, color }) {
  return (
    <NavLink to={to} end className="flex-1 flex justify-center items-center py-2">
      {({ isActive }) => (
        <div className="flex flex-col items-center gap-1 relative">
          <div
            className="w-11 h-10 flex items-center justify-center rounded-2xl transition-all duration-200"
            style={isActive ? { background: color + '18' } : {}}
          >
            <Icon
              size={20}
              strokeWidth={isActive ? 2.2 : 1.6}
              style={{ color: isActive ? color : '#94a3b8' }}
            />
          </div>
          <span
            className="text-[10px] font-semibold leading-none transition-colors duration-200"
            style={{ color: isActive ? color : '#94a3b8' }}
          >
            {label}
          </span>
          {isActive && (
            <span
              className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
              style={{ background: color }}
            />
          )}
        </div>
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe"
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.08)',
      }}>
      <div className="flex items-center px-1">
        {tabs.map(tab => <Tab key={tab.to} {...tab} />)}
      </div>
    </nav>
  );
}
