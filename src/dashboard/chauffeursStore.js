// Chauffeur (driver) roster. A large share of Kenyan rentals go out with a
// driver, so this manages the people, their licence/compliance dates, live
// duty status, current assignment and trip history. Kept on the device until a
// drivers endpoint ships; seeded with a few examples on first run so the module
// is explorable end-to-end.

const KEY = "ardena-chauffeurs";

export const CH_STATUSES = ["Available", "On trip", "Off duty"];

export const CH_CHIP = {
  Available: "active",
  "On trip": "confirmed",
  "Off duty": "completed",
};

const SEED = [
  {
    id: "CHF-1001",
    name: "James Mwangi",
    phone: "0712 345 678",
    email: "james.mwangi@example.com",
    id_no: "28451190",
    licence_no: "DLB0492187",
    licence_expiry: "2027-04-18",
    daily_rate: 2500,
    status: "On trip",
    rating: 4.8,
    trips: 63,
    joined: "2025-02-11",
    notes: "Fluent English & Swahili. Preferred for airport runs.",
    assignment: {
      booking_ref: "BK-1005",
      customer: "Deon Orina",
      vehicle: "Nissan Note",
      plate: "KCK 673M",
      from: "2026-07-13",
      to: "2026-07-14",
    },
    history: [
      { id: "T-3011", date: "2026-06-28", customer: "Grace Achieng", vehicle: "Toyota Prado", route: "JKIA → Karen", amount: 6000, rating: 5 },
      { id: "T-2984", date: "2026-06-15", customer: "Safari Tours Ltd", vehicle: "Toyota Prado", route: "Nairobi → Nakuru", amount: 12500, rating: 5 },
      { id: "T-2960", date: "2026-06-02", customer: "Peter Kamau", vehicle: "Nissan Note", route: "CBD → Westlands", amount: 3500, rating: 4 },
    ],
  },
  {
    id: "CHF-1002",
    name: "Alice Wanjiru",
    phone: "0723 998 112",
    email: "alice.w@example.com",
    id_no: "31220984",
    licence_no: "DLA1180043",
    licence_expiry: "2026-08-30",
    daily_rate: 2800,
    status: "Available",
    rating: 4.9,
    trips: 41,
    joined: "2025-05-20",
    notes: "Defensive-driving certified. Great with corporate clients.",
    assignment: null,
    history: [
      { id: "T-2901", date: "2026-05-30", customer: "Equity Bank", vehicle: "Mercedes E-Class", route: "Full-day executive", amount: 15000, rating: 5 },
      { id: "T-2877", date: "2026-05-12", customer: "Jane Muthoni", vehicle: "Toyota Axio", route: "Nairobi → Naivasha", amount: 9000, rating: 5 },
    ],
  },
  {
    id: "CHF-1003",
    name: "Brian Otieno",
    phone: "0701 445 776",
    email: "",
    id_no: "29984551",
    licence_no: "DLC0033921",
    licence_expiry: "2026-07-25",
    daily_rate: 2200,
    status: "Off duty",
    rating: 4.5,
    trips: 28,
    joined: "2025-08-03",
    notes: "Licence renewal due soon — remind before next assignment.",
    assignment: null,
    history: [
      { id: "T-2840", date: "2026-04-27", customer: "Coast Safaris", vehicle: "Toyota Hiace", route: "Nairobi → Mombasa", amount: 22000, rating: 4 },
    ],
  },
];

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return null;
}

const loaded = load();
let chauffeurs = loaded || SEED;

const listeners = new Set();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(chauffeurs));
  } catch {
    /* ignore */
  }
}

function emit() {
  listeners.forEach((fn) => fn());
}

if (!loaded) persist(); // write the seed on first run

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getChauffeurs() {
  return chauffeurs;
}

export function getChauffeur(id) {
  return chauffeurs.find((c) => c.id === id) || null;
}

function nextId() {
  const max = chauffeurs.reduce((m, c) => {
    const n = parseInt(String(c.id).replace(/\D/g, ""), 10);
    return Number.isNaN(n) ? m : Math.max(m, n);
  }, 1000);
  return `CHF-${max + 1}`;
}

export function addChauffeur(data) {
  const c = {
    id: nextId(),
    rating: 0,
    trips: 0,
    joined: new Date().toISOString().slice(0, 10),
    assignment: null,
    history: [],
    ...data,
  };
  chauffeurs = [c, ...chauffeurs];
  persist();
  emit();
  return c;
}

export function updateChauffeur(id, patch) {
  chauffeurs = chauffeurs.map((c) => (c.id === id ? { ...c, ...patch } : c));
  persist();
  emit();
}

export function removeChauffeur(id) {
  chauffeurs = chauffeurs.filter((c) => c.id !== id);
  persist();
  emit();
}

// wipe on session change so a new login doesn't inherit the previous roster
export function resetChauffeurs() {
  chauffeurs = load() || SEED;
  emit();
}

/* ---- helpers ---- */

const FMT = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric" });

export function fmtDay(iso) {
  if (!iso) return "—";
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
