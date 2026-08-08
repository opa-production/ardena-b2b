/* Demo mode data layer: answers every dashboard request from demoData.js
 * instead of the network, so the app can be driven and recorded without a
 * backend, an account, or any risk of writing to production.
 *
 * This module is only ever loaded via a dynamic import from main.jsx when the
 * demo flag is on (see demoMode.js), so neither it nor the dataset ships in a
 * normal customer bundle.
 */
import * as D from "./demoData";
import { getSession, setSession } from "./authStore";
import { setDemoHandlers } from "./demoMode";
import { hydrateBookings } from "../dashboard/bookingsStore";

/* ---- helpers ---- */

const ok = (data) => Promise.resolve(data);
const page = (rows, key = "data") => ({ [key]: rows, total: rows.length, page: 1 });

function pathOnly(p) {
  return p.split("?")[0].replace(/\/+$/, "") || "/";
}

function query(p) {
  return new URLSearchParams(p.split("?")[1] || "");
}

/* A local copy so demo mutations (confirm a booking, mark a notification read)
   stick for the length of the recording without touching the source data. */
const state = {
  bookings: D.BOOKINGS.map((b) => ({ ...b })),
  notifications: D.NOTIFICATIONS.map((n) => ({ ...n })),
  vehicles: D.VEHICLES.map((v) => ({ ...v })),
  clients: D.CLIENTS.map((c) => ({ ...c })),
  chauffeurs: D.CHAUFFEURS.map((c) => ({ ...c })),
  staff: D.STAFF.map((s) => ({ ...s })),
  invites: D.STAFF_INVITES.map((i) => ({ ...i })),
  support: D.SUPPORT_MESSAGES.map((m) => ({ ...m })),
  payoutMethods: D.PAYOUT_METHODS.map((m) => ({ ...m })),
  withdrawals: D.MARKETPLACE_WITHDRAWALS.map((w) => ({ ...w })),
  wallet: { ...D.WALLET },
  earnings: { ...D.MARKETPLACE_EARNINGS },
  policy: { deposit: 10000, late_fee_per_hour: 500 },
};

let nextId = 5000;

/* ---- routes ----
   Ordered most-specific first; the first matching entry wins. `m` holds the
   regex groups, so `/bookings/ARD-2841` can find its row. */
