// Which notification categories reach this user, and where they reach them.
//
// These toggles used to be a block of useState inside Settings that nothing
// read and nothing saved — flip a switch, leave the page, and it was gone. The
// preferences now live here, persisted per device the same way the theme is
// (see themeStore.js), so the panel on the Notifications page means something.
//
// Per device rather than per account on purpose: there is no preferences
// endpoint yet. When one lands, hydrate from it here and the UI needs no
// changes — only this file does.

const KEY = "ardena-notification-prefs";

export const NOTIFICATION_PREFS = [
  {
    key: "bookings",
    name: "Booking activity",
    desc: "New requests, confirmations and cancellations",
  },
  { key: "payments", name: "Payments", desc: "Prompts paid, failed or refunded" },
  {
    key: "verification",
    name: "Verification results",
    desc: "When a customer passes or fails a check",
  },
  {
    key: "documents",
    name: "Document expiry",
    desc: "Insurance and inspection reminders",
  },
  { key: "staff", name: "Staff changes", desc: "Invites accepted and roles changed" },
];

const DEFAULTS = {
  bookings: true,
  payments: true,
  verification: true,
  documents: true,
  staff: false,
};

function readSaved() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const saved = JSON.parse(raw);
    // Only keys we still ship survive a reload, so a renamed or dropped
    // category can't linger in storage and turn back up as a stray toggle.
    const out = { ...DEFAULTS };
    for (const p of NOTIFICATION_PREFS) {
      if (typeof saved?.[p.key] === "boolean") out[p.key] = saved[p.key];
    }
    return out;
  } catch {
    /* storage blocked or corrupt — the defaults are a fine answer */
    return DEFAULTS;
  }
}

let prefs = readSaved();
const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getPrefs() {
  return prefs;
}

export function setPref(key, on) {
  if (prefs[key] === on) return;
  prefs = { ...prefs, [key]: on };
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* the toggle still applies for this session */
  }
  listeners.forEach((fn) => fn());
}
