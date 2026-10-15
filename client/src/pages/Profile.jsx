import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout, selectCurrentUser, selectAssignedWarehouse } from '../store/authSlice';
import { useChangePasswordMutation } from '../api/settingsApi';
import { LogOut, Mail, Phone, Briefcase, Warehouse, KeyRound, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

function ChangePasswordForm() {
  const [current, setCurrent]   = useState('');
  const [next, setNext]         = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showCur, setShowCur]   = useState(false);
  const [showNew, setShowNew]   = useState(false);
  const [changePassword, { isLoading }] = useChangePasswordMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (next !== confirm) { toast.error('New passwords do not match'); return; }
    if (next.length < 6)  { toast.error('Password must be at least 6 characters'); return; }
    try {
      await changePassword({ current_password: current, new_password: next }).unwrap();
      toast.success('Password changed successfully');
      setCurrent(''); setNext(''); setConfirm('');
    } catch (err) {
      toast.error(err.data?.message || 'Failed to change password');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-3">
      <div className="relative">
        <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Current Password</label>
        <div className="relative">
          <input
            type={showCur ? 'text' : 'password'}
            value={current}
            onChange={e => setCurrent(e.target.value)}
            className="input w-full pr-10"
            placeholder="Enter current password"
            required
          />
          <button type="button" onClick={() => setShowCur(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {showCur ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">New Password</label>
        <div className="relative">
          <input
            type={showNew ? 'text' : 'password'}
            value={next}
            onChange={e => setNext(e.target.value)}
            className="input w-full pr-10"
            placeholder="Min. 6 characters"
            required
          />
          <button type="button" onClick={() => setShowNew(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Confirm New Password</label>
        <input
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          className="input w-full"
          placeholder="Repeat new password"
          required
        />
      </div>
      <button type="submit" disabled={isLoading}
        className="w-full btn btn-primary disabled:opacity-50 mt-1">
        {isLoading ? 'Saving…' : 'Update Password'}
      </button>
    </form>
  );
}

export default function Profile() {
  const dispatch          = useDispatch();
  const user              = useSelector(selectCurrentUser);
  const assignedWarehouse = useSelector(selectAssignedWarehouse);
  const [showPwForm, setShowPwForm] = useState(false);

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
        {assignedWarehouse && (
          <div className="flex items-center gap-4 p-4">
            <Warehouse size={18} className="text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Warehouse</p>
              <p className="text-sm font-medium text-gray-800">{assignedWarehouse.name}</p>
              {assignedWarehouse.code && (
                <p className="text-xs text-gray-400 font-mono">{assignedWarehouse.code}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="card overflow-hidden">
        <button
          type="button"
          onClick={() => setShowPwForm(v => !v)}
          className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <KeyRound size={18} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-800">Change Password</span>
          </div>
          <span className="text-xs text-gray-400">{showPwForm ? 'Cancel' : 'Update'}</span>
        </button>
        {showPwForm && (
          <div className="border-t border-gray-100">
            <ChangePasswordForm />
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
