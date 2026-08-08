/* Demo dataset: one plausible Kenyan car-rental business, generated fresh on
 * load so every date is relative to today and the dashboard never looks stale
 * in a recording made months from now.
 *
 * It is deliberately *coherent* — bookings point at real vehicles and clients,
 * payments point at real bookings, the overview KPIs are computed from the
 * same rows the tables show. A promo video falls apart the moment a viewer
 * notices the numbers don't add up.
 *
 * Nothing here touches the network. See demoApi.js for the routing layer.
 */

const DAY = 86_400_000;

const now = new Date();
const iso = (d) => new Date(d).toISOString();
const daysFromNow = (n) => new Date(now.getTime() + n * DAY);
const isoDay = (n) => iso(daysFromNow(n)).slice(0, 10);

/* Display dates match what fleetStore's normalize() produces: "12 Mar 2027" */
const displayDate = (n) =>
  daysFromNow(n).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export const BUSINESS = {
  id: 1,
  name: "Nuru Car Hire",
  phone: "0722 415 900",
  email: "bookings@nurucarhire.co.ke",
  location: "Westlands, Nairobi",
  logo_url: null,
  trust_slug: "nuru-car-hire",
  verified_since: isoDay(-420),
  app_linked: true,
  host_account_linked: true,
};

export const USER = {
  id: 1,
  name: "Wanjiru Kamau",
  email: "wanjiru@nurucarhire.co.ke",
  phone: "0722 415 900",
  role: "Owner",
  business_name: BUSINESS.name,
};

/* ---- Fleet ----
   A real Nairobi fleet: a couple of prestige units, workhorse SUVs, saloons
   for corporate hire, and a van. Utilisation and status are hand-set so the
   overview's utilisation KPI lands somewhere believable. */
export const VEHICLES = [
  { plate: "KDK 442X", name: "Toyota Land Cruiser V8", cat: "SUV", year: 2021, rate: 22000, status: "On booking", util: 84, ins: 96, inspection: 141, chassis: "JTMHV05J104112233" },
  { plate: "KDA 118Q", name: "Toyota Prado TX", cat: "SUV", year: 2020, rate: 15000, status: "On booking", util: 79, ins: 22, inspection: 210, chassis: "JTEBH9FJ0EK118220" },
  { plate: "KCX 907B", name: "Mercedes-Benz C200", cat: "Executive", year: 2019, rate: 13500, status: "Available", util: 61, ins: 174, inspection: 63, chassis: "WDD2050401R118904" },
  { plate: "KDG 556M", name: "Nissan X-Trail", cat: "SUV", year: 2020, rate: 9500, status: "On booking", util: 72, ins: 118, inspection: 9, chassis: "JN1TCNT32U0031885" },
  { plate: "KCP 233A", name: "Toyota Axio", cat: "Saloon", year: 2018, rate: 5500, status: "Available", util: 58, ins: 240, inspection: 187, chassis: "NZE1610093118442" },
  { plate: "KDD 771L", name: "Subaru Forester XT", cat: "SUV", year: 2019, rate: 8500, status: "Available", util: 47, ins: 61, inspection: 132, chassis: "SHJ5FB49E9G118773" },
  { plate: "KDB 690F", name: "Toyota Hiace 14-seater", cat: "Van", year: 2021, rate: 12000, status: "On booking", util: 88, ins: 152, inspection: 41, chassis: "JTFSX22P8M0118661" },
  { plate: "KCY 305J", name: "Toyota Harrier", cat: "SUV", year: 2020, rate: 11000, status: "In maintenance", util: 34, ins: 87, inspection: 96, chassis: "ZSU60W0118330" },
  { plate: "KDH 812R", name: "Mazda Demio", cat: "Compact", year: 2018, rate: 4000, status: "Available", util: 52, ins: 199, inspection: 155, chassis: "DJ3FS118812" },
  { plate: "KDE 027N", name: "Range Rover Vogue", cat: "Prestige", year: 2022, rate: 35000, status: "Available", util: 41, ins: 133, inspection: 228, chassis: "SALGA2AK8NA118027" },
].map((v) => ({
  plate: v.plate,
  name: v.name,
  category: v.cat,
  year: v.year,
  rate: v.rate,
  status: v.status,
  utilisation: v.util,
  ins: isoDay(v.ins),
  inspection: isoDay(v.inspection),
  added: isoDay(-320 + v.year % 7),
  chassis_no: v.chassis,
  notes: "",
  marketplace_listed: ["KDK 442X", "KDA 118Q", "KDE 027N", "KDG 556M"].includes(v.plate),
}));

