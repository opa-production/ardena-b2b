// Vehicle GPS / telematics, kept on the device until a telematics endpoint
// ships. Trackers attach to a vehicle by number plate; the fleet list itself
// comes from the live fleet store, and this overlays live location on top.
//
// With no real hardware wired up, a lightweight simulator nudges "moving"
// trackers every few seconds so the map and list feel live. Swapping this for a
// real provider webhook later means replacing the ticker with pushed pings.

const KEY = "ardena-trackers";

// Nairobi-ish provider names + a rough city centre to scatter trackers around.
export const PROVIDERS = ["Ardena GPS", "Fahari Track", "Track24 Kenya", "Cartrack", "Generic OBD-II"];
const CENTER = { lat: -1.286389, lng: 36.817223 };
const AREAS = ["Westlands", "Kilimani", "Karen", "CBD", "Ruaka", "Lang'ata", "Embakasi", "Parklands", "Kasarani", "Ngong Road"];

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return {};
}

let store = load();
const listeners = new Set();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

function emit() {
  listeners.forEach((fn) => fn());
}

export function getTrackers() {
  return store;
}

export function getTracker(plate) {
  return store[plate] || null;
}

const rnd = (spread) => (Math.random() - 0.5) * spread;

// deterministic-ish area label from a coordinate so it reads like geocoding
function areaFor(lat, lng) {
  const i = Math.abs(Math.round((lat + lng) * 1000)) % AREAS.length;
  return AREAS[i];
}

function fmtCoord(lat, lng) {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export function subscribe(fn) {
  listeners.add(fn);
  startTicker();
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0) stopTicker();
  };
}

export function connectTracker(plate, { provider, deviceId }) {
  const lat = CENTER.lat + rnd(0.14);
  const lng = CENTER.lng + rnd(0.14);
  const moving = Math.random() > 0.5;
  const now = new Date().toISOString();
  store = {
    ...store,
    [plate]: {
      plate,
      provider,
      deviceId: deviceId || `IMEI-${Math.floor(1e9 + Math.random() * 9e9)}`,
      connectedAt: now,
      status: moving ? "moving" : "parked",
      lat,
      lng,
      speed: moving ? Math.round(20 + Math.random() * 60) : 0,
      ignition: moving,
      lastPing: now,
      address: areaFor(lat, lng),
      trail: [{ lat, lng, at: now, speed: moving ? 40 : 0 }],
    },
  };
  persist();
  emit();
}

export function disconnectTracker(plate) {
  const next = { ...store };
  delete next[plate];
  store = next;
  persist();
  emit();
}

/* ---- live simulation ---- */

let ticker = null;

function tick() {
  const plates = Object.keys(store);
  if (!plates.length) return;
  const now = new Date().toISOString();
  let changed = false;

  const next = { ...store };
  for (const plate of plates) {
    const t = next[plate];
    if (t.status === "offline") continue;

    // small chance a parked car pulls off, or a moving one stops
    let status = t.status;
    if (Math.random() < 0.15) status = status === "moving" ? "parked" : "moving";

    if (status === "moving") {
      const lat = t.lat + rnd(0.006);
      const lng = t.lng + rnd(0.006);
      const speed = Math.round(15 + Math.random() * 70);
      const trail = [...(t.trail || []), { lat, lng, at: now, speed }].slice(-12);
      next[plate] = { ...t, status, lat, lng, speed, ignition: true, lastPing: now, address: areaFor(lat, lng), trail };
    } else {
      next[plate] = { ...t, status, speed: 0, ignition: false, lastPing: now };
    }
    changed = true;
  }

  if (changed) {
    store = next;
    persist();
    emit();
  }
}

function startTicker() {
  if (ticker || typeof window === "undefined") return;
  ticker = setInterval(tick, 5000);
}

function stopTicker() {
  if (ticker) {
    clearInterval(ticker);
    ticker = null;
  }
}

/* ---- display helpers ---- */

export const TRACK_CHIP = {
  moving: "active",
  parked: "pending",
  offline: "completed",
};

export function relativeTime(iso) {
  if (!iso) return "—";
  const secs = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 10) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
  return `${Math.round(hrs / 24)} d ago`;
}

export function mapsUrl(lat, lng) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export { fmtCoord };
