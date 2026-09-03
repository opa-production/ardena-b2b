/* Every dashboard screen, as a dynamic import.
 *
 * The whole app used to build into one 516 KB script, and the dashboard is
 * roughly ten times the weight of the public site — so anyone landing on the
 * marketing pages or the sign-in form downloaded the entire back office before
 * they could read a headline, and paid for it on the slowest connection they
 * were ever going to have with us.
 *
 * Splitting per route fixes that, and would ordinarily trade it for a small
 * pause the first time each page is opened. `preloadCommonPages` buys that
 * back: once the dashboard shell is up and idle, the handful of screens people
 * actually move between are fetched in the background, so by the time anyone
 * clicks the sidebar the chunk is already there.
 *
 * The loaders live here rather than inline in App.jsx so the preloader can
 * reference the same functions — a second `import()` of a module already in
 * flight or already loaded resolves from the module registry, it does not
 * fetch twice.
 */

export const load = {
  layout: () => import("./DashboardLayout"),

  overview: () => import("./Overview"),
  fleet: () => import("./Fleet"),
  addVehicle: () => import("./AddVehicle"),
  vehicleDetails: () => import("./VehicleDetails"),
  marketplaceListing: () => import("./MarketplaceListing"),
  bookings: () => import("./Bookings"),
  newBooking: () => import("./NewBooking"),
  bookingDetails: () => import("./BookingDetails"),
  clients: () => import("./Clients"),
  clientDetails: () => import("./ClientDetails"),
  chauffeurs: () => import("./Chauffeurs"),
  addChauffeur: () => import("./AddChauffeur"),
  chauffeurDetails: () => import("./ChauffeurDetails"),
  tracking: () => import("./Tracking"),
  trackingDetails: () => import("./TrackingDetails"),
  verification: () => import("./Verification"),
  verificationsList: () => import("./VerificationsList"),
  payments: () => import("./Payments"),
  paymentsList: () => import("./PaymentsList"),
  staff: () => import("./Staff"),
  usage: () => import("./Usage"),
  settlements: () => import("./Settlements"),
  marketing: () => import("./Marketing"),
  featureRequest: () => import("./FeatureRequest"),
  support: () => import("./Support"),
  notifications: () => import("./Notifications"),
  settings: () => import("./Settings"),
  workspaceSettings: () => import("./WorkspaceSettings"),
  renterInbox: () => import("./RenterInbox"),
  claims: () => import("./Claims"),
  ratings: () => import("./Ratings"),
  placeholder: () => import("./Placeholder"),
};

/* The screens a working day actually moves between. Not the whole list: the
   point is to be ready for the likely click, not to quietly re-download the
   bundle we just finished splitting up. */
const COMMON = ["overview", "fleet", "bookings", "bookingDetails", "clients", "payments"];

let preloaded = false;

/** Warm the common chunks once the shell is idle. Safe to call more than
 *  once; it only ever runs its list a single time. */
export function preloadCommonPages() {
  if (preloaded || typeof window === "undefined") return;
  preloaded = true;

  const run = () => COMMON.forEach((key) => load[key]?.().catch(() => {}));

  // requestIdleCallback where it exists, a generous timeout where it doesn't —
  // either way this must never compete with the page's own data fetches.
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 4000 });
  } else {
    setTimeout(run, 1500);
  }
}
