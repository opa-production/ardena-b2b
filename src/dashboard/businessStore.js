// Business profile. Shared by the sidebar avatar and Settings, hydrated from
// GET /business and cached in localStorage so a reload paints instantly.

const KEY = "ardena-business";

const DEFAULTS = {
  id: null,
  name: "",
  phone: "",
  email: "",
  location: "",
  logo: null,
  trustSlug: null,
  verifiedSince: null,
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* private mode etc. — run in-memory */
  }
  return { ...DEFAULTS };
}

let state = load();

const listeners = new Set();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getBusiness() {
  return state;
}

export function setBusiness(next) {
  state = { ...state, ...next };
  persist();
  emit();
}

// Wipe the cached profile (called on login/logout so one account's
// details never leak into another's session).
export function resetBusiness() {
  state = { ...DEFAULTS };
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  emit();
}

// Merge the GET /business response (snake_case) into the store.
export function hydrateBusiness(server) {
  if (!server || typeof server !== "object") return;
  const next = { ...state };
  if (server.id != null) next.id = server.id;
  if (server.name) next.name = server.name;
  if (server.phone != null) next.phone = server.phone;
  if (server.email != null) next.email = server.email;
  if (server.location != null) next.location = server.location;
  if (server.logo_url) next.logo = server.logo_url;
  if (server.trust_slug != null) next.trustSlug = server.trust_slug;
  if (server.verified_since != null) next.verifiedSince = server.verified_since;
  state = next;
  persist();
  emit();
}

// First letter for the fallback avatar
export function businessInitial(name) {
  return (name || "A").trim().charAt(0).toUpperCase();
}