const ROUTES = [
  // --- auth & session
  ["POST", /^\/auth\/login$/, () => ok({
    access_token: "demo-token",
    refresh_token: "demo-refresh",
    user: D.USER,
    business: D.BUSINESS,
  })],
  ["POST", /^\/auth\/logout$/, () => ok(null)],
  ["POST", /^\/auth\/(forgot-password|reset-password|access-requests)$/, () => ok({ ok: true })],
  ["GET", /^\/me$/, () => ok({ user: D.USER, business: D.BUSINESS })],

  // --- workspace
  ["GET", /^\/config$/, () => ok({ mapbox_token: "" })],
  ["GET", /^\/business$/, () => ok(D.BUSINESS)],
  ["PATCH", /^\/business$/, (m, body) => ok({ ...D.BUSINESS, ...body })],
  ["POST", /^\/business\/logo$/, () => ok({ logo_url: null })],
  ["GET", /^\/business\/policy$/, () => ok(state.policy)],
  ["PUT", /^\/business\/policy$/, (m, body) => { Object.assign(state.policy, body); return ok(state.policy); }],
  // every step already done, so the setup checklist stays out of the shot
  ["GET", /^\/onboarding$/, () => ok({ vehicle: true, booking: true, prompt: true, verify: true, team: true })],
  ["POST", /^\/onboarding/, () => ok({ ok: true })],
  ["GET", /^\/billing\/gate$/, () => ok({ gated: false })],
  ["GET", /^\/host-link\/suggest$/, () => ok({ should_prompt: false })],
  ["GET", /^\/host-link$/, () => ok({ linked: true, host_email: D.BUSINESS.email })],

  // --- overview
  ["GET", /^\/dashboard\/overview$/, () => ok(D.OVERVIEW)],
  ["GET", /^\/activity-log$/, () => ok({ entries: D.ACTIVITY_LOG })],

  // --- fleet
  ["GET", /^\/vehicles$/, () => ok(page(state.vehicles))],
  ["GET", /^\/vehicles\/(.+)$/, (m) => {
    const v = state.vehicles.find((x) => x.plate === decodeURIComponent(m[1]));
    return v ? ok(v) : notFound("Vehicle");
  }],
  ["POST", /^\/vehicles$/, (m, body) => {
    const v = { status: "Available", utilisation: 0, notes: "", ...body };
    state.vehicles.unshift(v);
    return ok(v);
  }],
  ["PATCH", /^\/vehicles\/(.+)$/, (m, body) => {
    const v = state.vehicles.find((x) => x.plate === decodeURIComponent(m[1]));
    if (v) Object.assign(v, body);
    return ok(v || {});
  }],
  ["DELETE", /^\/vehicles\/(.+)$/, (m) => {
    state.vehicles = state.vehicles.filter((x) => x.plate !== decodeURIComponent(m[1]));
    return ok(null);
  }],
  ["GET", /^\/fleet\/(.+)$/, (m) => {
    const v = state.vehicles.find((x) => x.plate === decodeURIComponent(m[1]));
    return v ? ok(v) : notFound("Vehicle");
  }],

  // --- bookings
  ["GET", /^\/bookings$/, () => ok(page(state.bookings))],
  ["POST", /^\/bookings$/, (m, body) => {
    const b = { ref: `ARD-${2842 + state.bookings.length}`, status: "Pending", payment: "Unpaid", ...body };
    state.bookings.unshift(b);
    return ok(b);
  }],
  ["GET", /^\/bookings\/([^/]+)$/, (m) => {
    const b = state.bookings.find((x) => x.ref === decodeURIComponent(m[1]));
    return b ? ok(b) : notFound("Booking");
  }],
  ["PATCH", /^\/bookings\/([^/]+)$/, (m, body) => {
    const b = state.bookings.find((x) => x.ref === decodeURIComponent(m[1]));
    if (b) Object.assign(b, body);
    return ok(b || {});
  }],
  ["POST", /^\/bookings\/([^/]+)\//, () => ok({ ok: true })],

  // --- clients
  ["GET", /^\/clients$/, () => ok(page(state.clients))],
  ["POST", /^\/clients$/, (m, body) => {
    const c = { id: nextId++, bookings_count: 0, total_spend: 0, verification: "unverified", ...body };
    state.clients.unshift(c);
    return ok(c);
  }],
  ["GET", /^\/clients\/(\d+)$/, (m) => {
    const c = state.clients.find((x) => String(x.id) === m[1]);
    return c ? ok({ ...c, bookings: state.bookings.filter((b) => b.client_id === c.id) }) : notFound("Client");
  }],

  // --- chauffeurs
  ["GET", /^\/chauffeurs$/, () => ok({ chauffeurs: state.chauffeurs })],
  ["POST", /^\/chauffeurs$/, (m, body) => {
    const c = { id: nextId++, status: "Available", trips: 0, rating: 0, ...body };
    state.chauffeurs.unshift(c);
    return ok(c);
  }],
  ["GET", /^\/chauffeurs\/(\d+)$/, (m) => {
    const c = state.chauffeurs.find((x) => String(x.id) === m[1]);
    return c ? ok(c) : notFound("Chauffeur");
  }],

  // --- tracking
  ["GET", /^\/tracking$/, () => ok({ vehicles: D.TRACKING })],

  // --- verification
  ["GET", /^\/verification\/wallet$/, () => ok(state.wallet)],
  ["GET", /^\/verification\/wallet\/transactions$/, () => ok({
    transactions: [
      { id: 1, type: "topup", amount: 5000, status: "completed", created_at: D.isoDay(-6) },
      { id: 2, type: "topup", amount: 3000, status: "completed", created_at: D.isoDay(-20) },
    ],
  })],
  ["POST", /^\/verification\/wallet\/topup/, () => ok({ ok: true, checkout_url: null })],
  ["GET", /^\/verification\/lookups$/, () => ok({ lookups: D.VERIFICATION_LOOKUPS })],
  ["POST", /^\/verification\/lookup$/, (m, body) => {
    state.wallet.balance = Math.max(0, state.wallet.balance - 100);
    return ok({ id: nextId++, status: "verified", full_name: body?.full_name || "Demo Renter", ...body });
  }],
  ["GET", /^\/trust\/(.+)$/, () => ok({ business: D.BUSINESS, verified: true })],

  // --- payments
  ["GET", /^\/payments$/, () => ok(page(D.PAYMENTS))],
  ["GET", /^\/payments\/summary$/, () => ok(D.PAYMENTS_SUMMARY)],
  ["GET", /^\/payments\/check\/(.+)$/, () => ok({ status: "completed" })],
  ["POST", /^\/payments/, () => ok({ ok: true })],

  // --- marketplace
  ["GET", /^\/marketplace\/earnings$/, () => ok(state.earnings)],
  ["GET", /^\/marketplace\/transactions$/, () => ok({ transactions: D.MARKETPLACE_TRANSACTIONS })],
  ["GET", /^\/marketplace\/withdrawals$/, () => ok({ withdrawals: state.withdrawals })],
  ["POST", /^\/marketplace\/withdrawals$/, (m, body) => {
    const amount = Number(body?.amount) || 0;
    const w = {
      id: nextId++,
      amount,
      status: "pending",
      payment_method_type: body?.payment_method_type || "mpesa",
      created_at: new Date().toISOString(),
    };
    state.withdrawals.unshift(w);
    state.earnings.withdrawable = Math.max(0, state.earnings.withdrawable - amount);
    state.earnings.pending_withdrawals_total += amount;
    return ok(w);
  }],
  ["GET", /^\/marketplace\/payout-methods$/, () => ok(state.payoutMethods)],
  ["POST", /^\/marketplace\/payout-methods$/, (m, body) => {
    const pm = { id: nextId++, ...body };
    state.payoutMethods.push(pm);
    return ok(pm);
  }],
  ["DELETE", /^\/marketplace\/payout-methods\/(\d+)$/, (m) => {
    state.payoutMethods = state.payoutMethods.filter((x) => String(x.id) !== m[1]);
    return ok(null);
  }],
  ["GET", /^\/marketplace\/conversations\/(\d+)$/, (m) => {
    const c = D.RENTER_CONVERSATIONS.find((x) => String(x.id) === m[1]);
    return ok({
      id: Number(m[1]),
      client_name: c?.client_name || "Renter",
      messages: [
        { id: 1, sender_type: "client", message: "Hi, is this vehicle available this weekend?", created_at: D.isoDay(-1) },
        { id: 2, sender_type: "host", message: "Yes it is — Friday 9am pickup works. Shall I hold it for you?", created_at: D.isoDay(-1) },
        { id: 3, sender_type: "client", message: c?.last_message || "Great, thank you.", created_at: new Date().toISOString() },
      ],
    });
  }],
  ["GET", /^\/marketplace\/conversations$/, () => ok({ conversations: D.RENTER_CONVERSATIONS })],
  ["POST", /^\/marketplace\/conversations\/(\d+)/, (m, body) => ok({
    id: nextId++,
    sender_type: "host",
    message: body?.message || body?.text || "",
    created_at: new Date().toISOString(),
  })],
  ["GET", /^\/marketplace\/ratings\/vehicles$/, () => ok({ vehicles: D.VEHICLES.slice(0, 4).map((v, i) => ({ plate: v.plate, name: v.name, rating: [4.9, 4.8, 4.7, 4.6][i], rating_count: [24, 19, 15, 11][i] })) })],
  ["GET", /^\/marketplace\/ratings$/, () => ok(D.RATINGS_SUMMARY)],
  ["GET", /^\/marketplace\/deposit-claims$/, () => ok({ claims: [] })],
  ["POST", /^\/marketplace\/deposit-claims$/, () => ok({ ok: true })],
  ["GET", /^\/marketplace\/extension-requests$/, () => ok({ requests: [
    { id: 1, booking_ref: "ARD-2838", client_name: "Faith Njeri", car_name: "Nissan X-Trail", extra_days: 2, amount: 19000, status: "pending", created_at: D.isoDay(-1) },
  ] })],
  ["POST", /^\/marketplace\/extension-requests\//, () => ok({ ok: true })],
  ["PATCH", /^\/marketplace\/bookings\//, () => ok({ ok: true })],

  // --- staff
  ["GET", /^\/staff$/, () => ok({ members: state.staff })],
  ["GET", /^\/staff\/invites$/, () => ok({ invites: state.invites })],
  ["POST", /^\/staff\/invites$/, (m, body) => {
    const i = { id: nextId++, created_at: new Date().toISOString(), ...body };
    state.invites.push(i);
    return ok(i);
  }],
  ["DELETE", /^\/staff\/invites\/(\d+)$/, (m) => {
    state.invites = state.invites.filter((x) => String(x.id) !== m[1]);
    return ok(null);
  }],
  ["PATCH", /^\/staff\/(\d+)$/, (m, body) => {
    const s = state.staff.find((x) => String(x.id) === m[1]);
    if (s) Object.assign(s, body);
    return ok(s || {});
  }],
  ["DELETE", /^\/staff\/(\d+)$/, (m) => {
    state.staff = state.staff.filter((x) => String(x.id) !== m[1]);
    return ok(null);
  }],

  // --- notifications
  ["GET", /^\/notifications\/unread-count$/, () => ok({ unread_count: state.notifications.filter((n) => !n.read).length })],
  ["POST", /^\/notifications\/read-all$/, () => { state.notifications.forEach((n) => { n.read = true; }); return ok(null); }],
  ["POST", /^\/notifications\/(\d+)\/read$/, (m) => {
    const n = state.notifications.find((x) => String(x.id) === m[1]);
    if (n) n.read = true;
    return ok(null);
  }],
  ["GET", /^\/notifications$/, () => ok({ notifications: state.notifications })],

  // --- support
  ["GET", /^\/support\/messages\/unread-count$/, () => ok({ unread_count: 0 })],
  ["POST", /^\/support\/messages\/read$/, () => ok(null)],
  ["GET", /^\/support\/messages$/, () => ok({ messages: state.support, unread_count: 0 })],
  ["POST", /^\/support\/messages$/, (m, body) => {
    const msg = { id: nextId++, from: "user", text: body?.text || "", read: true, at: new Date().toISOString() };
    state.support.push(msg);
    // a canned reply a beat later keeps the thread alive on camera
    setTimeout(() => {
      state.support.push({
        id: nextId++,
        from: "support",
        text: "Thanks Wanjiru — we're on it. We'll come back to you here shortly.",
        read: false,
        at: new Date().toISOString(),
      });
    }, 2500);
    return ok(msg);
  }],

  // --- billing
  ["GET", /^\/billing\/usage$/, () => ok(D.BILLING_USAGE)],
  ["GET", /^\/billing\/invoices\/check\/(.+)$/, () => ok({ status: "paid" })],
  ["GET", /^\/billing\/invoices\/(.+)$/, (m) => ok(D.INVOICES.find((i) => i.ref === decodeURIComponent(m[1])) || D.INVOICES[0])],
  ["GET", /^\/billing\/invoices$/, () => ok({ invoices: D.INVOICES })],
  ["POST", /^\/billing\/invoices/, () => ok({ ok: true, status: "paid" })],
  ["GET", /^\/billing\/subscription$/, () => ok(D.SUBSCRIPTION)],

  // --- assistant (the local agent already answers; this is only for parity)
  ["GET", /^\/assistant\/messages$/, () => ok({ messages: [] })],
];

function notFound(what) {
  const err = new Error(`${what} not found`);
  err.status = 404;
  return Promise.reject(err);
}

/* Small, deliberate latency so skeletons and spinners actually show on camera
   instead of flashing — a demo that loads instantly hides the loading design. */
const LATENCY = 220;

function demoRequest(path, { method = "GET", body } = {}) {
  const p = pathOnly(path);
  for (const [verb, re, handler] of ROUTES) {
    if (verb !== method) continue;
    const m = p.match(re);
    if (m) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          Promise.resolve()
            .then(() => handler(m, body, query(path)))
            .then(resolve, reject);
        }, LATENCY);
      });
    }
  }

  // Anything unmapped resolves empty rather than throwing: an unhandled corner
  // of the app should render an empty state on camera, not an error toast.
  if (import.meta.env.DEV) {
    console.warn(`[demo] unmapped ${method} ${p} — returning empty`);
  }
  return new Promise((r) => setTimeout(() => r(method === "GET" ? {} : { ok: true }), LATENCY));
}

