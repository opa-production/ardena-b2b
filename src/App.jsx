import { useSyncExternalStore } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { subscribe as subscribeAuth, isAuthed } from "./lib/authStore";
import Landing from "./pages/Landing";
import Pricing from "./pages/Pricing";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyBusiness from "./pages/VerifyBusiness";
import AcceptInvite from "./pages/AcceptInvite";
import DashboardLayout from "./dashboard/DashboardLayout";
import Overview from "./dashboard/Overview";
import Fleet from "./dashboard/Fleet";
import AddVehicle from "./dashboard/AddVehicle";
import VehicleDetails from "./dashboard/VehicleDetails";
import Bookings from "./dashboard/Bookings";
import NewBooking from "./dashboard/NewBooking";
import BookingDetails from "./dashboard/BookingDetails";
import Clients from "./dashboard/Clients";
import ClientDetails from "./dashboard/ClientDetails";
import Chauffeurs from "./dashboard/Chauffeurs";
import AddChauffeur from "./dashboard/AddChauffeur";
import ChauffeurDetails from "./dashboard/ChauffeurDetails";
import Tracking from "./dashboard/Tracking";
import TrackingDetails from "./dashboard/TrackingDetails";
import Verification from "./dashboard/Verification";
import VerificationsList from "./dashboard/VerificationsList";
import Payments from "./dashboard/Payments";
import PaymentsList from "./dashboard/PaymentsList";
import Staff from "./dashboard/Staff";
import Usage from "./dashboard/Usage";
import Marketing from "./dashboard/Marketing";
import FeatureRequest from "./dashboard/FeatureRequest";
import Settlements from "./dashboard/Settlements";
import Support from "./dashboard/Support";
import Notifications from "./dashboard/Notifications";
import Settings from "./dashboard/Settings";
import WorkspaceSettings from "./dashboard/WorkspaceSettings";
import Placeholder from "./dashboard/Placeholder";
import NotFound from "./pages/NotFound";
import MarketplaceListing from "./dashboard/MarketplaceListing";
import RequireRole from "./dashboard/RequireRole";
import RequireAppLink from "./dashboard/RequireAppLink";
import RenterInbox from "./dashboard/RenterInbox";
import Claims from "./dashboard/Claims";
import Ratings from "./dashboard/Ratings";

// Gate the dashboard behind a session; reacts to the session being
// cleared (e.g. an expired token) by bouncing back to sign-in.
function RequireAuth({ children }) {
  const authed = useSyncExternalStore(subscribeAuth, isAuthed);
  return authed ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ForgotPassword startAtReset />} />
      <Route path="/v/:slug" element={<VerifyBusiness />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Overview />} />
        <Route path="fleet" element={<Fleet />} />
        <Route
          path="fleet/new"
          element={<RequireRole capability="manageFleet"><AddVehicle /></RequireRole>}
        />
        <Route path="fleet/:plate" element={<VehicleDetails />} />
        <Route
          path="fleet/:plate/marketplace"
          element={<RequireAppLink><RequireRole capability="manageListing"><MarketplaceListing /></RequireRole></RequireAppLink>}
        />
        <Route path="bookings" element={<Bookings />} />
        <Route
          path="bookings/new"
          element={<RequireRole capability="manageBookings"><NewBooking /></RequireRole>}
        />
        <Route path="bookings/:ref" element={<BookingDetails />} />
        <Route
          path="claims"
          element={<RequireAppLink><RequireRole capability="claimsOrExtensions"><Claims /></RequireRole></RequireAppLink>}
        />
        {/* No longer in the sidebar — Support lists renter conversations and
            links here for the full thread. The page itself is still the place
            you read and reply, so it keeps its route and its guards. */}
        <Route
          path="renter-messages"
          element={<RequireAppLink><RequireRole capability="renterInbox"><RenterInbox /></RequireRole></RequireAppLink>}
        />
        <Route path="reviews" element={<RequireAppLink><Ratings /></RequireAppLink>} />
        <Route path="clients" element={<Clients />} />
        <Route path="clients/:id" element={<ClientDetails />} />
        <Route path="chauffeurs" element={<Chauffeurs />} />
        <Route
          path="chauffeurs/new"
          element={<RequireRole capability="manageFleet"><AddChauffeur /></RequireRole>}
        />
        <Route path="chauffeurs/:id" element={<ChauffeurDetails />} />
        <Route path="tracking" element={<Tracking />} />
        <Route path="tracking/:plate" element={<TrackingDetails />} />
        <Route path="verification" element={<Verification />} />
        <Route path="verification/all" element={<VerificationsList />} />
        <Route
          path="payments"
          element={<RequireRole capability="manageBilling"><Payments /></RequireRole>}
        />
        <Route
          path="payments/all"
          element={<RequireRole capability="manageBilling"><PaymentsList /></RequireRole>}
        />
        {/* Same Finances page, opened on the Ardena-app tab — keeps old links
            and bookmarks working now that App earnings isn't its own page. */}
        <Route
          path="payments/marketplace"
          element={<RequireRole capability="viewMoney"><Payments /></RequireRole>}
        />
        <Route path="staff" element={<Staff />} />
        {/* Reaching this workspace's own clients — a send costs the
            business and speaks in its name, hence its own capability. */}
        <Route
          path="marketing"
          element={<RequireRole capability="sendMarketing"><Marketing /></RequireRole>}
        />
        <Route path="feature-request" element={<FeatureRequest />} />
        {/* The Account group in the sidebar. Usage and Billing were two
            pages until the invoice list moved under the spend chart; /billing
            stays as a redirect because it is linked from the payment wall,
            old emails and bookmarks. Plans lives on the public /pricing page,
            not in here. */}
        <Route
          path="usage"
          element={<RequireRole capability="manageBilling"><Usage /></RequireRole>}
        />
        <Route path="billing" element={<Navigate to="/dashboard/usage" replace />} />
        <Route
          path="settlements"
          element={<RequireRole capability="manageBilling"><Settlements /></RequireRole>}
        />
        <Route path="support" element={<Support />} />
        <Route path="notifications" element={<Notifications />} />
        {/* Profile, and the gear on it — what the business IS, and how it's
            set up. See WorkspaceSettings.jsx for the split. */}
        <Route path="settings" element={<Settings />} />
        <Route path="settings/preferences" element={<WorkspaceSettings />} />
        <Route path=":section" element={<Placeholder />} />
      </Route>
      {/* Anything that is not a route at all — a typo, a dead link, an old
          bookmark. Dashboard sections keep their own coming-soon page above;
          this is for addresses that were never going to exist. */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