/* ---- Clients ---- */
export const CLIENTS = [
  { id: 1, name: "David Ochieng", phone: "0721 884 210", email: "d.ochieng@gmail.com", bookings_count: 7, total_spend: 268000, verification: "verified" },
  { id: 2, name: "Amina Hassan", phone: "0733 512 908", email: "amina.h@outlook.com", bookings_count: 4, total_spend: 141500, verification: "verified" },
  { id: 3, name: "Brian Kiptoo", phone: "0710 447 336", email: "bkiptoo@safaricom.co.ke", bookings_count: 3, total_spend: 96000, verification: "verified" },
  { id: 4, name: "Grace Wairimu", phone: "0745 220 187", email: "grace.wairimu@gmail.com", bookings_count: 6, total_spend: 213000, verification: "verified" },
  { id: 5, name: "Samuel Mwangi", phone: "0729 663 041", email: "smwangi@kcbgroup.com", bookings_count: 2, total_spend: 58000, verification: "pending" },
  { id: 6, name: "Faith Njeri", phone: "0716 905 774", email: "faith.njeri@gmail.com", bookings_count: 5, total_spend: 176500, verification: "verified" },
  { id: 7, name: "Peter Otieno", phone: "0757 138 622", email: "p.otieno@equitybank.co.ke", bookings_count: 1, total_spend: 27000, verification: "verified" },
  { id: 8, name: "Mercy Chebet", phone: "0768 401 559", email: "mercychebet@gmail.com", bookings_count: 3, total_spend: 104000, verification: "unverified" },
];

/* ---- Bookings ----
   Spread across the lifecycle and across both channels, so the Finances tabs
   and the marketplace panel both have something real to show. */
const BOOKING_SPECS = [
  { ref: "ARD-2841", plate: "KDK 442X", client: 1, from: -3, to: 4, status: "Active", source: "dashboard", paid: true },
  { ref: "ARD-2840", plate: "KDB 690F", client: 4, from: -2, to: 2, status: "Active", source: "dashboard", paid: true },
  { ref: "ARD-2839", plate: "KDA 118Q", client: 2, from: -1, to: 6, status: "Active", source: "app", paid: true },
  { ref: "ARD-2838", plate: "KDG 556M", client: 6, from: 0, to: 5, status: "Active", source: "app", paid: true },
  { ref: "ARD-2837", plate: "KCX 907B", client: 3, from: 2, to: 5, status: "Confirmed", source: "dashboard", paid: true },
  { ref: "ARD-2836", plate: "KDE 027N", client: 1, from: 4, to: 7, status: "Confirmed", source: "app", paid: true },
  { ref: "ARD-2835", plate: "KDD 771L", client: 8, from: 6, to: 9, status: "Pending", source: "dashboard", paid: false },
  { ref: "ARD-2834", plate: "KCP 233A", client: 5, from: 8, to: 12, status: "Pending", source: "dashboard", paid: false },
  { ref: "ARD-2833", plate: "KDA 118Q", client: 4, from: -12, to: -6, status: "Completed", source: "app", paid: true },
  { ref: "ARD-2832", plate: "KDK 442X", client: 2, from: -18, to: -13, status: "Completed", source: "dashboard", paid: true },
  { ref: "ARD-2831", plate: "KDB 690F", client: 6, from: -21, to: -17, status: "Completed", source: "dashboard", paid: true },
  { ref: "ARD-2830", plate: "KDG 556M", client: 3, from: -26, to: -22, status: "Completed", source: "app", paid: true },
  { ref: "ARD-2829", plate: "KCY 305J", client: 7, from: -31, to: -28, status: "Completed", source: "dashboard", paid: true },
  { ref: "ARD-2828", plate: "KDE 027N", client: 4, from: -37, to: -33, status: "Completed", source: "app", paid: true },
  { ref: "ARD-2827", plate: "KCX 907B", client: 1, from: -44, to: -40, status: "Completed", source: "dashboard", paid: true },
  { ref: "ARD-2826", plate: "KDH 812R", client: 8, from: -49, to: -46, status: "Cancelled", source: "dashboard", paid: false },
  { ref: "ARD-2825", plate: "KDD 771L", client: 6, from: -55, to: -51, status: "Completed", source: "app", paid: true },
  { ref: "ARD-2824", plate: "KDK 442X", client: 3, from: -62, to: -57, status: "Completed", source: "dashboard", paid: true },
];

