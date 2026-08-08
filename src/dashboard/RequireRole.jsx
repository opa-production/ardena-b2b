import { Link } from "react-router-dom";
import useRole from "../hooks/useRole";
import usePageTitle from "../hooks/usePageTitle";
import EmptyState, { EMPTY_ICONS } from "./EmptyState";

function RoleBlocked({ role }) {
  usePageTitle("Not available");
  return (
    <EmptyState
      icon={EMPTY_ICONS.verification}
      title="Not available on your account"
      message={
        `Your role${role ? ` (${role})` : ""} doesn't include this section. ` +
        "An Owner can change it under Staff & roles."
      }
      action={
        <Link className="btn-ghost" to="/dashboard">
          Back to overview
        </Link>
      }
    />
  );
}

/**
 * Route guard for pages a role can't use.
 *
 * Hiding the nav entry stops people stumbling in; this stops them arriving by
 * typed URL, bookmark, or a link a colleague pasted in chat. It explains rather
 * than redirecting — silently bouncing someone to the overview looks like a
 * broken link, so they just try again.
 *
 * The page title is set inside `RoleBlocked` rather than here: a parent's
 * effects run *after* its children's, so calling usePageTitle at this level
 * would overwrite whatever title the wrapped page just set.
 *
 *   <Route path="payments" element={
 *     <RequireRole capability="manageBilling"><Payments /></RequireRole>
 *   } />
 */
export default function RequireRole({ capability, children }) {
  const { can, role } = useRole();
  return can(capability) ? children : <RoleBlocked role={role} />;
}
