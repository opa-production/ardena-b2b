// Onboarding checklist state. Steps flip to done when the real action
// happens anywhere in the app (stores call markStep), and progress
// survives reloads. Cached per tab, like the session it belongs to (see
// tabStorage).
import { tabGet, tabSet, tabRemove } from "../lib/tabStorage";

const KEY = "ardena-onboarding";

const DEFAULTS = {
  vehicle: false,
  booking: false,
  prompt: false,
  verify: false,
  team: false,
  dismissed: false,
  // From the server: null until the workspace first sees the checklist.
  // `undefined` means not loaded yet, so nothing shows before we know.
  seenAt: undefined,
};

/* The checklist shows in the session where it is first seen, and never after.
   Held in memory, so it lasts while this tab is open and ends with it. */
let shownThisSession = false;

export function isShownThisSession() {
  return shownThisSession;
}

export function markShownThisSession() {
  shownThisSession = true;
}

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

export function getOnboarding() {
  return state;
}

// Wipe cached progress (called on login/logout so one account's checklist
// never leaks into another's session).
export function resetOnboarding() {
  state = { ...DEFAULTS };
  shownThisSession = false;
  tabRemove(KEY);
  emit();
}

// Merge server state (GET /onboarding) into the checklist. Only known step
// keys are taken; `dismissed` stays a local preference. The backend may call
// the invite step "staff", the UI calls it "team".
export function hydrateOnboarding(server) {
  if (!server || typeof server !== "object") return;
  const next = { ...state };
  for (const key of ["vehicle", "booking", "prompt", "verify", "team"]) {
    if (typeof server[key] === "boolean") next[key] = server[key];
  }
  if (typeof server.staff === "boolean") next.team = server.staff;
  next.seenAt = server.seen_at ?? null;
  state = next;
  persist();
  emit();
}

export function markStep(step) {
  if (state[step]) return;
  state = { ...state, [step]: true };
  persist();
  emit();
}

export function dismissOnboarding() {
  state = { ...state, dismissed: true };
  persist();
  emit();
}
