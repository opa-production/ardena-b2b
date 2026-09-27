// Session state: tokens plus the signed-in user and their business.
// Persisted to localStorage so a refresh keeps you signed in.

const KEY = "ardena-session";

const DEFAULTS = { token: null, refreshToken: null, user: null, business: null };

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* private mode etc., run in-memory */
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

export function getSession() {
  return state;
}

export function isAuthed() {
  return Boolean(state.token);
}

export function setSession(next) {
  state = { ...state, ...next };
  persist();
  emit();
}

export function clearSession() {
  state = { ...DEFAULTS };
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  emit();
}
