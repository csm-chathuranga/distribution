import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  getQueue,
  removeFromQueue,
  updateQueueItem,
  QUEUE_CHANGED_EVENT,
} from '../utils/offlineQueue';
import { baseApi } from '../api/baseApi';
import { selectCurrentUser, selectToken, selectRefreshToken, setCredentials, logout } from '../store/authSlice';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
let activeSync = null;

function getErrorMessage(body, status) {
  if (body && typeof body === 'object' && typeof body.message === 'string') return body.message;
  return `Request failed (${status})`;
}

async function readResponseBody(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

async function fetchWithTimeout(url, options, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Network request timed out');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueItems, setQueueItems] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [queueError, setQueueError] = useState('');
  const dispatch = useDispatch();
  const token = useSelector(selectToken);
  const refreshToken = useSelector(selectRefreshToken);
  const currentUser = useSelector(selectCurrentUser);
  const tokenRef = useRef(token);
  const refreshTokenRef = useRef(refreshToken);
  const userIdRef = useRef(currentUser?.id);
  const retryTimerRef = useRef(null);
  tokenRef.current = token;
  refreshTokenRef.current = refreshToken;
  userIdRef.current = currentUser?.id;

  const refreshQueue = useCallback(async () => {
    try {
      setQueueItems(await getQueue());
      setQueueError('');
    } catch (error) {
      setQueueError(`Offline storage is unavailable: ${error.message || 'could not read saved requests'}`);
    }
  }, []);

  const sync = useCallback(async (force = false) => {
    if (activeSync) return activeSync;
    if (!navigator.onLine) return;

    activeSync = (async () => {
      setIsSyncing(true);
      let successCount = 0;
      let queue;
      try {
        queue = await getQueue();
      } catch (error) {
        setQueueError(`Offline storage is unavailable: ${error.message || 'could not read saved requests'}`);
        return;
      }

      for (const item of queue) {
        const activeUserId = userIdRef.current;
        if (!activeUserId || !item.ownerId || String(item.ownerId) !== String(activeUserId)) continue;
        if (item.status === 'failed') continue;
        if (!force && item.nextAttemptAt && item.nextAttemptAt > Date.now()) continue;

        try {
          const attemptCount = (item.attemptCount || 0) + 1;
          await updateQueueItem(item.id, {
            status: 'syncing',
            attemptCount,
            lastAttemptAt: Date.now(),
            lastError: null,
          });
          const send = accessToken => fetchWithTimeout(`${API_BASE}${item.url}`, {
            method: item.method,
            headers: {
              'Content-Type': 'application/json',
              ...(accessToken ? { Authorization: ['Bearer', accessToken].join(' ') } : {}),
            },
            body: item.body ? JSON.stringify(item.body) : undefined,
          });

          let response = await send(tokenRef.current);
          if (response.status === 401 && refreshTokenRef.current) {
            const refreshed = await fetchWithTimeout(`${API_BASE}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refresh_token: refreshTokenRef.current }),
            });
            if (refreshed.ok) {
              const credentials = await readResponseBody(refreshed);
              if (!credentials?.token) {
                await updateQueueItem(item.id, {
                  status: 'pending',
                  lastError: 'The session refresh response was invalid. Sign in again to sync.',
                });
                break;
              }
              dispatch(setCredentials(credentials));
              tokenRef.current = credentials?.token;
              refreshTokenRef.current = credentials?.refresh_token || refreshTokenRef.current;
              response = await send(tokenRef.current);
            } else {
              dispatch(logout());
              tokenRef.current = null;
              refreshTokenRef.current = null;
            }
          }

          if (response.ok) {
            await removeFromQueue(item.id);
            successCount++;
            continue;
          }

          const body = await readResponseBody(response);
          const message = getErrorMessage(body, response.status);
          if (response.status === 401) {
            dispatch(logout());
            tokenRef.current = null;
            refreshTokenRef.current = null;
            await updateQueueItem(item.id, {
              status: 'pending',
              attemptCount,
              lastError: 'Your session expired. Sign in with the account that created this order to sync it.',
            });
            break;
          }
          if (response.status === 408 || response.status === 429 || response.status >= 500) {
            const delay = Math.min(60_000, 1_000 * (2 ** Math.min(attemptCount - 1, 6)));
            await updateQueueItem(item.id, {
              status: 'pending',
              attemptCount,
              lastError: message,
              nextAttemptAt: Date.now() + delay,
            });
            if (navigator.onLine) {
              clearTimeout(retryTimerRef.current);
              retryTimerRef.current = setTimeout(() => sync(), delay);
            }
            break;
          }

          await updateQueueItem(item.id, {
            status: 'failed',
            attemptCount,
            lastError: message,
            nextAttemptAt: null,
          });
        } catch (error) {
          const attemptCount = (item.attemptCount || 0) + 1;
          const delay = Math.min(60_000, 1_000 * (2 ** Math.min(attemptCount - 1, 6)));
          try {
            await updateQueueItem(item.id, {
              status: 'pending',
              attemptCount,
              lastError: error.message || 'Network request failed',
              nextAttemptAt: Date.now() + delay,
            });
          } catch (queueUpdateError) {
            setQueueError(`Could not update the offline queue: ${queueUpdateError.message}`);
          }
          if (navigator.onLine) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = setTimeout(() => sync(), delay);
          }
          break;
        }
      }

      await refreshQueue();
      if (successCount > 0) {
        dispatch(baseApi.util.invalidateTags([
          'Invoice', 'SalesOrder', 'CustomerReturn', 'Stock', 'LoadingSheet',
        ]));
        toast.success(`${successCount} offline record${successCount > 1 ? 's' : ''} synced`);
      }
    })().finally(() => {
      activeSync = null;
      setIsSyncing(false);
    });

    return activeSync;
  }, [dispatch, refreshQueue]);

  const retryQueueItem = useCallback(async id => {
    await updateQueueItem(id, {
      status: 'pending',
      attemptCount: 0,
      lastError: null,
      nextAttemptAt: null,
    });
    await refreshQueue();
    return sync(true);
  }, [refreshQueue, sync]);

  const discardQueueItem = useCallback(async id => {
    await removeFromQueue(id);
    await refreshQueue();
  }, [refreshQueue]);

  const claimQueueItem = useCallback(async id => {
    if (!userIdRef.current) throw new Error('Sign in before assigning a saved request to this account');
    await updateQueueItem(id, { ownerId: userIdRef.current });
    await refreshQueue();
    return sync(true);
  }, [refreshQueue, sync]);

  useEffect(() => {
    refreshQueue();
    const handleQueueChange = () => refreshQueue();
    const handleOnline = () => {
      setIsOnline(true);
      setTimeout(() => sync(), 1500);
    };
    const handleOffline = () => setIsOnline(false);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) sync();
    };
    window.addEventListener(QUEUE_CHANGED_EVENT, handleQueueChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener(QUEUE_CHANGED_EVENT, handleQueueChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearTimeout(retryTimerRef.current);
    };
  }, [refreshQueue, sync]);

  useEffect(() => {
    if (isOnline && currentUser?.id) sync();
  }, [isOnline, currentUser?.id, sync]);

  const currentUserId = currentUser?.id;
  const visibleItems = queueItems.filter(item => item.ownerId && String(item.ownerId) === String(currentUserId));
  const pendingCount = visibleItems.filter(item => item.status !== 'failed').length;
  const failedCount = visibleItems.filter(item => item.status === 'failed').length;
  const retryingCount = visibleItems.filter(item => item.status !== 'failed' && item.lastError).length;
  const unassignedCount = queueItems.filter(item => !item.ownerId).length;
  const otherAccountCount = queueItems.length - visibleItems.length - unassignedCount;

  return {
    isOnline,
    pendingCount,
    failedCount,
    retryingCount,
    otherAccountCount,
    unassignedCount,
    queueItems,
    sync,
    isSyncing,
    queueError,
    refreshQueue,
    retryQueueItem,
    discardQueueItem,
    claimQueueItem,
  };
}