const vehicleFor = (plate) => VEHICLES.find((v) => v.plate === plate);
const clientFor = (id) => CLIENTS.find((c) => c.id === id);

export const BOOKINGS = BOOKING_SPECS.map((b) => {
  const v = vehicleFor(b.plate);
  const c = clientFor(b.client);
  const days = Math.max(1, b.to - b.from);
  const amount = v.rate * days;
  return {
    ref: b.ref,
    vehicle: v.name,
    plate: v.plate,
    customer: c.name,
    phone: c.phone,
    client_id: c.id,
    pickup: isoDay(b.from),
    dropoff: isoDay(b.to),
    created: iso(daysFromNow(b.from - 2)),
    status: b.status,
    type: v.category === "Van" ? "With driver" : "Self drive",
    source: b.source,
    location: "Westlands office",
    rate: v.rate,
    amount,
    md: days,
    notes: "",
    payment: b.paid ? "Paid" : "Unpaid",
    deposit_amount: 10000,
    deposit_status: b.paid ? "Held" : "Not collected",
    deposit_managed_by_ardena: b.source === "app",
    requires_handover_code: b.source === "app",
    verification: c.verification,
    handover: null,
  };
});

/* ---- Payments (direct channel) ----
   Only dashboard bookings settle here; app bookings settle through Ardena and
   surface under marketplace transactions instead. */
export const PAYMENTS = BOOKINGS.filter((b) => b.source === "dashboard" && b.payment === "Paid").map(
  (b, i) => ({
    id: 900 + i,
    receipt: `SLK${(7 + i).toString().padStart(2, "0")}H${40 + i}KP`,
    reference: `pay_${b.ref.toLowerCase().replace("-", "")}`,
    booking_ref: b.ref,
    customer: b.customer,
    amount: b.amount,
    type: "payment",
    status: "completed",
    method: "Paystack",
    date: iso(daysFromNow(Number(b.pickup.slice(8)) ? -1 : -1)),
  })
);

// keep payment dates aligned to their booking's pickup rather than "yesterday"
PAYMENTS.forEach((p) => {
  const b = BOOKINGS.find((x) => x.ref === p.booking_ref);
  p.date = iso(new Date(b.pickup).getTime() - DAY);
});

// one refund, so the donut has a third slice
PAYMENTS.push({
  id: 999,
  receipt: "SLK92H77KP",
  reference: "rfnd_ard2826",
  booking_ref: "ARD-2826",
  customer: "Mercy Chebet",
  amount: 12000,
  type: "refund",
  status: "completed",
  method: "Paystack",
  date: isoDay(-48),
});

