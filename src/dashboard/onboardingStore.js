// Onboarding checklist state. Steps flip to done when the real action
// happens anywhere in the app (stores call markStep), and progress
// survives reloads via localStorage.

const KEY = "ardena-onboarding";

const DEFAULTS = {
  vehicle: false,
  booking: false,
  prompt: false,
  verify: false,
  team: false,
  dismissed: false,
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

export function getOnboarding() {
  return state;
}

// Wipe cached progress (called on login/logout so one account's checklist
// never leaks into another's session).
export function resetOnboarding() {
  state = { ...DEFAULTS };
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  emit();
}

// Merge server state (GET /onboarding) into the checklist. Only known step
// keys are taken; `dismissed` stays a local preference. The backend may call
// the invite step "staff" — the UI calls it "team".
export function hydrateOnboarding(server) {
  if (!server || typeof server !== "object") return;
  const next = { ...state };
  for (const key of ["vehicle", "booking", "prompt", "verify", "team"]) {
    if (typeof server[key] === "boolean") next[key] = server[key];
  }
  if (typeof server.staff === "boolean") next.team = server.staff;
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
