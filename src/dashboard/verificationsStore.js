// Walk-in renter verification, backed by the live KYC API (docs/backend-api.md
// §6). The renter is present in person, so there's no selfie/liveness widget:
// staff type a National ID, Driver's Licence or KRA PIN and the backend proxies
// Dojah, debiting a flat price per lookup from a prepaid wallet.
//
// Numbers are masked server-side in the history; session lookups are masked
// here from the number staff typed (the API never returns the raw number back).
import {
  verificationLookup,
  fetchLookups,
  fetchWallet,
  topupWallet,
  checkTopupStatus,
} from "../lib/api";
import { markStep } from "./onboardingStore";

export const CHECK_PRICE = 100; // KES, fallback until the wallet API reports it

export const LOOKUP_TYPES = ["National ID", "Driver's Licence", "KRA PIN"];

export const STATUS_CHIP = {
  Verified: "active",
  "Not found": "cancelled",
  Mismatch: "pending",
};

// UI labels <-> API slugs
const TYPE_SLUG = {
  "National ID": "national_id",
  "Driver's Licence": "drivers_licence",
  "KRA PIN": "kra_pin",
};
const SLUG_LABEL = {
  national_id: "National ID",
  drivers_licence: "Driver's Licence",
  kra_pin: "KRA PIN",
};

let state = {
  wallet: { balance: 0, checkPrice: CHECK_PRICE },
  lookups: [], // { id, customer, idType, idNumber (masked), status, ref, date }
  walletLoaded: false,
  lookupsLoaded: false,
};

const listeners = new Set();

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getState() {
  return state;
}

function set(patch) {
  state = { ...state, ...patch };
  emit();
}

export function resetVerification() {
  state = {
    wallet: { balance: 0, checkPrice: CHECK_PRICE },
    lookups: [],
    walletLoaded: false,
    lookupsLoaded: false,
  };
  emit();
}

// show the first 2 and last 2 characters, mask the middle (privacy)
export function maskNumber(n) {
  const s = String(n);
  if (s.length <= 4) return s;
  return `${s.slice(0, 2)}${"•".repeat(Math.max(3, s.length - 4))}${s.slice(-2)}`;
}

// API dates may be full ISO timestamps; fmtDate wants a bare "YYYY-MM-DD"
function toDay(value) {
  return typeof value === "string" ? value.slice(0, 10) : "";
}

// Map a GET /lookups row (numbers already masked) to the UI shape
function normalizeHistory(r) {
  return {
    id: r.id,
    customer: r.customer,
    idType: SLUG_LABEL[r.id_type] || r.id_type,
    idNumber: r.id_number_masked,
    status: r.status,
    ref: r.booking_ref || null,
    date: toDay(r.date),
  };
}

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

/* ---- hydration ---- */

export async function hydrateWallet() {
  const w = await fetchWallet();
  set({
    wallet: {
      balance: Number(w.balance) || 0,
      checkPrice: Number(w.check_price) || CHECK_PRICE,
    },
    walletLoaded: true,
  });
}

export async function hydrateLookups() {
  const res = await fetchLookups({ per_page: 100 });
  const rows = Array.isArray(res) ? res : res?.data || [];
  set({ lookups: rows.map(normalizeHistory), lookupsLoaded: true });
}

// wallet + history together, for the Verification screen
export function hydrateVerification() {
  return Promise.all([hydrateWallet().catch(() => {}), hydrateLookups().catch(() => {})]);
}

/* ---- actions ---- */

// Run a lookup. Returns { status, entity, fullName } for the result card.
// Throws ApiError (e.g. insufficient wallet balance) for the caller to surface.
export async function runLookup({ type, number, clientId, bookingRef }) {
  const res = await verificationLookup(
    {
      type: TYPE_SLUG[type] || type,
      number: String(number).trim(),
      client_id: clientId ?? undefined,
      booking_ref: bookingRef ?? undefined,
    },
    uid()
  );

  const entity = res.entity || null;
  const fullName = entity
    ? [entity.first_name, entity.middle_name, entity.last_name].filter(Boolean).join(" ")
    : "Unknown";

  const record = {
    id: res.id,
    customer: fullName,
    idType: type,
    idNumber: maskNumber(String(number).trim()),
    status: res.status,
    ref: bookingRef || null,
    date: toDay(res.date) || new Date().toISOString().slice(0, 10),
  };

  set({
    lookups: [record, ...state.lookups],
    wallet:
      res.wallet_balance != null
        ? { ...state.wallet, balance: Number(res.wallet_balance) }
        : state.wallet,
  });
  markStep("verify"); // the server flips it too; this keeps the checklist instant

  return { status: res.status, entity, fullName, charged: res.charged };
}

// Start a wallet top-up: { amount, method: "mpesa" | "card", phone? }.
// Returns { reference, checkout_url, ... } — card gives a URL, M-Pesa an STK push.
export function startTopup(payload) {
  return topupWallet(payload, uid());
}

export async function verifyTopup(reference) {
  const res = await checkTopupStatus(reference);
  if (res?.status && /success|paid|complete/i.test(res.status)) {
    await hydrateWallet().catch(() => {});
  }
  return res;
}