const collected = PAYMENTS.filter((p) => p.type === "payment").reduce((n, p) => n + p.amount, 0);
const refunded = PAYMENTS.filter((p) => p.type === "refund").reduce((n, p) => n + p.amount, 0);
const outstanding = BOOKINGS.filter((b) => b.payment === "Unpaid").reduce((n, b) => n + b.amount, 0);

export const PAYMENTS_SUMMARY = {
  collected,
  outstanding,
  refunded,
  net: collected - refunded,
  paid_count: PAYMENTS.filter((p) => p.type === "payment").length,
};

/* ---- Marketplace (Ardena app channel) ---- */
const APP_BOOKINGS = BOOKINGS.filter((b) => b.source === "app");
const COMMISSION_RATE = 0.12;

export const MARKETPLACE_TRANSACTIONS = APP_BOOKINGS.map((b, i) => {
  const commission = Math.round(b.amount * COMMISSION_RATE);
  return {
    booking_id: 4100 + i,
    booking_ref: b.ref,
    car_name: b.vehicle,
    plate: b.plate,
    customer_name: b.customer,
    amount: b.amount,
    commission_amount: commission,
    net_amount: b.amount - commission,
    paid_at: iso(new Date(b.pickup).getTime() - DAY),
    mpesa_receipt_number: `TJ${(4 + i).toString().padStart(2, "0")}K${910 + i}LM`,
  };
});

const appGross = MARKETPLACE_TRANSACTIONS.reduce((n, t) => n + t.amount, 0);
const appCommission = MARKETPLACE_TRANSACTIONS.reduce((n, t) => n + t.commission_amount, 0);
const appNet = appGross - appCommission;

export const MARKETPLACE_WITHDRAWALS = [
  { id: 31, amount: 120000, status: "completed", payment_method_type: "mpesa", mpesa_number: "0722415900", mpesa_receipt_number: "TH41KX882M", created_at: isoDay(-24) },
  { id: 32, amount: 85000, status: "completed", payment_method_type: "bank", bank_name: "Equity Bank", created_at: isoDay(-11) },
  { id: 33, amount: 40000, status: "pending", payment_method_type: "mpesa", mpesa_number: "0722415900", created_at: isoDay(-1) },
];

const withdrawnDone = MARKETPLACE_WITHDRAWALS.filter((w) => w.status === "completed").reduce((n, w) => n + w.amount, 0);
const withdrawPending = MARKETPLACE_WITHDRAWALS.filter((w) => w.status === "pending").reduce((n, w) => n + w.amount, 0);

export const MARKETPLACE_EARNINGS = {
  marketplace_active: true,
  total_gross: appGross,
  commission_rate: COMMISSION_RATE,
  commission_amount: appCommission,
  net_earnings: appNet,
  paid_bookings_count: MARKETPLACE_TRANSACTIONS.length,
  withdrawable: Math.max(0, appNet - withdrawnDone - withdrawPending),
  pending_withdrawals_total: withdrawPending,
};

export const PAYOUT_METHODS = [
  { id: 1, name: "Nuru M-Pesa", method_type: "mpesa", mpesa_number: "0722415900" },
  { id: 2, name: "Nuru Car Hire Ltd", method_type: "bank", bank_name: "Equity Bank", account_number: "1351638440", account_name: "Nuru Car Hire Ltd" },
  { id: 3, name: "Office paybill", method_type: "paybill", paybill_number: "522533", account_number: "8110737" },
];

export const RENTER_CONVERSATIONS = [
  { id: 11, client_name: "Amina Hassan", last_message: "Perfect, I'll pick it up at 9am. Is a booster seat available?", last_message_at: iso(now.getTime() - 26 * 60_000), unread_count: 2 },
  { id: 12, client_name: "Brian Kiptoo", last_message: "Thanks for the quick turnaround on the Prado.", last_message_at: iso(now.getTime() - 4 * 3_600_000), unread_count: 0 },
  { id: 13, client_name: "Faith Njeri", last_message: "Can I extend the X-Trail by two more days?", last_message_at: iso(now.getTime() - 27 * 3_600_000), unread_count: 1 },
  { id: 14, client_name: "David Ochieng", last_message: "Received, asante.", last_message_at: iso(now.getTime() - 3 * DAY - 5 * 3_600_000), unread_count: 0 },
];

