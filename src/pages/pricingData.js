/* Shared marketing data: pricing terms and the module list, used by the
   landing page and the dedicated pricing page so the numbers never drift. */

export const MODULES = [
  {
    title: "Fleet management",
    desc: "Every vehicle, document and rate in one registry with availability at a glance.",
  },
  {
    title: "Bookings & reservations",
    desc: "Create, confirm and track reservations with automatic availability conflict checks.",
  },
  {
    title: "Client management",
    desc: "A clean profile for every customer with their bookings, payments and history.",
  },
  {
    title: "Identity verification",
    desc: "Verify renters in seconds with ID lookup, liveness and license checks built in.",
  },
  {
    title: "Payment prompting",
    desc: "Prompt customers to pay from any booking. M-Pesa first, tracked end to end.",
  },
  {
    title: "Staff & roles",
    desc: "Invite your team with the right access. Every action logged, always auditable.",
  },
  {
    title: "Notifications",
    desc: "Your team stays ahead of bookings, payments and expiring documents in real time.",
  },
  {
    title: "Reports & analytics",
    desc: "Revenue, utilisation and fleet performance, always up to date and exportable.",
  },
];

/* The landing page leads with four pillars rather than all eight modules —
   the full list still appears on /pricing, where people are comparing. */
export const PILLARS = [
  {
    title: "Fleet",
    desc: "Every vehicle, document and rate in one registry, with availability at a glance.",
  },
  {
    title: "Bookings",
    desc: "Create, confirm and track reservations, with double-bookings caught automatically.",
  },
  {
    title: "Verification",
    desc: "Check a renter's ID, licence and liveness in seconds, before they drive off.",
  },
  {
    title: "Payments",
    desc: "Prompt any customer to pay from their booking. M-Pesa first, tracked end to end.",
  },
];

/* ---------------------------------------------------------------------------
   Pricing — mirrors app/b2b/billing.py in the backend. Keep them in step.
   ---------------------------------------------------------------------------
   Per vehicle, per month, with a 3-vehicle minimum. This replaced two earlier
   attempts, both of which broke the same promise in different ways:

   - a KES 2,000 cash floor, which meant every fleet of five or fewer paid an
     identical bill — a 3-car fleet worked out at 667/vehicle while a 25-car
     fleet paid 400;
   - three fixed fleet bands (1-25 / 26-100 / 100+), which was worse: a 3-car
     fleet and a 25-car fleet paid exactly the same 1,200, and none of the band
     prices matched what the backend actually invoiced.

   A minimum expressed as a *quantity* keeps the per-vehicle price honest at
   every fleet size, which is the only version of this a salesperson can say out
   loud and have be true.

   On top of that, commission earned on a workspace's Ardena-app bookings is
   credited against its bill. Ardena ends up earning whichever is larger —
   commission or subscription — never both. See COMMISSION_RATE below.

   Renter verification stays outside the plan at CHECK_PRICE per check. It is a
   genuine pass-through cost with unpredictable volume, so folding it into a
   fixed price would mean eating the variance on the heaviest users. */

/** KES per vehicle per month, standard. */
export const RATE = 400;

/** Discounted rate for a workspace's first LAUNCH_MONTHS months. */
export const LAUNCH_RATE = 200;
export const LAUNCH_MONTHS = 3;

/** Smallest fleet we bill for — a count, not a shilling floor. */
export const MIN_VEHICLES = 3;

/** Ardena's cut of bookings that come through the consumer app. */
export const COMMISSION_RATE = 0.09;

/** KES per renter verification check, drawn from the prepaid wallet. */
export const CHECK_PRICE = 100;

/** Free trial length, in days. Quoted in one place so it can't drift. */
export const TRIAL_DAYS = 30;

/** Vehicles above this need a custom plan. */
export const FLEET_CAP = 100;

/** The subscription before any Ardena-app credit. */
export const monthlyFor = (vehicles, rate = RATE) =>
  Math.max(Number(vehicles) || 0, MIN_VEHICLES) * rate;

/** Commission Ardena earns on a month of app bookings, in KES. */
export const commissionOn = (appBookingsKes, rate = COMMISSION_RATE) =>
  Math.round((Number(appBookingsKes) || 0) * rate);

/** What's actually payable. Floored at zero — the credit never becomes a refund. */
export const billAfterCredit = (subscription, credit) =>
  Math.max(0, subscription - credit);

/* One plan, every module. The muted line is what sits outside the subscription
   on purpose, shown rather than hidden so nobody discovers it on an invoice. */
export const PLAN = {
  name: "Fleet",
  features: [
    "Every module — fleet, bookings, clients, staff, reports",
    "Unlimited bookings and staff seats",
    "M-Pesa and card payment prompting",
    "Vehicle tracking and document expiry alerts",
    "List on the Ardena app and take marketplace bookings",
    "Exports, custom invoicing and email support",
  ],
  muted: [`Renter verification — KES ${CHECK_PRICE} per check, from your wallet`],
};

/* Worked examples for the explanation section. Deliberately concrete: the model
   only lands when you see a 3-car fleet paying nothing next to a 25-car fleet
   paying full price. Figures are computed, not typed, so they cannot drift from
   the functions above. */
export const CREDIT_EXAMPLES = [
  { vehicles: 3, appBookings: 0, note: "Direct bookings only" },
  { vehicles: 3, appBookings: 100000, note: "Listed, selling well" },
  { vehicles: 10, appBookings: 20000, note: "Listed, getting started" },
  { vehicles: 25, appBookings: 0, note: "Not listed on the app" },
].map((row) => {
  const subscription = monthlyFor(row.vehicles);
  const credit = commissionOn(row.appBookings);
  return {
    ...row,
    subscription,
    credit: Math.min(credit, subscription),
    payable: billAfterCredit(subscription, credit),
  };
});

export const fmtKES = (n) => (Number(n) || 0).toLocaleString("en-KE");
