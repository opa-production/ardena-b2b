// Fleet store, backed by the live fleet API (docs/backend-api.md §3).
// Pages subscribe via useSyncExternalStore; DashboardLayout hydrates the list
// once per session, and add/delete call the API first, then update the local
// list so every subscriber stays in sync.
import {
  fetchVehicles,
  createVehicle,
  deleteVehicle as apiDeleteVehicle,
} from "../lib/api";
import { markStep } from "./onboardingStore";

let vehicles = [];
let loaded = false; // first successful GET /vehicles has landed

const listeners = new Set();

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getVehicles() {
  return vehicles;
}

export function isFleetLoaded() {
  return loaded;
}

export function getVehicle(plate) {
  return vehicles.find((v) => v.plate === plate);
}

// The API sends ISO dates and backend-computed `utilisation`; the UI keeps
// the mock-era shape (display dates, `util`).
function normalize(v) {
  return {
    notes: "",
    ...v,
    rate: Number(v.rate) || 0,
    util: Math.round(Number(v.utilisation ?? v.util) || 0),
    ins: toDisplayDate(v.ins),
    inspection: toDisplayDate(v.inspection),
    added: toDisplayDate(v.added ?? v.created_at),
  };
}

// One fetch at a time; every caller waits on the same request.
let hydrating = null;

export function hydrateFleet() {
  if (!hydrating) {
    hydrating = (async () => {
      const data = await fetchVehicles({ per_page: 100 });
      const list = Array.isArray(data) ? data : data?.data || [];
      vehicles = list.map(normalize);
      loaded = true;
      emit();
    })().finally(() => {
      hydrating = null;
    });
  }
  return hydrating;
}

// Wipe the list when the session changes hands (login/logout).
export function resetFleet() {
  vehicles = [];
  loaded = false;
  emit();
}

export async function addVehicle(v) {
  const created = await createVehicle(v);
  vehicles = [normalize({ ...v, ...(created?.data ?? created ?? {}) }), ...vehicles];
  markStep("vehicle"); // the server flips it too; this keeps the checklist instant
  emit();
}

export async function removeVehicle(plate) {
  await apiDeleteVehicle(plate);
  vehicles = vehicles.filter((v) => v.plate !== plate);
  emit();
}

/* ---- date helpers ---- */

const FMT = new Intl.DateTimeFormat("en-KE", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

// "2026-08-12" (date input) -> "12 Aug 2026"
export function formatDateInput(iso) {
  if (!iso) return "";
  return FMT.format(new Date(`${iso}T00:00:00`));
}

// ISO from the API ("2026-08-12" or a full timestamp) -> "12 Aug 2026";
// anything else (already a display string) passes through untouched.
function toDisplayDate(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const d = new Date(value.length > 10 ? value : `${value}T00:00:00`);
    if (!Number.isNaN(d.getTime())) return FMT.format(d);
  }
  return value;
}

// days from today until a display date like "12 Jul 2026"; null if unparsable
export function daysUntil(display) {
  const t = Date.parse(display);
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86400000);
}

// warn threshold shared by table + details
export function expiringSoon(display) {
  const d = daysUntil(display);
  return d !== null && d >= 0 && d <= 30 ? d : null;
}
