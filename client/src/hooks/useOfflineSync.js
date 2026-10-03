import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { getQueue, removeFromQueue } from '../utils/offlineQueue';
import { baseApi } from '../api/baseApi';
import { selectToken } from '../store/authSlice';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const dispatch = useDispatch();
  const token = useSelector(selectToken);
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const refreshCount = useCallback(async () => {
    try {
      const queue = await getQueue();
      setPendingCount(queue.length);
    } catch { /* IndexedDB unavailable */ }
  }, []);

  useEffect(() => { refreshCount(); }, [refreshCount]);

  const sync = useCallback(async () => {
    let queue;
    try { queue = await getQueue(); } catch { return; }
    if (!queue.length) return;

    setIsSyncing(true);
    let successCount = 0;

    for (const item of queue) {
      try {
        const res = await fetch(`${API_BASE}${item.url}`, {
          method: item.method,
          headers: {
            'Content-Type': 'application/json',
            ...(tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {}),
          },
          body: item.body ? JSON.stringify(item.body) : undefined,
        });
        if (res.ok) {
          await removeFromQueue(item.id);
          successCount++;
        }
      } catch {
        break; // still offline — stop processing
      }
    }

    await refreshCount();
    setIsSyncing(false);

    if (successCount > 0) {
      dispatch(baseApi.util.invalidateTags([
        'Invoice', 'SalesOrder', 'CustomerReturn', 'Stock', 'LoadingSheet',
      ]));
      toast.success(`${successCount} offline record${successCount > 1 ? 's' : ''} synced`);
    }
  }, [dispatch, refreshCount]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Small delay so the connection is stable before syncing
      setTimeout(() => sync(), 1500);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [sync]);

  // Refresh count when back online
  useEffect(() => {
    if (isOnline) refreshCount();
  }, [isOnline, refreshCount]);

  return { isOnline, pendingCount, sync, isSyncing, refreshCount };
}
