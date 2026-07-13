import { useEffect, useRef } from "react";

// Real satellite map for the tracking card. Mapbox GL is heavy, so it's loaded
// on demand (kept out of the main bundle). Set a token in VITE_MAPBOX_TOKEN;
// without one we fall back to the lightweight schematic below so the page still
// works. Free tier: mapbox.com → Account → Access tokens.
const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const STATUS_COLOR = { moving: "#12b76a", parked: "#f5a623", offline: "#8b929d" };

function lineGeoJSON(trail) {
  return {
    type: "Feature",
    geometry: { type: "LineString", coordinates: trail.map((p) => [p.lng, p.lat]) },
  };
}

// Schematic fallback: project the ping trail into a padded viewBox with a
// pulsing marker. No tiles, no token — used when VITE_MAPBOX_TOKEN is unset.
function Schematic({ trail }) {
  const pts = trail && trail.length ? trail : [];
  if (!pts.length) return <div className="map-face map-empty">Waiting for first ping…</div>;

  const lats = pts.map((p) => p.lat);
  const lngs = pts.map((p) => p.lng);
  let minLat = Math.min(...lats), maxLat = Math.max(...lats);
  let minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const padLat = (maxLat - minLat) || 0.01;
  const padLng = (maxLng - minLng) || 0.01;
  minLat -= padLat * 0.4; maxLat += padLat * 0.4;
  minLng -= padLng * 0.4; maxLng += padLng * 0.4;

  const W = 100, H = 62, M = 12;
  const px = (lng) => M + ((lng - minLng) / (maxLng - minLng)) * (W - 2 * M);
  const py = (lat) => M + ((maxLat - lat) / (maxLat - minLat)) * (H - 2 * M);

  const line = pts.map((p) => `${px(p.lng).toFixed(1)},${py(p.lat).toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  const cx = px(last.lng), cy = py(last.lat);

  return (
    <div className="map-face">
      <svg viewBox={`0 0 ${W} ${H}`} className="map-svg" preserveAspectRatio="xMidYMid slice">
        {[...Array(9)].map((_, i) => (
          <line key={`v${i}`} x1={(i + 1) * 10} y1="0" x2={(i + 1) * 10} y2={H} className="map-grid" />
        ))}
        {[...Array(5)].map((_, i) => (
          <line key={`h${i}`} x1="0" y1={(i + 1) * 10} x2={W} y2={(i + 1) * 10} className="map-grid" />
        ))}
        {pts.length > 1 && <polyline points={line} className="map-trail" />}
        <circle cx={cx} cy={cy} r="4.5" className="map-ping" />
        <circle cx={cx} cy={cy} r="2.4" className="map-dot" />
      </svg>
    </div>
  );
}

export default function LiveMap({ trail = [], status = "parked" }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const readyRef = useRef(false);

  const hasPoint = trail.length > 0;
  const last = hasPoint ? trail[trail.length - 1] : null;

  // Initialise the map once we have a token, a container and a first fix.
  useEffect(() => {
    if (!TOKEN || !hasPoint || mapRef.current || !containerRef.current) return;
    let cancelled = false;

    (async () => {
      const gl = (await import("mapbox-gl")).default;
      await import("mapbox-gl/dist/mapbox-gl.css");
      if (cancelled || !containerRef.current) return;

      gl.accessToken = TOKEN;
      const map = new gl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/satellite-streets-v12",
        center: [last.lng, last.lat],
        zoom: 14,
        attributionControl: false,
        cooperativeGestures: true,
      });
      mapRef.current = map;
      map.addControl(new gl.NavigationControl({ showCompass: false }), "top-right");
      map.addControl(new gl.AttributionControl({ compact: true }));

      const el = document.createElement("div");
      el.className = "gps-marker";
      el.style.setProperty("--gps", STATUS_COLOR[status] || STATUS_COLOR.parked);
      markerRef.current = new gl.Marker({ element: el }).setLngLat([last.lng, last.lat]).addTo(map);

      map.on("load", () => {
        if (cancelled) return;
        map.addSource("trail", { type: "geojson", data: lineGeoJSON(trail) });
        map.addLayer({
          id: "trail-line",
          type: "line",
          source: "trail",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#7fd9ff", "line-width": 3, "line-opacity": 0.9 },
        });
        readyRef.current = true;
        map.resize();
      });
    })();

    return () => {
      cancelled = true;
      readyRef.current = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
    };
    // Re-run only when the first fix arrives; live updates are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPoint]);

  // Live updates: slide the marker, extend the trail, ease the camera.
  useEffect(() => {
    if (!TOKEN || !last) return;
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    marker.setLngLat([last.lng, last.lat]);
    marker.getElement().style.setProperty("--gps", STATUS_COLOR[status] || STATUS_COLOR.parked);
    if (readyRef.current && map.getSource("trail")) {
      map.getSource("trail").setData(lineGeoJSON(trail));
    }
    map.easeTo({ center: [last.lng, last.lat], duration: 1200 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trail, status]);

  if (!TOKEN) {
    return (
      <>
        <Schematic trail={trail} />
        <p className="map-note">
          Showing a schematic view. Add a Mapbox token in <code>VITE_MAPBOX_TOKEN</code> to see the live satellite map.
        </p>
      </>
    );
  }

  return <div className="map-face live-map" ref={containerRef} />;
}
