/* Stellar pilot: is it here, who is signed in to it, and what does the
 * business have?
 *
 * Two ways the pilot runs (see STELLAR_SPLIT in lib/api.js):
 *
 *   Same backend   the Stellar endpoints sit on the dashboard's own API. The
 *                  pages only show once a probe finds them, so a backend
 *                  without them looks exactly as before.
 *
 *   Pilot backend  the endpoints live on a separate pilot API (staging). It
 *                  has its own accounts, so the pages are always in the nav
 *                  and ask for a pilot sign-in first. Per-booking pieces
 *                  (the escrow checkbox, escrow and waiver cards) stay off:
 *                  a booking made here doesn't exist on the pilot backend.
 *
 * Probes, once signed in (or always, on the same backend):
 *   wallet  GET /stellar-wallet   200 = a wallet, a 404 that names the wallet
 *                                 = none yet, bare "Not Found" = no route
 *   claims  GET /waiver-claims    200 = the console exists (+ badge counts)
 */
import { fetchStellarWallet, fetchWaiverClaims } from "../lib/api";
import { STELLAR_SPLIT } from "../lib/stellarConfig";
import { STELLAR } from "../lib/features";
import { roleCan } from "../hooks/useRole";
import { getSession } from "../lib/authStore";

const POLL_MS = 60_000;
const PILOT_KEY = "ardena-stellar-pilot";

/* ---- The pilot session (pilot backend only) ---- */

function readPilot() {
  try {
    return JSON.parse(localStorage.getItem(PILOT_KEY) || "null");
  } catch {
    return null;
  }
}

let pilot = readPilot();

export function getPilotSession() {
  return pilot;
}

export function setPilotSession(patch) {
  pilot = { ...(pilot || {}), ...patch };
  try {
    localStorage.setItem(PILOT_KEY, JSON.stringify(pilot));
  } catch {
    /* storage blocked: the session lasts this tab */
  }
  set({ signedIn: Boolean(pilot?.token) });
}

export function clearPilotSession() {
  pilot = null;
  try {
    localStorage.removeItem(PILOT_KEY);
  } catch {
    /* ignore */
  }
  set({ signedIn: false, wallet: "unknown", walletData: null, claimCounts: null });
}

/* ---- State ---- */

const EMPTY = {
  split: STELLAR_SPLIT,
  signedIn: !STELLAR_SPLIT || Boolean(pilot?.token),
  // "unknown" until the first probe lands, then "off" | "none" | "ready"
  wallet: "unknown",
  walletData: null,
  claims: "unknown", // "unknown" | "off" | "ready"
  claimCounts: null,
};

let state = EMPTY;
const listeners = new Set();
let ticker = null;
let inFlight = null;

function set(patch) {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn());
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getStellar() {
  return state;
}

/** The dashboard session changed hands: forget the pilot sign-in too, so the
 *  next person on this browser never inherits it. */
export function resetStellar() {
  pilot = null;
  try {
    localStorage.removeItem(PILOT_KEY);
  } catch {
    /* ignore */
  }
  state = { ...EMPTY, signedIn: !STELLAR_SPLIT };
  listeners.forEach((fn) => fn());
}

/** Role checks for Stellar actions. On the pilot backend the pilot account's
 *  role is the one that counts, since that backend enforces it. */
export function stellarCan(capability) {
  const role = STELLAR_SPLIT ? pilot?.user?.role : getSession().user?.role;
  return roleCan(role, capability);
}

/** Booking-level pilot pieces (escrow checkbox, escrow/waiver cards) only
 *  make sense when bookings and Stellar share one backend. */
export const STELLAR_BOOKINGS = STELLAR && !STELLAR_SPLIT;

/** FastAPI's own 404 for a path it has no route for, as opposed to a 404 an
 *  endpoint raises on purpose ("No Stellar wallet yet"). */
export function isMissingRoute(err) {
  return err?.status === 404 && (err?.data?.detail === "Not Found" || !err?.data);
}

/** Whether an error means "this pilot endpoint isn't here", hide quietly. */
export function isUnavailable(err) {
  return isMissingRoute(err) || err?.status === 0 || err?.status >= 500 || !err?.status;
}

/** A 401 from the pilot backend: show the pilot sign-in. */
export function needsPilotSignIn(err) {
  return STELLAR_SPLIT && err?.status === 401;
}

async function probeWallet() {
  try {
    const w = await fetchStellarWallet();
    set({ wallet: w ? "ready" : "none", walletData: w || null });
  } catch (err) {
    if (err?.status === 404 && !isMissingRoute(err)) set({ wallet: "none", walletData: null });
    else set({ wallet: "off", walletData: null });
  }
}

async function probeClaims() {
  try {
    const res = await fetchWaiverClaims({ page: 1, limit: 1 });
    set({ claims: "ready", claimCounts: res?.counts || null });
  } catch (err) {
    set({ claims: err?.status === 403 ? "ready" : "off", claimCounts: null });
  }
}

/** Probe both areas once. Overlapping calls share the one in flight. */
export function refreshStellar() {
  if (!STELLAR || (STELLAR_SPLIT && !pilot?.token)) return Promise.resolve();
  if (!inFlight) {
    inFlight = Promise.allSettled([probeWallet(), probeClaims()]).finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

/** Just the wallet, after creating it, sending, or topping up. */
export function refreshStellarWallet() {
  if (!STELLAR || (STELLAR_SPLIT && !pilot?.token)) return Promise.resolve();
  return probeWallet();
}

/** Start the shared 60 s poll (the claims badge). Returns a stop function. */
export function startStellarPolling() {
  if (!STELLAR) return () => {};
  refreshStellar();
  if (ticker) return () => {};
  ticker = setInterval(() => {
    if (!document.hidden) refreshStellar();
  }, POLL_MS);
  return () => {
    clearInterval(ticker);
    ticker = null;
  };
}
