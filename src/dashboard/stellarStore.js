/* Stellar pilot: is it here, and what does the business have?
 *
 * The pilot ships to some backends before others, so the dashboard asks
 * rather than assumes. One probe per area:
 *
 *   wallet  GET /stellar-wallet   200 = a wallet, a 404 that names the wallet
 *                                 = none yet, FastAPI's bare "Not Found" = the
 *                                 route isn't deployed here
 *   claims  GET /waiver-claims    200 = the console exists (and its counts
 *                                 feed the sidebar badge)
 *
 * Anything that doesn't come back as one of those, an unknown route, a 5xx, a
 * network failure, reads as "not available" and the matching UI stays hidden.
 * The dashboard then looks exactly as it did before the pilot. A later poll
 * that succeeds brings it in without a reload.
 *
 * Same shape as the other stores: module state, a listener set, and
 * useSyncExternalStore on the components.
 */
import { fetchStellarWallet, fetchWaiverClaims } from "../lib/api";
import { STELLAR } from "../lib/features";

const POLL_MS = 60_000;

const EMPTY = {
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

export function resetStellar() {
  state = EMPTY;
  listeners.forEach((fn) => fn());
}

/** FastAPI's own 404 for a path it has no route for, as opposed to a 404 an
 *  endpoint raises on purpose ("No Stellar wallet yet"). */
export function isMissingRoute(err) {
  return err?.status === 404 && (err?.data?.detail === "Not Found" || !err?.data);
}

/** Whether an error means "this pilot endpoint isn't here", hide quietly. */
export function isUnavailable(err) {
  return isMissingRoute(err) || err?.status === 0 || err?.status >= 500 || !err?.status;
}

async function probeWallet() {
  try {
    const w = await fetchStellarWallet();
    set({ wallet: w ? "ready" : "none", walletData: w || null });
  } catch (err) {
    if (err?.status === 404 && !isMissingRoute(err)) set({ wallet: "none", walletData: null });
    // A 403 means the role can't see it; anything else, not available here.
    else set({ wallet: "off", walletData: null });
  }
}

async function probeClaims() {
  try {
    const res = await fetchWaiverClaims({ page: 1, limit: 1 });
    set({ claims: "ready", claimCounts: res?.counts || null });
  } catch (err) {
    // A role that can't list them still has the feature; it just has no badge.
    set({ claims: err?.status === 403 ? "ready" : "off", claimCounts: null });
  }
}

/** Probe both areas once. Overlapping calls share the one in flight. */
export function refreshStellar() {
  if (!STELLAR) return Promise.resolve();
  if (!inFlight) {
    inFlight = Promise.allSettled([probeWallet(), probeClaims()]).finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

/** Just the wallet, after creating it, sending, or topping up. */
export function refreshStellarWallet() {
  if (!STELLAR) return Promise.resolve();
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
