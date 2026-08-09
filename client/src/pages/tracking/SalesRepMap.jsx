import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { collection, onSnapshot, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { MapPin, RefreshCw, Navigation, Clock, Route } from 'lucide-react';

// Relative time helper
function timeAgo(ts) {
  if (!ts) return 'unknown';
  const ms  = ts.toMillis ? ts.toMillis() : Number(ts) * 1000;
  const sec = Math.floor((Date.now() - ms) / 1000);
  if (sec < 60)  return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  return `${Math.floor(sec / 3600)}h ago`;
}

function isStale(ts) {
  if (!ts) return true;
  const ms = ts.toMillis ? ts.toMillis() : Number(ts) * 1000;
  return Date.now() - ms > 30 * 60 * 1000; // > 30 min = stale
}

// Custom colored marker
function makeIcon(color) {
  return L.divIcon({
    html: `<div style="
      width:18px;height:18px;border-radius:50%;
      background:${color};border:3px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.4);
    "></div>`,
    className: '',
    iconSize:   [18, 18],
    iconAnchor: [9,  9],
    popupAnchor:[0, -12],
  });
}

const ACTIVE_COLOR = '#22c55e';
const STALE_COLOR  = '#f59e0b';

// Fly to first rep when locations change
function FlyToReps({ reps }) {
  const map = useMap();
  useEffect(() => {
    if (!reps.length) return;
    const bounds = L.latLngBounds(reps.map(r => [r.lat, r.lng]));
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
  }, [reps.length]);
  return null;
}

export default function SalesRepMap() {
  const [locations, setLocations] = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [trails,    setTrails]    = useState({});   // { userId: [[lat,lng], ...] }
  const [tick, setTick] = useState(0);

  // Re-render every 30s so "X min ago" stays fresh
  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  // Firestore real-time listener for active locations
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'locations'), where('active', '==', true));
    const unsub = onSnapshot(q, snap => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLocations(rows);
    }, () => {});
    return unsub;
  }, []);

  // Fetch 3-hour trail when a rep is selected
  useEffect(() => {
    if (!selected || !db) return;
    if (trails[selected.id]) return; // already loaded

    const cutoff = Timestamp.fromMillis(Date.now() - 3 * 60 * 60 * 1000);
    const q = query(
      collection(db, 'locations', selected.id, 'trail'),
      where('ts', '>', cutoff),
      orderBy('ts', 'asc'),
    );
    getDocs(q).then(snap => {
      const pts = snap.docs.map(d => [d.data().lat, d.data().lng]);
      setTrails(prev => ({ ...prev, [selected.id]: pts }));
    }).catch(() => {});
  }, [selected?.id]);

  const SRI_LANKA = [7.8731, 80.7718];

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] -mx-6 -mt-6">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between flex-shrink-0 z-10">
        <div className="flex items-center gap-2.5">
          <Navigation size={18} className="text-primary-600" />
          <h1 className="text-base font-bold text-gray-900">Sales Rep Tracking</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <RefreshCw size={11} /> Live
          </span>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Active
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> Stale (&gt;30m)
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — rep list */}
        <div className="w-72 flex-shrink-0 bg-white border-r border-gray-100 overflow-y-auto">
          {locations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2 p-6">
              <MapPin size={36} className="opacity-30" />
              <p className="text-sm font-medium">No active reps</p>
              <p className="text-xs text-center">Sales reps appear here when they have an active loaded van.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {locations.map(rep => {
                const stale = isStale(rep.updated_at);
                const active = selected?.id === rep.id;
                return (
                  <button
                    key={rep.id}
                    onClick={() => setSelected(active ? null : rep)}
                    className={`w-full text-left px-4 py-3.5 hover:bg-gray-50 transition-colors ${active ? 'bg-primary-50 border-l-2 border-primary-500' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${stale ? 'bg-amber-400' : 'bg-green-500'}`} />
                        <p className="text-sm font-semibold text-gray-800 truncate">{rep.name}</p>
                      </div>
                      <span className="text-[10px] text-gray-400 flex-shrink-0 flex items-center gap-0.5">
                        <Clock size={10} /> {timeAgo(rep.updated_at)}
                      </span>
                    </div>
                    {rep.sheet_number && (
                      <p className="text-xs text-gray-500 mt-0.5 pl-5">{rep.sheet_number}</p>
                    )}
                    {rep.accuracy && (
                      <p className="text-[10px] text-gray-400 mt-0.5 pl-5">±{Math.round(rep.accuracy)}m accuracy</p>
                    )}
                    {active && trails[rep.id] !== undefined && (
                      <p className="text-[10px] text-indigo-500 mt-0.5 pl-5 flex items-center gap-1">
                        <Route size={9} /> {trails[rep.id].length} trail points (3h)
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <MapContainer
            center={SRI_LANKA}
            zoom={8}
            style={{ width: '100%', height: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
            />

            {locations.length > 0 && <FlyToReps reps={locations} />}

            {/* Trail polyline for selected rep */}
            {selected && trails[selected.id]?.length > 1 && (
              <>
                {/* Dashed route line */}
                <Polyline
                  positions={trails[selected.id]}
                  color="#6366f1"
                  weight={3}
                  opacity={0.75}
                  dashArray="8 5"
                />
                {/* Start dot */}
                <Marker
                  position={trails[selected.id][0]}
                  icon={L.divIcon({
                    html: '<div style="width:10px;height:10px;border-radius:50%;background:#6366f1;border:2px solid white;opacity:0.6"></div>',
                    className: '', iconSize: [10,10], iconAnchor: [5,5],
                  })}
                />
              </>
            )}

            {locations.map(rep => (
              <Marker
                key={rep.id}
                position={[rep.lat, rep.lng]}
                icon={makeIcon(isStale(rep.updated_at) ? STALE_COLOR : ACTIVE_COLOR)}
                eventHandlers={{ click: () => setSelected(rep) }}
              >
                <Popup>
                  <div className="text-sm min-w-[160px]">
                    <p className="font-bold text-gray-900 mb-1">{rep.name}</p>
                    {rep.sheet_number && <p className="text-gray-600 text-xs mb-0.5">Sheet: {rep.sheet_number}</p>}
                    <p className="text-gray-500 text-xs flex items-center gap-1">
                      <Clock size={10} /> {timeAgo(rep.updated_at)}
                    </p>
                    {rep.accuracy && <p className="text-gray-400 text-xs mt-0.5">±{Math.round(rep.accuracy)}m</p>}
                    {trails[rep.id]?.length > 1 && (
                      <p className="text-indigo-500 text-xs mt-0.5 flex items-center gap-1">
                        <Route size={10} /> {trails[rep.id].length} stops recorded
                      </p>
                    )}
                    <a
                      href={`https://www.google.com/maps?q=${rep.lat},${rep.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block mt-2 text-xs text-blue-600 underline"
                    >
                      Open in Google Maps
                    </a>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* No GPS note */}
          {locations.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-lg text-center">
                <MapPin size={28} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600">No reps are currently tracked</p>
                <p className="text-xs text-gray-400 mt-1">Tracking starts when a sales rep has an active loaded van</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
