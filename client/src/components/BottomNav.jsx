import { NavLink } from 'react-router-dom';
import { Truck, FileText, Users, Package, User } from 'lucide-react';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../store/authSlice';

const SALES_TABS = [
  { to: '/customers',  icon: Users,    label: 'Customers',  pill: 'bg-blue-500 shadow-blue-200'     },
  { to: '/invoices',   icon: FileText, label: 'Invoices',   pill: 'bg-emerald-500 shadow-emerald-200' },
  { to: '/van',        icon: Package,  label: 'Van Stock',  pill: 'bg-orange-500 shadow-orange-200'  },
  { to: '/deliveries', icon: Truck,    label: 'Deliveries', pill: 'bg-violet-500 shadow-violet-200'  },
  { to: '/profile',    icon: User,     label: 'Profile',    pill: 'bg-slate-600 shadow-slate-200'    },
];

const DRIVER_TABS = [
  { to: '/deliveries', icon: Truck, label: 'Deliveries', pill: 'bg-violet-500 shadow-violet-200' },
  { to: '/profile',    icon: User,  label: 'Profile',    pill: 'bg-slate-600 shadow-slate-200'   },
];

function Tab({ to, icon: Icon, label, pill }) {
  return (
    <NavLink to={to} end className="flex-1 flex justify-center items-center py-2.5">
      {({ isActive }) =>
        isActive ? (
          <div className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl shadow-lg ${pill}`}>
            <Icon size={16} strokeWidth={2.5} className="text-white flex-shrink-0" />
            <span className="text-white text-xs font-bold whitespace-nowrap leading-none">{label}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-0.5">
            <Icon size={22} strokeWidth={1.6} className="text-gray-400" />
            <span className="text-[10px] font-medium text-gray-400 leading-none">{label}</span>
          </div>
        )
      }
    </NavLink>
  );
}

export default function BottomNav() {
  const user = useSelector(selectCurrentUser);
  const role = user?.Role?.name;

  const tabs = role === 'sales_rep'                      ? SALES_TABS
             : ['driver', 'delivery'].includes(role)     ? DRIVER_TABS
             : null;

  if (!tabs) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] pb-safe">
      <div className="flex items-center px-2">
        {tabs.map(tab => <Tab key={tab.to} {...tab} />)}
      </div>
    </nav>
  );
}
