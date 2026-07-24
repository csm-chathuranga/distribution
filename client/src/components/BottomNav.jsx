import { NavLink } from 'react-router-dom';
import { Truck, FileText, Users, ShoppingCart, User, ClipboardList } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentUser, logout } from '../store/authSlice';

const DRIVER_ROLES = ['driver', 'delivery'];
const SALES_ROLES  = ['sales_rep'];

function Tab({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors ${
          isActive ? 'text-primary-500' : 'text-gray-400 active:text-primary-400'
        }`
      }
    >
      <Icon size={24} strokeWidth={1.8} />
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </NavLink>
  );
}

export default function BottomNav() {
  const user     = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  const role     = user?.Role?.name;

  if (!role) return null;

  const isDriver   = DRIVER_ROLES.includes(role);
  const isSalesRep = SALES_ROLES.includes(role);

  if (!isDriver && !isSalesRep) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-2px_12px_rgba(0,0,0,0.08)] flex pb-safe">
      {isDriver && (
        <>
          <Tab to="/deliveries" icon={Truck}    label="Deliveries" />
          <Tab to="/profile"    icon={User}     label="Profile" />
        </>
      )}

      {isSalesRep && (
        <>
          <Tab to="/customers"    icon={Users}         label="Customers" />
          <Tab to="/sales-orders" icon={ShoppingCart}  label="Orders" />
          <Tab to="/invoices"     icon={FileText}      label="Invoices" />
          <Tab to="/deliveries"   icon={Truck}         label="Deliveries" />
          <Tab to="/profile"      icon={User}          label="Profile" />
        </>
      )}
    </nav>
  );
}
