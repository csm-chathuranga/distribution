import { AlertTriangle, Info, AlertCircle } from 'lucide-react';

const VARIANTS = {
  danger: { icon: AlertTriangle, iconClass: 'text-red-500', bg: 'bg-red-50', btnClass: 'btn-danger' },
  warning: { icon: AlertCircle, iconClass: 'text-amber-500', bg: 'bg-amber-50', btnClass: 'btn bg-amber-500 text-white hover:bg-amber-600' },
  info: { icon: Info, iconClass: 'text-blue-500', bg: 'bg-blue-50', btnClass: 'btn-primary' },
};

export default function ConfirmDialog({
  open, onConfirm, onCancel,
  title = 'Confirm',
  message,
  loading,
  confirmLabel = 'Delete',
  loadingLabel,
  variant = 'danger',
}) {
  if (!open) return null;
  const v = VARIANTS[variant] || VARIANTS.danger;
  const Icon = v.icon;
  const activeLabel = loading ? (loadingLabel || `${confirmLabel.replace(/e$/, '')}ing...`) : confirmLabel;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in">
        <div className="flex items-start gap-4">
          <div className={`p-2 ${v.bg} rounded-xl flex-shrink-0`}>
            <Icon size={22} className={v.iconClass} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onCancel} className="btn btn-secondary">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className={`btn ${v.btnClass}`}>
            {activeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