export const RATINGS_SUMMARY = {
  business_rating: 4.8,
  business_rating_count: 63,
  car_rating: 4.7,
  car_rating_count: 88,
  reviews: [
    { id: 1, client_name: "Amina Hassan", rating: 5, comment: "Spotless car, delivered to my hotel on time. Booking took two minutes.", created_at: isoDay(-2), car_name: "Toyota Prado TX" },
    { id: 2, client_name: "Brian Kiptoo", rating: 5, comment: "Third time hiring from Nuru. Never had an issue.", created_at: isoDay(-9), car_name: "Toyota Land Cruiser V8" },
    { id: 3, client_name: "Faith Njeri", rating: 4, comment: "Great vehicle, pickup took a little longer than expected.", created_at: isoDay(-16), car_name: "Nissan X-Trail" },
  ],
};

/* ---- Verification ---- */
export const WALLET = { balance: 4300, currency: "KES", check_price: 100 };

export const VERIFICATION_LOOKUPS = [
  { id: 501, full_name: "David Ochieng", number: "28844102", entity: "National ID", status: "verified", created_at: isoDay(-1), cost: 100 },
  { id: 502, full_name: "Amina Hassan", number: "31220988", entity: "National ID", status: "verified", created_at: isoDay(-2), cost: 100 },
  { id: 503, full_name: "Grace Wairimu", number: "DL-4471228", entity: "Driver's Licence", status: "verified", created_at: isoDay(-4), cost: 100 },
  { id: 504, full_name: "Samuel Mwangi", number: "29663041", entity: "National ID", status: "pending", created_at: isoDay(-5), cost: 100 },
  { id: 505, full_name: "Mercy Chebet", number: "33840155", entity: "National ID", status: "failed", created_at: isoDay(-8), cost: 100 },
];

/* ---- Staff ---- */
export const STAFF = [
  { id: 1, name: "Wanjiru Kamau", email: "wanjiru@nurucarhire.co.ke", role: "Owner", last_active: "Online now" },
  { id: 2, name: "Kevin Mutua", email: "kevin@nurucarhire.co.ke", role: "Manager", last_active: "12 minutes ago" },
  { id: 3, name: "Lucy Adhiambo", email: "lucy@nurucarhire.co.ke", role: "Booking agent", last_active: "1 hour ago" },
  { id: 4, name: "Joseph Kariuki", email: "joseph@nurucarhire.co.ke", role: "Finance", last_active: "Yesterday" },
];

export const STAFF_INVITES = [
  { id: 9, email: "diana@nurucarhire.co.ke", role: "Booking agent", created_at: isoDay(-1) },
];

/* ---- Notifications ---- */
export const NOTIFICATIONS = [
  { id: 1, kind: "booking", title: "New app booking — Toyota Prado TX", meta: "Amina Hassan · 7 days", time: "26 minutes ago", read: false, to: "/dashboard/bookings/ARD-2839" },
  { id: 2, kind: "payment", title: "Payment received · KES 154,000", meta: "ARD-2841 · David Ochieng", time: "2 hours ago", read: false, to: "/dashboard/payments" },
  { id: 3, kind: "fleet", title: "Inspection expires in 9 days", meta: "KDG 556M · Nissan X-Trail", time: "5 hours ago", read: false, to: "/dashboard/fleet/KDG%20556M" },
  { id: 4, kind: "verification", title: "Renter verified", meta: "Grace Wairimu · National ID", time: "Yesterday", read: true, to: "/dashboard/verification" },
  { id: 5, kind: "booking", title: "Booking completed", meta: "ARD-2833 · Toyota Prado TX", time: "2 days ago", read: true, to: "/dashboard/bookings/ARD-2833" },
  { id: 6, kind: "staff", title: "Lucy Adhiambo accepted her invite", meta: "Booking agent", time: "4 days ago", read: true, to: "/dashboard/staff" },
];

