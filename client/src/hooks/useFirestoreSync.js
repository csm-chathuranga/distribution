import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db } from '../firebase';
import { baseApi } from '../api/baseApi';
import { selectCurrentUser } from '../store/authSlice';

const TYPE_CONFIG = {
  NEW_ORDER:      { icon: '🛒', invalidate: ['SalesOrder'] },
  ORDER_APPROVED: { icon: '✅', invalidate: ['SalesOrder'] },
};

export function useFirestoreSync() {
  const dispatch = useDispatch();
  const user     = useSelector(selectCurrentUser);
  const skipFirst = useRef(true);

  useEffect(() => {
    if (!db || !user?.id) return;

    const roleName   = user?.Role?.name;
    const recipients = [`user:${user.id}`];
    if (roleName) recipients.push(`role:${roleName}`);

    const q = query(
      collection(db, 'notifications'),
      where('recipients', 'array-contains-any', recipients)
    );

    skipFirst.current = true;

    const unsub = onSnapshot(q, (snap) => {
      // First snapshot contains all historical docs — skip it
      if (skipFirst.current) {
        skipFirst.current = false;
        return;
      }

      snap.docChanges().forEach(change => {
        if (change.type !== 'added') return;
        const data = change.doc.data();
        const cfg  = TYPE_CONFIG[data.type];

        toast(`${data.title}${data.body ? ': ' + data.body : ''}`, {
          icon:     cfg?.icon || '🔔',
          duration: 6000,
          style:    { fontSize: '14px', maxWidth: '340px' },
        });

        if (cfg?.invalidate) {
          dispatch(baseApi.util.invalidateTags(cfg.invalidate));
        }
      });
    }, (err) => {
      console.warn('[FirestoreSync]', err.message);
    });

    return () => unsub();
  }, [user?.id, user?.Role?.name, dispatch]);
}
