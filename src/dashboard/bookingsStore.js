// In-memory bookings store, same pattern as fleetStore. Pages subscribe via
// useSyncExternalStore, so create/status actions reflect everywhere until the
// bookings API replaces this (docs/backend-api.md §4).
// Lifecycle: Pending → Confirmed → Active → Completed, or Cancelled early.
// depositStatus: Pending (not yet collected) → Held → Refunded / Forfeited.
// handover.out is recorded at pickup, handover.in at return.
import { markStep } from "./onboardingStore";

let bookings = [];

let nextRef = 1001;

const listeners = new Set();

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* Replace the whole list. The Bookings page should call this after its fetch
   so the onboarding checklist reflects real rows. Currently unused. */
export function hydrateBookings(list) {
  bookings = Array.isArray(list) ? list : [];
  emit();
}

export function getBookings() {
  return bookings;
}

export function getBooking(ref) {
  return bookings.find((b) => b.ref === ref);
}

export function addBooking(b) {
  const ref = `BK-${nextRef++}`;
  bookings = [
    {
      ref,
      status: "Pending",
      payment: "Unpaid",
      verification: "Pending",
      notes: "",
      depositStatus: "Pending",
      handover: { out: null, in: null },
      ...b,
    },
    ...bookings,
  ];
  markStep("booking");
  emit();
  return ref;
}

export function setStatus(ref, status) {
  bookings = bookings.map((b) =>
    b.ref === ref
      ? {
          ...b,
          status,
          payment: status === "Cancelled" && b.payment === "Paid" ? "Refunded" : b.payment,
          depositStatus:
            status === "Active" && b.depositStatus === "Pending" ? "Held" : b.depositStatus,
        }
      : b
  );
  emit();
}

export function setDepositStatus(ref, depositStatus) {
  bookings = bookings.map((b) => (b.ref === ref ? { ...b, depositStatus } : b));
  emit();
}

export function recordCheckOut(ref, out) {
  bookings = bookings.map((b) =>
    b.ref === ref ? { ...b, handover: { ...b.handover, out } } : b
  );
  emit();
}

export function recordCheckIn(ref, inn) {
  bookings = bookings.map((b) =>
    b.ref === ref ? { ...b, handover: { ...b.handover, in: inn } } : b
  );
  emit();
}

export function setPayment(ref, payment) {
  bookings = bookings.map((b) => (b.ref === ref ? { ...b, payment } : b));
  if (payment === "Prompt sent") markStep("prompt");
  emit();
}

// what the primary action on a booking does next, per lifecycle
export const NEXT_STEP = {
  Pending: { label: "Confirm booking", to: "Confirmed" },
  Confirmed: { label: "Start rental", to: "Active" },
  Active: { label: "Mark completed", to: "Completed" },
};

export const CANCELLABLE = ["Pending", "Confirmed"];

/* ---- date helpers (bookings store ISO dates) ---- */

const DAY_MONTH = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short" });
const FULL = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric" });

export function fmtDate(iso) {
  if (!iso) return "—";
  return FULL.format(new Date(`${iso}T00:00:00`));
}

// "2 Jul – 6 Jul 2026"
export function fmtRange(a, b) {
  return `${DAY_MONTH.format(new Date(`${a}T00:00:00`))} – ${FULL.format(new Date(`${b}T00:00:00`))}`;
}

export function rentalDays(a, b) {
  const ms = Date.parse(`${b}T00:00:00`) - Date.parse(`${a}T00:00:00`);
  return Math.max(1, Math.round(ms / 86400000));
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