/* ---- Support thread ---- */
export const SUPPORT_MESSAGES = [
  { id: 1, from: "support", text: "Hi Wanjiru! You're chatting with Ardena support. How can we help today?", read: true, at: iso(now.getTime() - 2 * DAY - 6 * 3_600_000) },
  { id: 2, from: "user", text: "Hi — can we add a second paybill for payouts?", read: true, at: iso(now.getTime() - 2 * DAY - 5.8 * 3_600_000) },
  { id: 3, from: "support", text: "Absolutely. Add it under Settings → Payout destinations and it'll be selectable on your next withdrawal.", read: true, at: iso(now.getTime() - 2 * DAY - 5.6 * 3_600_000) },
];

/* ---- Billing ---- */
export const BILLING_USAGE = {
  vehicles: VEHICLES.length,
  rate: 200,
  amount: VEHICLES.length * 200,
  minimum: 2000,
  verification_checks: VERIFICATION_LOOKUPS.length,
  verification_amount: VERIFICATION_LOOKUPS.length * 100,
  period_start: isoDay(-now.getDate() + 1),
  period_end: isoDay(30 - now.getDate()),
};

export const INVOICES = [
  { id: 1, ref: "INV-00241", title: "Monthly subscription", detail: `${VEHICLES.length} vehicles`, amount: 2000, status: "paid", due_date: isoDay(-2), paid_at: isoDay(-3) },
  { id: 2, ref: "INV-00228", title: "Monthly subscription", detail: `${VEHICLES.length} vehicles`, amount: 2000, status: "paid", due_date: isoDay(-32), paid_at: isoDay(-33) },
  { id: 3, ref: "INV-00215", title: "Monthly subscription", detail: "9 vehicles", amount: 2000, status: "paid", due_date: isoDay(-62), paid_at: isoDay(-63) },
];

export const SUBSCRIPTION = {
  plan: "Fleet plan",
  status: "active",
  vehicles: VEHICLES.length,
  rate: 200,
  next_billing_date: isoDay(30 - now.getDate()),
};

/* ---- Tracking ---- */
export const TRACKING = VEHICLES.filter((v) => v.status === "On booking").map((v, i) => ({
  plate: v.plate,
  name: v.name,
  status: "moving",
  speed: [62, 48, 0, 77][i % 4],
  lat: -1.2921 + (i - 1) * 0.035,
  lng: 36.8219 + (i - 1) * 0.041,
  address: ["Waiyaki Way, Westlands", "Mombasa Road, Nairobi", "Limuru Road, Gigiri", "Ngong Road, Karen"][i % 4],
  last: `${2 + i} minutes ago`,
}));

/* ---- Chauffeurs ---- */
export const CHAUFFEURS = [
  { id: 1, name: "Joseph Mutiso", phone: "0721 330 447", licence_no: "DL-2284471", licence_expiry: isoDay(220), status: "On booking", rating: 4.9, trips: 128 },
  { id: 2, name: "Alice Nduta", phone: "0736 118 205", licence_no: "DL-3391760", licence_expiry: isoDay(84), status: "Available", rating: 4.8, trips: 96 },
  { id: 3, name: "Patrick Omondi", phone: "0748 662 913", licence_no: "DL-1174208", licence_expiry: isoDay(311), status: "Available", rating: 4.7, trips: 74 },
];

/* ---- Overview ----
   Computed from the rows above so nothing contradicts the tables. */
function monthlyRevenue() {
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const direct = PAYMENTS.filter((p) => p.type === "payment" && new Date(p.date).getTime() >= start).reduce((n, p) => n + p.amount, 0);
  const app = MARKETPLACE_TRANSACTIONS.filter((t) => new Date(t.paid_at).getTime() >= start).reduce((n, t) => n + t.net_amount, 0);
  return { direct, app };
}

