// Session state: tokens plus the signed-in user and their business.
// Kept per tab (see tabStorage): a refresh keeps you signed in, another tab
// can be signed in as someone else, and closing the tab ends the session.
import { tabGet, tabSet, tabRemove } from "./tabStorage";

const KEY = "ardena-session";

const DEFAULTS = { token: null, refreshToken: null, user: null, business: null };

function load() {
  try {
    const raw = tabGet(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* unreadable, start clean */
  }
  return { ...DEFAULTS };
}

let state = load();

const listeners = new Set();

function persist() {
  tabSet(KEY, JSON.stringify(state));
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
  tabRemove(KEY);
  emit();
}
