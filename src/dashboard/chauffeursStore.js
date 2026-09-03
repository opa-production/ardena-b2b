// Chauffeur (driver) roster, backed by the live chauffeurs API (b2b.md §C).
// A large share of Kenyan rentals go out with a driver, so this manages the
// people, their licence/compliance dates, duty status, current assignment and
// trip history. DashboardLayout hydrates the roster once per session; mutations
// call the API first, then update the local list so every subscriber stays in
// sync. `rating`/`trips`/`assignment` are computed/derived server-side.
import {
  fetchChauffeurs,
  createChauffeur,
  updateChauffeur as apiUpdateChauffeur,
  deleteChauffeur as apiDeleteChauffeur,
  setChauffeurStatus as apiSetChauffeurStatus,
  assignChauffeur as apiAssignChauffeur,
  unassignChauffeur as apiUnassignChauffeur,
} from "../lib/api";

export const CH_STATUSES = ["Available", "On trip", "Off duty"];

export const CH_CHIP = {
  Available: "active",
  "On trip": "confirmed",
  "Off duty": "completed",
};

let chauffeurs = [];
let loaded = false; // first successful GET /chauffeurs has landed

const listeners = new Set();

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// The API already sends the mock-era shape (id, name, rating, trips, joined,
// assignment, history…); just guarantee the arrays/nulls callers read.
function normalize(c) {
  return {
    rating: 0,
    trips: 0,
    assignment: null,
    history: [],
    ...c,
  };
}

export function getChauffeurs() {
  return chauffeurs;
}

export function isChauffeursLoaded() {
  return loaded;
}

export function getChauffeur(id) {
  return chauffeurs.find((c) => c.id === id) || null;
}

// One fetch at a time; every caller waits on the same request.
let hydrating = null;

export function hydrateChauffeurs() {
  if (!hydrating) {
    hydrating = (async () => {
      const data = await fetchChauffeurs({ per_page: 100 });
      const list = Array.isArray(data) ? data : data?.data || [];
      chauffeurs = list.map(normalize);
      loaded = true;
      emit();
    })().finally(() => {
      hydrating = null;
    });
  }
  return hydrating;
}

// Wipe on session change so a new login doesn't inherit the previous roster.
export function resetChauffeurs() {
  chauffeurs = [];
  loaded = false;
  emit();
}

function replace(updated) {
  const c = normalize(updated);
  chauffeurs = chauffeurs.map((x) => (x.id === c.id ? c : x));
  emit();
  return c;
}

export async function addChauffeur(data) {
  const created = normalize(await createChauffeur(data));
  chauffeurs = [created, ...chauffeurs];
  emit();
  return created;
}

export async function updateChauffeur(id, patch) {
  return replace(await apiUpdateChauffeur(id, patch));
}

export async function removeChauffeur(id) {
  await apiDeleteChauffeur(id);
  chauffeurs = chauffeurs.filter((c) => c.id !== id);
  emit();
}

export async function setChauffeurStatus(id, status) {
  return replace(await apiSetChauffeurStatus(id, status));
}

export async function assignChauffeur(id, bookingRef) {
  return replace(await apiAssignChauffeur(id, bookingRef));
}

export async function unassignChauffeur(id) {
  return replace(await apiUnassignChauffeur(id));
}

/* ---- helpers ---- */

const FMT = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric" });

export function fmtDay(iso) {
  if (!iso) return "-";
  const d = new Date(iso.length > 10 ? iso : `${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : FMT.format(d);
}

// days until an ISO date; negative if already past
export function daysUntil(iso) {
  if (!iso) return null;
  const t = Date.parse(iso.length > 10 ? iso : `${iso}T00:00:00`);
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86400000);
}

export function licenceState(iso) {
  const d = daysUntil(iso);
  if (d === null) return null;
  if (d < 0) return { label: "Licence expired", tone: "danger" };
  if (d <= 30) return { label: `Licence expires in ${d}d`, tone: "warn" };
  return null;
}
