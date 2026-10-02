// Per-tab storage for everything that belongs to the signed-in account: the
// session itself and the account data cached beside it.
//
// It is sessionStorage, not localStorage, on purpose. localStorage is one
// bucket for every tab on the site, so signing in as a second account in
// another tab replaced the first tab's session underneath it, and the first
// tab came back from a reload as the other person. Here each tab holds its own
// sign-in, it survives a reload, and it is gone when the tab closes, so
// tokens are not left behind on a shared computer either.
//
// The cost: a new tab starts signed out.

/* Sessions used to live in localStorage. The first tab to load after that
   change takes the old value over, so nobody is signed out by the upgrade,
   and removes it from localStorage so no token is left sitting there. */
function adoptLegacy(key) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return null;
    localStorage.removeItem(key);
    sessionStorage.setItem(key, raw);
    return raw;
  } catch {
    return null;
  }
}

// The stored string, or null. Throws nothing: private mode etc. run in-memory.
export function tabGet(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (raw != null) return raw;
  } catch {
    return null;
  }
  return adoptLegacy(key);
}

export function tabSet(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function tabRemove(key) {
  try {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key); // a legacy copy nobody adopted yet
  } catch {
    /* ignore */
  }
}
