import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import DashboardLayout from "./dashboard/DashboardLayout";
import Overview from "./dashboard/Overview";
import Fleet from "./dashboard/Fleet";
import Placeholder from "./dashboard/Placeholder";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<Overview />} />
        <Route path="fleet" element={<Fleet />} />
        <Route path=":section" element={<Placeholder />} />
      </Route>
    </Routes>
  );
}
