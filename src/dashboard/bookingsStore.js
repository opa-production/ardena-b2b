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

// Swap in the server's copy of one booking (after an edit), if it's listed.
export function replaceBooking(updated) {
  if (!updated?.ref || !bookings.some((b) => b.ref === updated.ref)) return;
  bookings = bookings.map((b) => (b.ref === updated.ref ? { ...b, ...updated } : b));
  emit();
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
  if (!iso) return "-";
  return FULL.format(new Date(`${iso}T00:00:00`));
}

// "2 Jul to 6 Jul 2026"
export function fmtRange(a, b) {
  return `${DAY_MONTH.format(new Date(`${a}T00:00:00`))} to ${FULL.format(new Date(`${b}T00:00:00`))}`;
}

export function rentalDays(a, b) {
  const ms = Date.parse(`${b}T00:00:00`) - Date.parse(`${a}T00:00:00`);
  return Math.max(1, Math.round(ms / 86400000));
}

// Today on this device's calendar. Not toISOString(), which is UTC: in
// Nairobi that is still yesterday until 3 a.m.
export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ---- hourly bookings ----
   A booking is billed by the day (pickup → dropoff, whole days) or by the
   hour (pickup + pickup_time, for `hours`). The server stores the price as
   `total`, which is what every screen shows; nothing here re-derives it from
   the rate except a row from before prices were stored. */

const WEEKDAY_DAY_MONTH = new Intl.DateTimeFormat("en-KE", { weekday: "short", day: "numeric", month: "short" });

const fmtKes = (n) => Number(n || 0).toLocaleString("en-KE");

export const isHourly = (b) => b?.billing_unit === "hour";

export function bookingTotal(b) {
  if (b?.total != null) return Number(b.total);
  return rentalDays(b.pickup, b.dropoff) * (Number(b.rate) || 0);
}

// "Tue 28 Oct"
export function fmtWeekday(iso) {
  if (!iso) return "-";
  return WEEKDAY_DAY_MONTH.format(new Date(`${iso}T00:00:00`)).replace(",", "");
}

/* When an hourly booking ends: { date, time }. Worked in UTC so the device's
   own timezone can't shift it; the times are Nairobi wall-clock either way. */
export function hourlyEnd(pickup, time, hours) {
  const [y, mo, d] = pickup.split("-").map(Number);
  const [h, m] = String(time).split(":").map(Number);
  const end = new Date(Date.UTC(y, mo - 1, d, h, m) + Number(hours) * 3600000);
  const pad = (n) => String(n).padStart(2, "0");
  return {
    date: `${end.getUTCFullYear()}-${pad(end.getUTCMonth() + 1)}-${pad(end.getUTCDate())}`,
    time: `${pad(end.getUTCHours())}:${pad(end.getUTCMinutes())}`,
  };
}

// "Tue 28 Oct, 08:30–16:30 (8 h)", or "28 Oct 20:00 → 29 Oct 08:00 (12 h)"
// past midnight. A daily booking reads "3 days".
export function fmtLength(b) {
  if (!isHourly(b)) {
    const days = rentalDays(b.pickup, b.dropoff);
    return `${days} day${days > 1 ? "s" : ""}`;
  }
  const end = b.dropoff_time
    ? { date: b.dropoff || b.pickup, time: b.dropoff_time }
    : hourlyEnd(b.pickup, b.pickup_time, b.hours);
  if (end.date === b.pickup) {
    return `${fmtWeekday(b.pickup)}, ${b.pickup_time}–${end.time} (${b.hours} h)`;
  }
  return `${DAY_MONTH.format(new Date(`${b.pickup}T00:00:00`))} ${b.pickup_time} → ${DAY_MONTH.format(
    new Date(`${end.date}T00:00:00`)
  )} ${end.time} (${b.hours} h)`;
}