/* Exports stream a file rather than JSON, so they can't go through
   demoRequest. Build the CSV from the same rows the tables show and download
   it client-side — the export button then actually works on camera. */
function demoExport(type) {
  const sets = {
    bookings: {
      head: ["Ref", "Vehicle", "Plate", "Customer", "Pickup", "Dropoff", "Status", "Amount (KES)"],
      rows: state.bookings.map((b) => [b.ref, b.vehicle, b.plate, b.customer, b.pickup, b.dropoff, b.status, b.amount]),
    },
    payments: {
      head: ["Receipt", "Booking", "Customer", "Method", "Amount (KES)", "Type", "Date"],
      rows: D.PAYMENTS.map((p) => [p.receipt, p.booking_ref, p.customer, p.method, p.amount, p.type, p.date.slice(0, 10)]),
    },
    clients: {
      head: ["Name", "Phone", "Email", "Bookings", "Total spend (KES)", "Verification"],
      rows: state.clients.map((c) => [c.name, c.phone, c.email, c.bookings_count, c.total_spend, c.verification]),
    },
  };

  const set = sets[type] || sets.bookings;
  const escape = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [set.head, ...set.rows].map((r) => r.map(escape).join(",")).join("\n");

  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${type}-export.csv`;
  a.click();
  URL.revokeObjectURL(url);
  return Promise.resolve();
}

/* Called once from main.jsx after the flag is confirmed on. Seeds the session
   and the local stores, then hands the request/export handlers to demoMode so
   api.js can reach them without importing this chunk. */
export function install() {
  // The setup checklist reads bookings from the local store, not the API, so
  // seed it — otherwise a fully set-up demo workspace still nags "create a
  // booking" at the top of the overview.
  hydrateBookings(D.BOOKINGS);

  // Land straight in the dashboard rather than bouncing to /login. Logging out
  // and back in still works (any credentials are accepted), so the sign-in
  // screen is still recordable when you want that shot.
  if (!getSession().token) {
    setSession({
      token: "demo-token",
      refreshToken: "demo-refresh",
      user: D.USER,
      business: D.BUSINESS,
    });
  }

  setDemoHandlers({ request: demoRequest, exportReport: demoExport });
}
