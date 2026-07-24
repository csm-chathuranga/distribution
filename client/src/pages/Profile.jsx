import { useDispatch, useSelector } from 'react-redux';
import { logout, selectCurrentUser } from '../store/authSlice';
import { LogOut, User, Phone, Mail, Briefcase } from 'lucide-react';

export default function Profile() {
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);

  const initials = user?.name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-6">
      {/* Avatar + name */}
      <div className="card p-6 flex flex-col items-center text-center gap-3">
        <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center text-white text-2xl font-bold">
          {initials}
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{user?.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{user?.Role?.display_name || user?.Role?.name}</p>
        </div>
      </div>

      {/* Details */}
      <div className="card divide-y divide-gray-100">
        {user?.email && (
          <div className="flex items-center gap-4 p-4">
            <Mail size={18} className="text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Email</p>
              <p className="text-sm font-medium text-gray-800">{user.email}</p>
            </div>
          </div>
        )}
        {user?.phone && (
          <div className="flex items-center gap-4 p-4">
            <Phone size={18} className="text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Phone</p>
              <p className="text-sm font-medium text-gray-800">{user.phone}</p>
            </div>
          </div>
        )}
        {user?.employee_id && (
          <div className="flex items-center gap-4 p-4">
            <Briefcase size={18} className="text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Employee ID</p>
              <p className="text-sm font-medium text-gray-800">{user.employee_id}</p>
            </div>
          </div>
        )}
      </div>

      {/* Logout */}
      <button
        onClick={() => dispatch(logout())}
        className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-red-50 text-red-600 font-semibold text-base active:bg-red-100 transition-colors"
      >
        <LogOut size={20} />
        Sign Out
      </button>
    </div>
  );
}
