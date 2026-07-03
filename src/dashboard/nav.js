// Sidebar navigation — placeholder links for modules we'll build next.
export const NAV_SECTIONS = [
  {
    label: "Operations",
    items: [
      { to: "/dashboard", key: "overview", name: "Overview", end: true },
      { to: "/dashboard/fleet", key: "fleet", name: "Fleet" },
      { to: "/dashboard/bookings", key: "bookings", name: "Bookings" },
      { to: "/dashboard/clients", key: "clients", name: "Clients" },
    ],
  },
  {
    label: "Trust & money",
    items: [
      { to: "/dashboard/verification", key: "verification", name: "Verification" },
      { to: "/dashboard/payments", key: "payments", name: "Payments" },
    ],
  },
  {
    label: "Workspace",
    items: [
      { to: "/dashboard/staff", key: "staff", name: "Staff & roles" },
      { to: "/dashboard/notifications", key: "notifications", name: "Notifications" },
      { to: "/dashboard/settings", key: "settings", name: "Settings" },
    ],
  },
];

export const SECTION_TITLES = {
  fleet: "Fleet",
  bookings: "Bookings",
  clients: "Clients",
  verification: "Verification",
  payments: "Payments",
  staff: "Staff & roles",
  notifications: "Notifications",
  settings: "Settings",
};