function bookingHeatmap() {
  // Slots must match BookingHeatmap's SLOTS (even hours, 6am–8pm) or the cells
  // simply never match and the grid renders empty.
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const slots = [6, 8, 10, 12, 14, 16, 18, 20];
  const cells = [];
  for (let d = 0; d < 7; d++) {
    for (const h of slots) {
      const weekday = d < 5;
      let count;
      if (weekday && h >= 8 && h <= 12) count = 5 + ((d * 3 + h) % 4); // morning pickups
      else if (d === 4 && h >= 14) count = 7 + (h % 3); // Friday getaway rush
      else if (d >= 5 && h >= 8 && h <= 16) count = 3 + ((d + h) % 3); // weekend
      else if (h <= 6 || h >= 20) count = (d + h) % 2; // fringes stay quiet
      else count = 1 + ((d + h) % 3);
      cells.push({ day: days[d], hour: h, count });
    }
  }
  return cells;
}

function utilisationTrend() {
  const base = [38, 41, 47, 45, 52, 58, 55, 63, 68, 71];
  return base.map((value, i) => {
    const d = daysFromNow(-(9 - i) * 7);
    return { week: d.toLocaleDateString("en-KE", { day: "numeric", month: "short" }), value };
  });
}

function topVehicles() {
  // Growth varies per vehicle — a constant prev/curr ratio makes every row
  // read the same "+22%" and the chart looks fabricated.
  const growth = [1.31, 1.18, 1.07, 0.92, 1.44, 1.12];
  return VEHICLES.slice(0, 6)
    .map((v, i) => {
      const prev = Math.round(v.rate * (v.utilisation / 100) * 20);
      return {
        name: v.name,
        plate: v.plate,
        prev,
        curr: Math.round(prev * growth[i % growth.length]),
      };
    })
    .sort((a, b) => b.curr - a.curr);
}

const rev = monthlyRevenue();
const onBooking = VEHICLES.filter((v) => v.status === "On booking").length;

export const OVERVIEW = {
  stats: {
    monthly_revenue: rev.direct + rev.app,
    monthly_revenue_marketplace: rev.app,
    active_bookings: BOOKINGS.filter((b) => b.status === "Active").length,
    utilisation: Math.round((onBooking / VEHICLES.length) * 100),
    fleet_size: VEHICLES.length,
  },
  booking_heatmap: bookingHeatmap(),
  top_vehicles: topVehicles(),
  utilisation_trend: utilisationTrend(),
  attention: [
    { kind: "critical", title: "Inspection expires in 9 days", meta: "KDG 556M · Nissan X-Trail" },
    { kind: "warning", title: "Insurance expires in 22 days", meta: "KDA 118Q · Toyota Prado TX" },
    { kind: "warning", title: "Verification failed", meta: "Mercy Chebet · retry the ID check" },
    { kind: "warning", title: "Licence expires in 84 days", meta: "Alice Nduta · chauffeur" },
  ],
};

export const ACTIVITY_LOG = [
  { id: 1, actor: "Lucy Adhiambo", action: "confirmed booking ARD-2837", at: iso(now.getTime() - 40 * 60_000) },
  { id: 2, actor: "Joseph Kariuki", action: "requested a KES 40,000 withdrawal", at: iso(now.getTime() - 3 * 3_600_000) },
  { id: 3, actor: "Kevin Mutua", action: "listed KDE 027N on the Ardena app", at: isoDay(-1) },
  { id: 4, actor: "Wanjiru Kamau", action: "invited diana@nurucarhire.co.ke as Booking agent", at: isoDay(-1) },
  { id: 5, actor: "Lucy Adhiambo", action: "ran an ID check for Grace Wairimu", at: isoDay(-4) },
];

export { displayDate, isoDay };
