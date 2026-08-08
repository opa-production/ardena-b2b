/* What the Ardena assistant knows about the B2B product.
 *
 * This file is deliberately data, not UI. Until the backend agent ships it is
 * the stand-in "brain" (matched by keyword in assistantStore.js). When the
 * real agent lands, this same corpus becomes its grounding material — the
 * system prompt / retrieval documents — so answers stay consistent across the
 * swap. Keep the numbers here in step with src/pages/pricingData.js.
 */

export const PRODUCT_FACTS = {
  rate: 400,
  launchRate: 200,
  launchMonths: 3,
  minimum: 2000,
  checkPrice: 100,
  trialDays: 14,
};

/* Each topic: keywords that route to it, a short answer, and where in the
   dashboard the user should go next. `to` renders as a jump link under the
   reply, so an answer is always one click from the actual screen. */
export const TOPICS = [
  {
    id: "pricing",
    keywords: ["price", "pricing", "cost", "how much", "rate", "bill", "billing", "subscription", "plan", "charge", "minimum"],
    answer:
      `You pay per vehicle on the platform: KES ${PRODUCT_FACTS.rate} a month each, or KES ${PRODUCT_FACTS.launchRate} for your first ${PRODUCT_FACTS.launchMonths} months. There's a KES ${PRODUCT_FACTS.minimum} monthly minimum, every module is included on every plan, and you can cancel anytime. New accounts get a ${PRODUCT_FACTS.trialDays} day free trial with no card required.`,
    to: { label: "Open usage & billing", path: "/dashboard/billing" },
  },
  {
    id: "verification",
    keywords: ["verify", "verification", "id check", "identity", "licence", "license", "kyc", "dojah", "liveness", "renter check"],
    answer:
      `Renter verification is pay as you go — a flat KES ${PRODUCT_FACTS.checkPrice} per check, drawn from a prepaid wallet you top up like airtime. One check covers ID lookup, a selfie liveness match and a driving licence check. Credits never expire and there's no monthly commitment. You can run a check from any booking, or share the QR code so the renter completes it on their own phone.`,
    to: { label: "Open verification", path: "/dashboard/verification" },
  },
  {
    id: "payments",
    keywords: ["payment", "pay", "mpesa", "m-pesa", "prompt", "stk", "collect", "deposit", "refund", "paystack", "invoice"],
    answer:
      "Your staff send a payment prompt from any booking and the customer approves it on their phone via M-Pesa. Every prompt is tracked end to end, so you can see what's pending, paid or failed without leaving the booking. Card payments are on the roadmap.",
    to: { label: "Open finances", path: "/dashboard/payments" },
  },
  {
    id: "fleet",
    keywords: ["fleet", "vehicle", "car", "add a car", "register", "logbook", "insurance", "inspection", "document", "expiry", "expiring"],
    answer:
      "Fleet holds every vehicle with its documents, rates and availability in one registry. Add a vehicle from Fleet → Add vehicle; once it has a rate and is marked available it becomes bookable. Ardena tracks insurance and inspection expiry dates and warns you before they lapse.",
    to: { label: "Open fleet", path: "/dashboard/fleet" },
  },
  {
    id: "bookings",
    keywords: ["booking", "reserve", "reservation", "calendar", "availability", "double book", "conflict", "check out", "check in", "handover"],
    answer:
      "Bookings covers the whole rental: create a reservation, confirm it, then record check-out and check-in with timestamped condition photos as your evidence layer for damage disputes. Availability conflicts are caught automatically, so the same car can't be booked twice over the same dates.",
    to: { label: "Open bookings", path: "/dashboard/bookings" },
  },
  {
    id: "clients",
    keywords: ["client", "customer", "renter", "profile", "history", "repeat"],
    answer:
      "Every customer gets a profile holding their bookings, payments and verification history, so your team can see who they're dealing with before handing over keys. You can add clients manually or import them in bulk during onboarding.",
    to: { label: "Open clients", path: "/dashboard/clients" },
  },
  {
    id: "chauffeurs",
    keywords: ["chauffeur", "driver", "assign a driver"],
    answer:
      "Chauffeurs are your drivers: keep their licence details and availability on file, then assign one to a booking when the customer wants a car with a driver.",
    to: { label: "Open chauffeurs", path: "/dashboard/chauffeurs" },
  },
  {
    id: "tracking",
    keywords: ["track", "tracking", "gps", "location", "map", "where is"],
    answer:
      "Tracking shows where vehicles on active rentals are, on a live map. If no Mapbox token is configured the map falls back to a schematic view — the positions still work.",
    to: { label: "Open tracking", path: "/dashboard/tracking" },
  },
  {
    id: "staff",
    keywords: ["staff", "team", "role", "permission", "invite", "seat", "access", "audit", "activity log"],
    answer:
      "Invite your team from Staff & roles and give each person a role — admin, booking agent or finance — so they only see what they should. Seats are unlimited on the Fleet plan, and every action is written to an activity log you can audit later.",
    to: { label: "Open staff & roles", path: "/dashboard/staff" },
  },
  {
    id: "marketplace",
    keywords: ["marketplace", "listing", "public", "visibility", "list my cars", "b2c"],
    answer:
      "Marketplace visibility puts selected vehicles in front of renters browsing Ardena. You choose which cars are listed and what they show — nothing is published without you switching it on.",
    to: { label: "Open settings", path: "/dashboard/settings" },
  },
  {
    id: "notifications",
    keywords: ["notification", "alert", "reminder", "email", "notify"],
    answer:
      "Notifications keep your team ahead of bookings, payments and expiring vehicle documents in real time. You can review everything that's fired from the Notifications page.",
    to: { label: "Open notifications", path: "/dashboard/notifications" },
  },
  {
    id: "reports",
    keywords: ["report", "analytics", "revenue", "utilisation", "utilization", "export", "performance"],
    answer:
      "Reports cover revenue, fleet utilisation and vehicle performance, kept up to date as bookings close. You can export any report if you need it outside the dashboard.",
    to: { label: "Open overview", path: "/dashboard" },
  },
  {
    id: "data",
    keywords: ["data", "isolated", "tenant", "privacy", "secure", "security", "other business", "who can see"],
    answer:
      "Every business runs in its own workspace. Your fleet, customers and payments are scoped to your account and are never visible to another business on Ardena.",
    to: null,
  },
  {
    id: "support",
    keywords: ["support", "human", "agent", "contact", "help me", "talk to someone", "phone", "whatsapp"],
    answer:
      "I can handle product questions here. For anything account-specific — a stuck payment, a verification you want reviewed manually — Support puts you through to a person, Mon–Sat 8am–8pm EAT.",
    to: { label: "Message support", path: "/dashboard/support" },
  },
];

/* Shown as chips above the composer on an empty thread. */
export const SUGGESTIONS = [
  "How does verification billing work?",
  "How do I collect a deposit over M-Pesa?",
  "What's in my fleet right now?",
  "How do I give a booking agent limited access?",
];

export const GREETING =
  "Hi — I'm the Ardena assistant. Ask me how anything on the platform works, or about what's in your own workspace: fleet, bookings, payments, verification and billing.";

export const FALLBACK =
  "I don't have a confident answer for that one yet. I can help with fleet, bookings, clients, chauffeurs, tracking, verification, payments, staff roles, notifications, reports and billing — or Support will put you through to a person.";
