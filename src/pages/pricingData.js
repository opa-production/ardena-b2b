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

/* The landing page leads with four pillars rather than all eight modules, the full list still appears on /pricing, where people are comparing. */
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
   Pricing. Mirrors the backend (opabackend app/services/b2b_plans.py, served
   at GET /public/plans); keep the two in step.
   ---------------------------------------------------------------------------
   Starter   free forever, up to STARTER_CARS cars, no reports or exports.
   Fleet     FLEET_PRICE per car per month, billed on at least FLEET_MIN_CARS
             cars and capped at FLEET_CAP, paid from the prepaid wallet, with
             Ardena app commission taken off. Everything included.
   Enterprise custom terms.
   Every workspace starts on Starter; there is no free trial of Fleet. Not
   paying moves a workspace to Starter; nothing is locked or deleted.
   Renter checks (CHECK_PRICE) are pay as you go on every plan. */

export const STARTER_CARS = 3;
export const FLEET_PRICE = 300;
export const FLEET_MIN_CARS = 3;
export const FLEET_CAP = 6000;

/** KES per renter verification check, drawn from the prepaid wallet, on every plan. */
export const CHECK_PRICE = 100;

/* The plan grid. `tone` picks the card colour (see pricingCards.css): plain,
   brand blue, and the lavender accent. */
export const TIERS = [
  {
    key: "starter",
    name: "Starter",
    tone: "plain",
    price: 0,
    per: "forever",
    blurb: `For getting going. Run up to ${STARTER_CARS} cars on the dashboard, free.`,
    cta: { label: "Get started free", to: "/signup" },
    features: [
      `Up to ${STARTER_CARS} cars`,
      "Bookings, clients and the fleet calendar",
      "M-Pesa payment prompts and cash records",
      "Staff roles for your whole team",
      "List your cars on the Ardena app",
    ],
    muted: ["Reports and exports", `Renter checks, KES ${CHECK_PRICE} each, from your wallet`],
  },
  {
    key: "fleet",
    name: "Fleet",
    tone: "brand",
    price: FLEET_PRICE,
    per: "/ car / month",
    blurb: `Everything, for a growing fleet. From ${FLEET_MIN_CARS} cars, and never more than KES ${FLEET_CAP.toLocaleString("en-KE")} a month.`,
    cta: { label: "Start with Fleet", to: "/signup", solid: true },
    features: [
      "Everything in Starter",
      "Up to 100 cars, every one bookable",
      "Reports: utilisation, money owed, clients, PDF reports",
      "CSV exports for your accountant",
      "Ardena app commission comes off your bill",
      "Paid monthly from your wallet, cancel any time",
    ],
    muted: [`Renter checks, KES ${CHECK_PRICE} each, from your wallet`],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    tone: "accent",
    price: null,
    per: "pricing",
    blurb: "For large fleets, several branches and terms of your own.",
    cta: { label: "Talk to us", to: "/contact" },
    features: [
      "Everything in Fleet",
      "No car limit",
      "Volume pricing for 100+ cars",
      "Onboarding help and a named contact",
    ],
    muted: [],
  },
];

export const fmtKES = (n) => (Number(n) || 0).toLocaleString("en-KE");

/* The FAQ, shared by the landing page and the build step that writes the
   static SEO pages and FAQ structured data (scripts/seo-pages.mjs), so what
   search engines and AI assistants read is exactly what visitors see. */
export const FAQS = [
  {
    q: "How do I get an account?",
    a: "Access is by request. Tell us about your business, we verify its registration and director details, then send your logins within 24 hours. Every fleet on Ardena is a real, verified rental business.",
  },
  {
    q: "How does billing work?",
    a: `Starter is free forever for up to ${STARTER_CARS} cars. Fleet is KES ${FLEET_PRICE} per car per month, from ${FLEET_MIN_CARS} cars and capped at KES ${fmtKES(FLEET_CAP)}, paid from a prepaid wallet you top up with M-Pesa, and any Ardena app commission comes off the bill. Renter checks are KES ${fmtKES(CHECK_PRICE)} each on every plan.`,
  },
  {
    q: "Do I need my own identity verification account?",
    a: `No. Verification is built into the platform and pay as you go, a flat KES ${CHECK_PRICE} per renter check, paid from a prepaid wallet you top up like airtime. No monthly commitment.`,
  },
  {
    q: "How do customers pay?",
    a: "Your staff send a payment prompt from any booking and the customer approves it on their phone via M-Pesa. Card payments are on the roadmap.",
  },
  {
    q: "Can I control what my staff can see and do?",
    a: "Yes. Assign roles like admin, booking agent or finance, and every action is recorded in an activity log.",
  },
  {
    q: "Can I bring my existing fleet and customers?",
    a: "Yes. You can add vehicles and customers manually or import them in bulk during onboarding, and our team will help you get set up.",
  },
  {
    q: "Is my business data isolated?",
    a: "Completely. Every business runs in its own workspace and your fleet, customers and payments are never visible to anyone else.",
  },
];
