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
   Pricing — launch phase. Mirrors docs/BACKEND.md §4; keep them in step.
   ---------------------------------------------------------------------------
   Ardena for Business is FREE for a workspace's first FREE_MONTHS months.
   Subscription pricing has not been set yet: it will be announced, and every
   existing workspace told, well before anyone is charged. Nothing on the
   marketing site or in the dashboard may quote a subscription figure until
   then — an unannounced number that later changes is worse than no number.

   The earlier model (KES 400 per vehicle per month, a 3-vehicle minimum, and
   a 9% Ardena-app commission credit against the bill) has been removed rather
   than hidden, so nothing can quote it by accident. It is in git history at
   commit 173f9b3 if the next model builds on it.

   Renter verification is the one thing that IS charged during the free
   months, and it is unchanged: CHECK_PRICE per check, drawn from a prepaid
   wallet. It is a genuine pass-through cost with unpredictable volume, so it
   never sat inside the subscription and does not sit inside the free period
   either. This is the only price the UI may state. */

/** Months free from signup. The whole launch offer, in one number. */
export const FREE_MONTHS = 2;

/** KES per renter verification check, drawn from the prepaid wallet.
 *  Charged during the free months too — see the note above. */
export const CHECK_PRICE = 100;

/* The plan grid.
 *
 * Three tiers, and only the first has a price — because only the first is
 * true today. `price: null` means "not announced yet" and renders as "Soon";
 * `price: 0` renders "Free". Launching pricing is therefore one number per
 * tier in this file, with no markup to touch and no layout that shifts when
 * the figures arrive.
 *
 * The `fleet` and `enterprise` tiers are placeholders for the shape we expect,
 * not committed product. Their names and feature lines should be confirmed
 * before the prices are.
 */
export const TIERS = [
  {
    key: "free",
    name: "Free",
    price: 0,
    per: `for ${FREE_MONTHS} months`,
    blurb: "Everything, for your first two months. No card required.",
    cta: { label: "Get started free", to: "/signup", solid: true },
    features: [
      "Every module: fleet, bookings, clients, staff, reports",
      "Unlimited vehicles, bookings and staff seats",
      "M-Pesa and card payment prompting",
      "Document expiry alerts and exports",
      "Email support",
    ],
    // Shown rather than hidden: nobody should meet this on an invoice.
    muted: [`Renter checks, KES ${CHECK_PRICE} each, from your wallet`],
  },
  {
    key: "fleet",
    name: "Fleet",
    price: null,
    per: "per month",
    blurb:
      "For a rental business running its own fleet. What the free months become.",
    cta: { label: "Get started free", to: "/signup" },
    features: [
      "Everything in Free, kept",
      "Priced per vehicle, so a small fleet pays like one",
      "Announced well before your free months end",
    ],
    muted: [],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: null,
    per: "custom",
    blurb: "For large fleets, multiple branches and bespoke terms.",
    cta: { label: "Talk to us", to: "/contact" },
    features: [
      "Everything in Fleet",
      "Volume terms for 100+ vehicles",
      "Onboarding help and a named contact",
    ],
    muted: [],
  },
];

export const fmtKES = (n) => (Number(n) || 0).toLocaleString("en-KE");
