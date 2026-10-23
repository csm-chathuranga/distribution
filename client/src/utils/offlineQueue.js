const DB_NAME = 'lankadist-offline';
const STORE = 'queue';
const QUEUE_CHANGED_EVENT = 'offline-queue-change';

function notifyQueueChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(QUEUE_CHANGED_EVENT));
  }
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

export async function enqueueRequest(item) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({
      status: 'pending',
      attemptCount: 0,
      timestamp: Date.now(),
      ...item,
    });
    tx.oncomplete = () => {
      notifyQueueChanged();
      resolve();
    };
    tx.onerror = e => reject(e.target.error);
  });
}

export async function getQueue() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = e => resolve((e.target.result || []).sort((a, b) => a.timestamp - b.timestamp));
    req.onerror = e => reject(e.target.error);
  });
}

export async function updateQueueItem(id, changes) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const request = store.get(id);
    request.onsuccess = () => {
      if (!request.result) {
        tx.abort();
        reject(new Error(`Offline queue item not found: ${id}`));
        return;
      }
      store.put({ ...request.result, ...changes, id });
    };
    request.onerror = e => reject(e.target.error);
    tx.oncomplete = () => {
      notifyQueueChanged();
      resolve();
    };
    tx.onerror = e => reject(e.target.error);
  });
}

export async function removeFromQueue(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => {
      notifyQueueChanged();
      resolve();
    };
    tx.onerror = e => reject(e.target.error);
  });
}

export { QUEUE_CHANGED_EVENT };
