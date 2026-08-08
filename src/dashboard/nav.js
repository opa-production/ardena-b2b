// Sidebar navigation.
//
// `requires` names a capability from src/hooks/useRole.js. Items the signed-in
// role can't use are hidden rather than disabled — a greyed-out Finances tab
// tells a Viewer money exists but they may not look at it, which is worse than
// it simply not being there. Items with no `requires` are open to every role.
export const NAV_SECTIONS = [
  {
    label: "Operations",
    items: [
      { to: "/dashboard", key: "overview", name: "Overview", end: true },
      { to: "/dashboard/fleet", key: "fleet", name: "Fleet" },
      { to: "/dashboard/bookings", key: "bookings", name: "Bookings" },
      { to: "/dashboard/clients", key: "clients", name: "Clients" },
      { to: "/dashboard/chauffeurs", key: "chauffeurs", name: "Chauffeurs" },
      {
        to: "/dashboard/renter-messages",
        key: "inbox",
        name: "Renter messages",
        requires: "renterInbox",
      },
      { to: "/dashboard/reviews", key: "reviews", name: "Reviews" },
      {
        to: "/dashboard/claims",
        key: "claims",
        name: "Claims & requests",
        requires: "claimsOrExtensions",
      },
    ],
  },
  {
    label: "Trust & money",
    items: [
      { to: "/dashboard/verification", key: "verification", name: "Verification" },
      // One money page. App earnings live inside it as a tab rather than a
      // separate destination — see Payments.jsx.
      {
        to: "/dashboard/payments",
        key: "payments",
        name: "Finances",
        requires: "manageBilling",
      },
    ],
  },
  {
    label: "Workspace",
    items: [
      {
        to: "/dashboard/staff",
        key: "staff",
        name: "Staff & roles",
        requires: "manageStaff",
      },
      { to: "/dashboard/notifications", key: "notifications", name: "Notifications" },
    ],
  },
];

/** NAV_SECTIONS with items the signed-in role can't reach removed, and any
 *  section that empties out dropped with them. */
export function visibleSections(can) {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.requires || can(item.requires)),
  })).filter((section) => section.items.length > 0);
}

export const SECTION_TITLES = {
  fleet: "Fleet",
  bookings: "Bookings",
  clients: "Clients",
  chauffeurs: "Chauffeurs",
  reviews: "Reviews",
  claims: "Claims & requests",
  verification: "Verification",
  payments: "Finances",
  staff: "Staff & roles",
  notifications: "Notifications",
};
