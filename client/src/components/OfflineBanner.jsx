import { WifiOff, RefreshCw, CheckCircle } from 'lucide-react';
import { useOfflineSync } from '../hooks/useOfflineSync';

export default function OfflineBanner() {
  const { isOnline, pendingCount, sync, isSyncing } = useOfflineSync();

  if (isOnline && pendingCount === 0) return null;

  if (isOnline && pendingCount > 0) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[200] bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-sm font-medium shadow-lg">
        <div className="flex items-center gap-2">
          <CheckCircle size={15} />
          Back online — {pendingCount} unsync'd record{pendingCount > 1 ? 's' : ''}
        </div>
        <button
          onClick={sync}
          disabled={isSyncing}
          className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-xs font-semibold disabled:opacity-60"
        >
          <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
          {isSyncing ? 'Syncing…' : 'Sync Now'}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] bg-gray-800 text-white px-4 py-2 flex items-center gap-2 text-sm font-medium shadow-lg">
      <WifiOff size={15} className="text-red-400 flex-shrink-0" />
      <span>
        Offline — orders will be saved and synced when connected
        {pendingCount > 0 && ` (${pendingCount} pending)`}
      </span>
    </div>
  );
}
