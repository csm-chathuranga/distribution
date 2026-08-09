import { useLocationTracking } from '../hooks/useLocationTracking';

// Mounts the GPS tracking hook for sales reps — renders nothing
export default function LocationTracker() {
  useLocationTracking();
  return null;
}
