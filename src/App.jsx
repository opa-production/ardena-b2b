import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
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
import Verification from "./dashboard/Verification";
import VerificationsList from "./dashboard/VerificationsList";
import Payments from "./dashboard/Payments";
import PaymentsList from "./dashboard/PaymentsList";
import Staff from "./dashboard/Staff";
import Billing from "./dashboard/Billing";
import Support from "./dashboard/Support";
import Notifications from "./dashboard/Notifications";
import Settings from "./dashboard/Settings";
import Placeholder from "./dashboard/Placeholder";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<Overview />} />
        <Route path="fleet" element={<Fleet />} />
        <Route path="fleet/new" element={<AddVehicle />} />
        <Route path="fleet/:plate" element={<VehicleDetails />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="bookings/new" element={<NewBooking />} />
        <Route path="bookings/:ref" element={<BookingDetails />} />
        <Route path="clients" element={<Clients />} />
        <Route path="clients/:id" element={<ClientDetails />} />
        <Route path="verification" element={<Verification />} />
        <Route path="verification/all" element={<VerificationsList />} />
        <Route path="payments" element={<Payments />} />
        <Route path="payments/all" element={<PaymentsList />} />
        <Route path="staff" element={<Staff />} />
        <Route path="billing" element={<Billing />} />
        <Route path="support" element={<Support />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="settings" element={<Settings />} />
        <Route path=":section" element={<Placeholder />} />
      </Route>
    </Routes>
  );
}
