// Vehicle GPS / telematics, backed by the live tracking API (b2b.md §D).
// Trackers attach to a vehicle by number plate; the fleet list itself comes from
// the fleet store, and this overlays live location on top. Real location arrives
// via the provider webhook on the backend; the dashboard polls GET /tracking
// while the tracking screens are open so the map and list stay live.
import {
  fetchTrackers,
  connectTracker as apiConnectTracker,
  disconnectTracker as apiDisconnectTracker,
} from "../lib/api";

// Providers offered in the connect dialog (label list is client-side).
export const PROVIDERS = ["Ardena GPS", "Fahari Track", "Track24 Kenya", "Cartrack", "Generic OBD-II"];

const POLL_MS = 12000; // refresh cadence while the screens are open

let store = {}; // keyed by plate
const listeners = new Set();

function emit() {
  listeners.forEach((fn) => fn());
}

// API sends snake_case; the UI reads camelCase. Trail items already match
// ({ lat, lng, at, speed }). lat/lng can be null until the first ping lands.
function normalize(t) {
  return {
    plate: t.plate,
    provider: t.provider,
    deviceId: t.device_id ?? t.deviceId ?? "",
    connectedAt: t.connected_at ?? t.connectedAt ?? null,
    status: t.status || "offline",
    lat: t.lat ?? null,
    lng: t.lng ?? null,
    speed: t.speed ?? 0,
    ignition: !!t.ignition,
    lastPing: t.last_ping ?? t.lastPing ?? null,
    address: t.address ?? "",
    trail: Array.isArray(t.trail) ? t.trail : [],
  };
}

function indexByPlate(list) {
  const next = {};
  for (const t of list) next[t.plate] = normalize(t);
  return next;
}

export function getTrackers() {
  return store;
}

export function getTracker(plate) {
  return store[plate] || null;
}

// One fetch at a time; every caller waits on the same request.
let hydrating = null;

export function hydrateTracking() {
  if (!hydrating) {
    hydrating = (async () => {
      const data = await fetchTrackers();
      const list = Array.isArray(data) ? data : data?.data || [];
      store = indexByPlate(list);
      emit();
    })().finally(() => {
      hydrating = null;
    });
  }
  return hydrating;
}

// Wipe on session change so a new login doesn't inherit the previous trackers.
export function resetTracking() {
  store = {};
  emit();
}

export async function connectTracker(plate, { provider, deviceId } = {}) {
  const t = await apiConnectTracker(plate, {
    provider,
    device_id: deviceId || undefined,
  });
  store = { ...store, [plate]: normalize(t) };
  emit();
}

export async function disconnectTracker(plate) {
  await apiDisconnectTracker(plate);
  const next = { ...store };
  delete next[plate];
  store = next;
  emit();
}

/* ---- live polling ---- */

let ticker = null;

async function poll() {
  try {
    const data = await fetchTrackers();
    const list = Array.isArray(data) ? data : data?.data || [];
    store = indexByPlate(list);
    emit();
  } catch {
    /* keep the last good snapshot */
  }
}

export function subscribe(fn) {
  listeners.add(fn);
  startTicker();
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0) stopTicker();
  };
}

function startTicker() {
  if (ticker || typeof window === "undefined") return;
  ticker = setInterval(poll, POLL_MS);
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
  if (!iso) return "-";
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
  if (lat == null || lng == null) return "https://www.google.com/maps";
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

// null-safe: a freshly connected tracker has no fix until its first ping
export function fmtCoord(lat, lng) {
  if (lat == null || lng == null) return "-";
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
