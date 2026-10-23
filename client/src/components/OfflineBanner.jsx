import { WifiOff, RefreshCw, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useOfflineSync } from '../hooks/useOfflineSync';

export default function OfflineBanner() {
  const {
    isOnline,
    pendingCount,
    failedCount,
    retryingCount,
    otherAccountCount,
    unassignedCount,
    queueError,
    sync,
    isSyncing,
  } = useOfflineSync();

  if (isOnline && pendingCount === 0 && failedCount === 0 && otherAccountCount === 0 && unassignedCount === 0 && !queueError) return null;

  if (isOnline) {
    return (
      <div className={`fixed top-0 left-0 right-0 z-[200] ${failedCount ? 'bg-red-600' : 'bg-amber-500'} text-white px-4 py-2 flex items-center justify-between gap-3 text-sm font-medium shadow-lg`}>
        <div className="flex items-center gap-2">
          {failedCount ? <WifiOff size={15} /> : <CheckCircle size={15} />}
          <span>
            {queueError || (unassignedCount
              ? `${unassignedCount} saved record${unassignedCount > 1 ? 's need' : ' needs'} account assignment before syncing`
              : failedCount
              ? `${failedCount} record${failedCount > 1 ? 's need' : ' needs'} attention`
              : pendingCount > 0
                ? `Back online — ${pendingCount} record${pendingCount > 1 ? 's' : ''} waiting to sync${retryingCount ? `; ${retryingCount} will retry after a connection issue` : ''}`
                : `${otherAccountCount} saved record${otherAccountCount > 1 ? 's belong' : ' belongs'} to another account`)}
          </span>
          {(failedCount > 0 || unassignedCount > 0) && (
            <Link to="/sales-orders" className="underline underline-offset-2 whitespace-nowrap">
              Review saved orders
            </Link>
          )}
        </div>
        {pendingCount > 0 && (
          <button
            onClick={() => sync(true)}
            disabled={isSyncing}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-xs font-semibold disabled:opacity-60 whitespace-nowrap"
          >
            <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Syncing…' : 'Sync Now'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] bg-gray-800 text-white px-4 py-2 flex items-center gap-2 text-sm font-medium shadow-lg">
      <WifiOff size={15} className="text-red-400 flex-shrink-0" />
      <span>
        Offline — new orders save on this device and sync when connected.
        {pendingCount > 0 && ` ${pendingCount} waiting to sync.`}
        {failedCount > 0 && ` ${failedCount} need attention.`}
        {unassignedCount > 0 && ` ${unassignedCount} need account assignment.`}
        {otherAccountCount > 0 && ` ${otherAccountCount} belong to another account.`}
      </span>
      {(failedCount > 0 || unassignedCount > 0) && (
        <Link to="/sales-orders" className="ml-auto underline underline-offset-2 whitespace-nowrap">
          Review
        </Link>
      )}
    </div>
  );
}