// The short length for a table cell: "8 h" or "3 days".
export function shortLength(b) {
  if (isHourly(b)) return `${b.hours} h · ${b.pickup_time}–${b.dropoff_time || hourlyEnd(b.pickup, b.pickup_time, b.hours).time}`;
  const days = rentalDays(b.pickup, b.dropoff);
  return `${days} day${days > 1 ? "s" : ""}`;
}

/* ---- the price breakdown ----
   total = rental + charges − discount. The rental is length × the booking's
   rate (staff can change the rate per booking) or an agreed rental price;
   charges are lines staff name themselves ("Chauffeur", "Fuel", anything);
   the discount carries its own reason. The server sends all of it. */

// The rental part of the price. Older rows without `rental_amount`: the total.
export function rentalAmount(b) {
  if (b?.rental_amount != null) return Number(b.rental_amount);
  return bookingTotal(b);
}

export const bookingCharges = (b) => (Array.isArray(b?.charges) ? b.charges : []);

// The rental differs from length × rate: an agreed rental price (or no hourly rate).
export function isAgreedPrice(b) {
  if (b?.total == null) return false;
  const byRate = isHourly(b)
    ? b.hourly_rate
      ? b.hourly_rate * b.hours
      : null
    : rentalDays(b.pickup, b.dropoff) * (Number(b.rate) || 0);
  return byRate === null || rentalAmount(b) !== byRate;
}

/* Every line of the price, in order, for details, receipt and agreement:
   [{ label, amount }], the discount as a negative amount. */
export function priceLines(b) {
  let rentalLabel;
  if (isAgreedPrice(b)) rentalLabel = "Rental, agreed price";
  else if (isHourly(b)) rentalLabel = `${b.hours} h × KES ${fmtKes(b.hourly_rate)}/h`;
  else {
    const days = rentalDays(b.pickup, b.dropoff);
    rentalLabel = `${days} day${days > 1 ? "s" : ""} × KES ${fmtKes(b.rate)}/day`;
  }
  const lines = [{ label: rentalLabel, amount: rentalAmount(b) }];
  bookingCharges(b).forEach((c) => lines.push({ label: c.label, amount: Number(c.amount) }));
  if (Number(b?.discount) > 0) {
    lines.push({
      label: b.discount_reason ? `Discount (${b.discount_reason})` : "Discount",
      amount: -Number(b.discount),
    });
  }
  return lines;
}

// "−KES 1,000" / "KES 2,500"
export const fmtLineAmount = (n) => `${n < 0 ? "−" : ""}KES ${fmtKes(Math.abs(n))}`;

// "KES 900/h" or "KES 9,500/day". An hourly booking on a car with no hourly
// rate was priced by hand, so it has no rate to show.
export function rateLabel(b) {
  if (isHourly(b)) return b.hourly_rate ? `KES ${fmtKes(b.hourly_rate)}/h` : "Agreed price";
  return `KES ${fmtKes(b.rate)}/day`;
}


/* Status → chip class, shared by every screen that shows a booking's state.
   These lived in Bookings.jsx, which meant Booking details, Client details and
   the payments list each imported a whole page module, and, once the routes
   were code-split, dragged that page's chunk along with it, for two lookup
   tables. */
export const STATUS_CHIP = {
  Pending: "pending",
  Confirmed: "confirmed",
  Active: "active",
  Completed: "completed",
  Cancelled: "cancelled",
};

export const PAY_CHIP = {
  Paid: "active",
  "Prompt sent": "pending",
  Unpaid: "completed",
  Refunded: "cancelled",
  Failed: "cancelled",
};

/* Row numbers as the API lists bookings, so a booking keeps the same number on
   the overview and on All bookings. */
export function bookingNumbers(list) {
  const m = new Map();
  list.forEach((b, i) => m.set(b.ref, i + 1));
  return m;
}

/* Newest booking first, by creation date; same-day bookings keep API order. */
export function latestFirst(list) {
  return list
    .map((b, i) => [b, i])
    .sort(([a, ai], [b, bi]) => String(b.created || "").localeCompare(String(a.created || "")) || ai - bi)
    .map(([b]) => b);
}
