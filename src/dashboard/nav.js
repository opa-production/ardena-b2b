// Sidebar navigation.
//
// `requires` names a capability from src/hooks/useRole.js. Items the signed-in
// role can't use are hidden rather than disabled — a greyed-out Finances tab
// tells a Viewer money exists but they may not look at it, which is worse than
// it simply not being there. Items with no `requires` are open to every role.
//
// `appOnly` marks a destination that only exists because the workspace has
// linked an Ardena consumer-app account. Until it does, these are hidden
// entirely rather than shown empty — a business doing direct bookings should
// not be navigating pages that can only ever be blank.
export const NAV_SECTIONS = [
  {
    label: "Operations",
    items: [
      { to: "/dashboard", key: "overview", name: "Overview", end: true },
      { to: "/dashboard/fleet", key: "fleet", name: "Fleet" },
      { to: "/dashboard/bookings", key: "bookings", name: "Bookings" },
      { to: "/dashboard/clients", key: "clients", name: "Clients" },
      { to: "/dashboard/chauffeurs", key: "chauffeurs", name: "Chauffeurs" },
      { to: "/dashboard/tracking", key: "tracking", name: "Vehicle tracking" },
      { to: "/dashboard/reviews", key: "reviews", name: "Reviews", appOnly: true },
      {
        to: "/dashboard/claims",
        key: "claims",
        name: "Claims & requests",
        requires: "claimsOrExtensions",
        appOnly: true,
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
      // A collapsible group rather than a destination of its own: `children`
      // makes the sidebar render a disclosure row with a chevron instead of a
      // link. The group has no `to` — clicking it opens the three pages
      // beneath it. Role and app-link gating is filtered on the children, so
      // a group whose children all disappear disappears with them.
      {
        key: "account",
        name: "Account",
        requires: "manageBilling",
        children: [
          { to: "/dashboard/usage", key: "usage", name: "Usage" },
          { to: "/dashboard/billing", key: "billing", name: "Billing" },
          { to: "/dashboard/plans", key: "plans", name: "Plans" },
        ],
      },
    ],
  },
  {
    label: "Workspace",
    items: [
      // Workspace items are pure B2B: they exist whether or not the business
      // is on the Ardena app, and every role can read them. Never add `appOnly`
      // or a `requires` here — the pages gate their own write actions instead.
      { to: "/dashboard/staff", key: "staff", name: "Staff & roles" },
      { to: "/dashboard/notifications", key: "notifications", name: "Notifications" },
      { to: "/dashboard/support", key: "support", name: "Support" },
    ],
  },
];

const allowed = (item, can, appLinked) =>
  (!item.requires || can(item.requires)) && (!item.appOnly || appLinked);

/** NAV_SECTIONS with items the signed-in role can't reach removed, app-only
 *  destinations dropped when no Ardena app account is linked, and any section
 *  that empties out dropped with them. Grouped items are filtered a level
 *  deeper, and a group left with no children is dropped like any other item. */
export function visibleSections(can, appLinked = false) {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items
      .filter((item) => allowed(item, can, appLinked))
      .map((item) =>
        item.children
          ? { ...item, children: item.children.filter((c) => allowed(c, can, appLinked)) }
          : item
      )
      .filter((item) => !item.children || item.children.length > 0),
  })).filter((section) => section.items.length > 0);
}

export const SECTION_TITLES = {
  fleet: "Fleet",
  bookings: "Bookings",
  clients: "Clients",
  chauffeurs: "Chauffeurs",
  tracking: "Vehicle tracking",
  reviews: "Reviews",
  claims: "Claims & requests",
  verification: "Verification",
  payments: "Finances",
  usage: "Usage",
  billing: "Billing",
  plans: "Plans",
  staff: "Staff & roles",
  notifications: "Notifications",
  support: "Support",
};
