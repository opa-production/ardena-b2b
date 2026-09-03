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
import { B2C_MARKETPLACE, MARKETING, VEHICLE_TRACKING } from "../lib/features";

export const NAV_SECTIONS = [
  {
    label: "Operations",
    items: [
      { to: "/dashboard", key: "overview", name: "Overview", end: true },
      { to: "/dashboard/fleet", key: "fleet", name: "Fleet" },
      { to: "/dashboard/bookings", key: "bookings", name: "Bookings" },
      { to: "/dashboard/clients", key: "clients", name: "Clients" },
      { to: "/dashboard/chauffeurs", key: "chauffeurs", name: "Chauffeurs" },
      // `soon` renders a muted tag in the sidebar — the page is a coming-soon
      // state until VEHICLE_TRACKING flips (see lib/features.js).
      { to: "/dashboard/tracking", key: "tracking", name: "Tracking", soon: !VEHICLE_TRACKING },
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
      // link. The group has no `to` — clicking it opens the pages beneath it.
      // Role and app-link gating is filtered on the children, so a group whose
      // children all disappear disappears with them.
      //
      // Plans is deliberately not here: what the bands cost is a marketing
      // question, answered once on the public /pricing page rather than
      // duplicated inside the dashboard.
      {
        key: "account",
        name: "Account",
        requires: "manageBilling",
        children: [
          { to: "/dashboard/usage", key: "usage", name: "Usage & billing" },
          { to: "/dashboard/settlements", key: "settlements", name: "Settlements" },
        ],
      },
      // Last in the section, under the Account group: reaching clients is the
      // thing you do once the money side is in order, and it is the only item
      // here that sends something outward.
      {
        to: "/dashboard/marketing",
        key: "marketing",
        name: "Marketing",
        requires: "sendMarketing",
        // same muted tag Tracking wears — the page is a coming-soon state
        // until MARKETING flips (see lib/features.js)
        soon: !MARKETING,
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
  (!item.requires || can(item.requires)) &&
  (!item.appOnly || (appLinked && B2C_MARKETPLACE));

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
  tracking: "Tracking",
  reviews: "Reviews",
  claims: "Claims & requests",
  verification: "Verification",
  payments: "Finances",
  usage: "Usage & billing",
  settlements: "Settlements",
  staff: "Staff & roles",
  marketing: "Marketing",
  // Not a sidebar item — it lives in the profile menu — but the page still
  // needs a title when it is the current route.
  "feature-request": "Feature request",
  notifications: "Notifications",
  support: "Support",
};
