import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { selectCurrentUser } from '../store/authSlice';
import { db } from '../firebase';
import { useGetActiveSheetQuery } from '../api/salesApi';

export function useLocationTracking() {
  const user      = useSelector(selectCurrentUser);
  const isSalesRep = user?.Role?.name === 'sales_rep';
  const watchRef      = useRef(null);
  const lastTrailRef  = useRef(0);
  const TRAIL_MIN_MS  = 60_000; // write to trail at most once per minute

  const { data: activeSheet } = useGetActiveSheetQuery(undefined, {
    skip: !isSalesRep,
    refetchOnMountOrArgChange: true,
  });

  const isActive = isSalesRep && !!activeSheet;

  useEffect(() => {
    if (!isActive || !db || !user) return;

    const docRef = doc(db, 'locations', String(user.id));

    const trailRef = collection(docRef, 'trail');

    const write = (lat, lng, accuracy) => {
      // Update current position (overwrites single doc)
      setDoc(docRef, {
        user_id:      user.id,
        name:         user.name,
        role:         user.Role?.name,
        lat,
        lng,
        accuracy:     accuracy ?? null,
        updated_at:   serverTimestamp(),
        sheet_id:     activeSheet.id,
        sheet_number: activeSheet.sheet_number,
        active:       true,
      }).catch(() => {});

      // Append to trail subcollection at most once per minute
      const now = Date.now();
      if (now - lastTrailRef.current >= TRAIL_MIN_MS) {
        lastTrailRef.current = now;
        addDoc(trailRef, { lat, lng, accuracy: accuracy ?? null, ts: serverTimestamp() }).catch(() => {});
      }
    };

    let cancelled = false;

    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');

        if (Capacitor.isNativePlatform()) {
          const { Geolocation } = await import('@capacitor/geolocation');
          const perms = await Geolocation.requestPermissions();
          if (cancelled || perms.location !== 'granted') return;

          const id = await Geolocation.watchPosition(
            { enableHighAccuracy: true, timeout: 15000 },
            (pos, err) => {
              if (!err && pos) write(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
            },
          );

          if (cancelled) {
            Geolocation.clearWatch({ id }).catch(() => {});
          } else {
            watchRef.current = { type: 'native', id };
          }
        } else if (!cancelled && navigator?.geolocation) {
          const startWatch = () => {
            if (cancelled) return;
            const id = navigator.geolocation.watchPosition(
              pos => write(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
              () => {},
              { enableHighAccuracy: true, maximumAge: 30_000, timeout: 15_000 },
            );
            watchRef.current = { type: 'web', id };
          };

          // Only call watchPosition if permission is already granted.
          // If 'prompt', listen for the user to grant it rather than forcing the dialog.
          if (navigator.permissions) {
            const status = await navigator.permissions.query({ name: 'geolocation' });
            if (cancelled) return;
            if (status.state === 'granted') {
              startWatch();
            } else if (status.state === 'prompt') {
              // Don't force the dialog — wait until they grant it elsewhere or we can add a UI button
              const onChange = () => { if (status.state === 'granted') startWatch(); };
              status.addEventListener('change', onChange);
            }
            // 'denied' — do nothing silently
          } else {
            // Fallback for browsers without Permissions API
            startWatch();
          }
        }
      } catch (_) {}
    })();

    return () => {
      cancelled = true;
      const w = watchRef.current;
      watchRef.current = null;

      if (w?.type === 'web')    navigator.geolocation.clearWatch(w.id);
      if (w?.type === 'native') {
        import('@capacitor/geolocation').then(({ Geolocation }) =>
          Geolocation.clearWatch({ id: w.id }).catch(() => {}),
        );
      }

      // Mark inactive so manager map stops showing this rep
      setDoc(docRef, { active: false, updated_at: serverTimestamp() }, { merge: true }).catch(() => {});
    };
  }, [isActive, user?.id, activeSheet?.id]);
}
