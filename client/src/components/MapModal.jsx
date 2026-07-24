import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, ExternalLink, Navigation } from 'lucide-react';

export default function MapModal({ lat, lng, label, onClose }) {
  const containerRef  = useRef(null);
  const mapRef        = useRef(null);   // holds the L.Map instance
  const [routeInfo,   setRouteInfo]   = useState(null);
  const [status,      setStatus]      = useState('Detecting your location…');

  const dest = [parseFloat(lat), parseFloat(lng)];

  useEffect(() => {
    // Guard: only init once, and only when the container div is mounted
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, { center: dest, zoom: 13, zoomControl: true });
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // Destination pin (red)
    const destIcon = L.divIcon({
      html: `<svg viewBox="0 0 24 24" width="36" height="36" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
              fill="#ef4444" stroke="white" stroke-width="1.5"/>
        <circle cx="12" cy="9" r="2.5" fill="white"/>
      </svg>`,
      iconSize: [36, 36], iconAnchor: [18, 36], className: '',
    });
    L.marker(dest, { icon: destIcon })
      .addTo(map)
      .bindPopup(`<strong>${label || 'Destination'}</strong>`)
      .openPopup();

    // Geolocation
    if (!navigator.geolocation) {
      setStatus('Geolocation not supported — showing destination only');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const me = [pos.coords.latitude, pos.coords.longitude];

        // My location dot (blue)
        const myIcon = L.divIcon({
          html: `<div style="width:18px;height:18px;background:#3b82f6;border-radius:50%;
                             border:3px solid white;box-shadow:0 2px 8px rgba(59,130,246,.6)"></div>`,
          iconSize: [18, 18], iconAnchor: [9, 9], className: '',
        });
        L.marker(me, { icon: myIcon }).addTo(map).bindPopup('Your location');

        // Fit both markers in view
        map.fitBounds(L.latLngBounds([dest, me]), { padding: [60, 60], maxZoom: 15 });

        // OSRM driving route (free, no API key)
        setStatus('Calculating route…');
        const osrm = `https://router.project-osrm.org/route/v1/driving/` +
          `${pos.coords.longitude},${pos.coords.latitude};${lng},${lat}` +
          `?overview=full&geometries=geojson`;

        fetch(osrm)
          .then(r => r.json())
          .then(data => {
            if (data.routes?.[0]) {
              const r = data.routes[0];
              const coords = r.geometry.coordinates.map(([lo, la]) => [la, lo]);
              L.polyline(coords, { color: '#3b82f6', weight: 5, opacity: 0.85 }).addTo(map);
              setRouteInfo({
                distance: (r.distance / 1000).toFixed(1),
                duration: Math.round(r.duration / 60),
              });
              setStatus(null);
            } else {
              throw new Error('no route');
            }
          })
          .catch(() => {
            L.polyline([me, dest], { color: '#94a3b8', weight: 3, dashArray: '8 6' }).addTo(map);
            setStatus('Route unavailable — showing straight line');
          });
      },
      (err) => setStatus(`Location denied: ${err.message}`),
      { enableHighAccuracy: true, timeout: 10000 },
    );

    // Cleanup on unmount
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-gray-900">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
            <Navigation size={15} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-sm leading-tight">{label || 'Navigate to Location'}</p>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              {parseFloat(lat).toFixed(6)}, {parseFloat(lng).toFixed(6)}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-700 transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-[400] bg-white rounded-xl shadow-lg px-3 py-2 text-xs space-y-1.5 pointer-events-none">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-700">Destination</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-gray-700">Your location</span>
          </div>
        </div>
      </div>

      {/* Bottom panel — tall enough for thumb tap on phones */}
      <div className="bg-white px-4 pt-4 pb-safe flex flex-col gap-3 flex-shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            {routeInfo ? (
              <>
                <p className="font-bold text-gray-900 text-lg">
                  {routeInfo.distance} km &nbsp;·&nbsp; ~{routeInfo.duration} min
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Driving estimate via OpenStreetMap</p>
              </>
            ) : (
              <p className="text-sm text-gray-500 truncate">{status}</p>
            )}
          </div>
        </div>

        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-base py-4 rounded-2xl transition-colors mb-1"
        >
          <ExternalLink size={18} />
          Open in Google Maps
        </a>
      </div>
    </div>
  );
}
