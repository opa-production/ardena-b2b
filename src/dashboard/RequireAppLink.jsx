import { useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { subscribe, getBusiness } from "./businessStore";
import usePageTitle from "../hooks/usePageTitle";
import EmptyState, { EMPTY_ICONS } from "./EmptyState";

function NotLinked() {
  usePageTitle("Not connected");
  return (
    <EmptyState
      icon={EMPTY_ICONS.clients}
      title="Not connected yet"
      message="This one needs an Ardena app account."
      action={
        <Link className="btn btn-primary" to="/dashboard/settings">
          Open profile
        </Link>
      }
    />
  );
}

/**
 * Route guard for pages that only exist because of the Ardena consumer app.
 *
 * The nav already hides these, so this catches the other ways in — a typed URL,
 * a bookmark from before a workspace unlinked, a link pasted by a colleague. It
 * explains rather than redirecting, so a stale bookmark doesn't look like a
 * broken page.
 */
export default function RequireAppLink({ children }) {
  const business = useSyncExternalStore(subscribe, getBusiness);
  return business.appLinked ? children : <NotLinked />;
}
