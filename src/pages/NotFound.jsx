import { Link, useLocation } from "react-router-dom";
import usePageTitle from "../hooks/usePageTitle";
import { getSession } from "../lib/authStore";
import notFoundArt from "../assets/404.svg";
import "../dashboard/coming.css";

/* Whatever isn't a route.
 *
 * Two ways out rather than one, because the two people who land here need
 * different things: someone signed in mistyped a dashboard path and wants to
 * be back at work, and everyone else wants the site. The signed-in check is
 * read once at render — this page has nothing to keep in sync.
 *
 * The path is echoed back so a mistyped or truncated link is obvious at a
 * glance; it is rendered as text, never as a link. */
export default function NotFound() {
  usePageTitle("Page not found");
  const { pathname } = useLocation();
  const signedIn = Boolean(getSession().token);

  return (
    <div className="notfound">
      <div className="coming">
        <img className="coming-art" src={notFoundArt} alt="" />
        <h2 className="coming-title">This page doesn&apos;t exist</h2>
        <p className="coming-note">
          Nothing lives at <strong>{pathname}</strong>. The link may be out of
          date, or the address may have a typo in it.
        </p>
        <div className="coming-action">
          {signedIn && (
            <Link to="/dashboard" className="btn btn-primary">
              Back to dashboard
            </Link>
          )}
          <Link to="/" className={signedIn ? "btn btn-ghost" : "btn btn-primary"}>
            Go to the homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
