// Handover condition photos, kept per booking on the device until the backend
// grows a photo-upload endpoint (docs/backend-api.md §4). Bookings themselves
// are server-backed, but the images live here so damage-dispute evidence is
// captured end-to-end in the UI today. Shape: { [bookingRef]: { out:[], inn:[] } }
// where each entry is { id, url (compressed data URL), at (ISO) }.

const KEY = "ardena-handover-photos";
const MAX_PER_PHASE = 8;

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* private mode / corrupt — start empty */
  }
  return {};
}

let store = load();
const listeners = new Set();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
    return true;
  } catch {
    return false; // quota exceeded, most likely
  }
}

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// A stable empty shape so callers can always read .out / .inn
const EMPTY = { out: [], inn: [] };

export function getPhotos(ref) {
  return store[ref] || EMPTY;
}

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

// phase: "out" (check-out) | "inn" (check-in)
export function addPhotos(ref, phase, urls) {
  const current = store[ref] || { out: [], inn: [] };
  const additions = urls.map((url) => ({ id: uid(), url, at: new Date().toISOString() }));
  const next = {
    ...current,
    [phase]: [...current[phase], ...additions].slice(0, MAX_PER_PHASE),
  };
  store = { ...store, [ref]: next };
  const ok = persist();
  emit();
  return ok;
}

export function removePhoto(ref, phase, id) {
  const current = store[ref];
  if (!current) return;
  const next = { ...current, [phase]: current[phase].filter((p) => p.id !== id) };
  store = { ...store, [ref]: next };
  persist();
  emit();
}

// Downscale + re-encode so a handful of phone photos comfortably fit in
// localStorage. Returns a JPEG data URL. Falls back to the raw data URL if the
// canvas pipeline is unavailable.
export function compressImage(file, maxEdge = 1000, quality = 0.6) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read the image."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file isn't a valid image."));
      img.onload = () => {
        try {
          const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", quality));
        } catch {
          resolve(reader.result); // last resort: store the original
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
