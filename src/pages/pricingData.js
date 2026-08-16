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
   Banded pricing — MOCK DATA, front end only.
   ---------------------------------------------------------------------------
   Replaces the old per-vehicle rate (KES 400/vehicle, KES 2,000 minimum) with
   one fixed price per fleet band, so a business always knows its bill before
   it adds a car. The backend still bills per vehicle; wiring these tiers to it
   is a later phase, so treat every number here as display copy for now.

   Monthly billing only for now. Annual prepay is a later phase, so there is
   deliberately no yearly rate here to quote.

   Renter verification stays outside the tiers at CHECK_PRICE per check. It is
   a genuine pass-through cost with unpredictable volume, so folding it into a
   fixed price would mean eating the variance on the heaviest users. */

export const CHECK_PRICE = 100;

/** Free trial length, in days. Quoted in one place so it can't drift. */
export const TRIAL_DAYS = 30;

export const TIERS = [
  {
    key: "starter",
    name: "Starter",
    range: "1 – 25 vehicles",
    monthly: 1200,
    accent: "violet",
    cta: { label: "Start free trial", to: "/signup" },
    features: [
      "Up to 25 vehicles",
      "All modules included",
      "Unlimited bookings and staff seats",
      "M-Pesa payment prompting",
      "Vehicle tracking",
      "Reports and exports",
      "Email support",
    ],
    muted: ["Assisted onboarding", "Priority support"],
  },
  {
    key: "growth",
    name: "Growth",
    range: "26 – 100 vehicles",
    monthly: 3600,
    accent: "blue",
    popular: true,
    cta: { label: "Start free trial", to: "/signup" },
    features: [
      "Up to 100 vehicles",
      "Everything in Starter",
      "Assisted onboarding and bulk import",
      "Priority support",
      "Custom invoicing",
      "A named account contact",
    ],
    muted: [],
  },
  {
    key: "scale",
    name: "Scale",
    range: "100+ vehicles",
    monthly: 7500,
    accent: "teal",
    cta: { label: "Talk to us", to: "/contact" },
    features: [
      "Unlimited vehicles",
      "Everything in Growth",
      "Team training sessions",
      "Custom invoicing and payment terms",
      "Priority support with a named contact",
      "Early access to new modules",
    ],
    muted: [],
  },
];

export const fmtKES = (n) => n.toLocaleString("en-KE");
