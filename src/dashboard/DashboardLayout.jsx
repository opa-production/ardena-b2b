import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { NAV_SECTIONS } from "./nav";
import { ICONS } from "./icons";
import {
  subscribe as subscribeNotifs,
  getNotifications,
} from "./notificationsStore";
import {
  subscribe as subscribeSupport,
  getState as getSupportState,
} from "./supportStore";
import {
  subscribe as subscribeBusiness,
  getBusiness,
  setBusiness,
  hydrateBusiness,
  businessInitial,
} from "./businessStore";
import { hydrateOnboarding } from "./onboardingStore";
import { hydratePolicy } from "./policyStore";
import {
  fetchMe,
  fetchBusiness,
  fetchPolicy,
  fetchOnboarding,
  logout,
} from "../lib/api";
import Logo from "../components/Logo";
import VerifiedBadge from "../components/VerifiedBadge";
import usePageTitle from "../hooks/usePageTitle";
import PageSkeleton from "./PageSkeleton";
import Toasts from "./Toasts";
import "./dashboard.css";

export default function DashboardLayout() {
  usePageTitle("Dashboard");
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const footRef = useRef(null);

  const notifications = useSyncExternalStore(subscribeNotifs, getNotifications);
  const unread = notifications.filter((n) => !n.read).length;
  const supportUnread = useSyncExternalStore(subscribeSupport, getSupportState).unread;
  const business = useSyncExternalStore(subscribeBusiness, getBusiness);

  // hydrate the session: profile, business, policy + onboarding from the API
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { user, business: biz } = await fetchMe();
        if (!alive) return;
        const name = biz?.name || biz?.business_name || user?.business_name;
        if (name) setBusiness({ name });

        const [businessData, policyData, onboarding] = await Promise.all([
          fetchBusiness().catch(() => null),
          fetchPolicy().catch(() => null),
          fetchOnboarding().catch(() => null),
        ]);
        if (!alive) return;
        if (businessData) hydrateBusiness(businessData);
        if (policyData) hydratePolicy(policyData);
        if (onboarding) hydrateOnboarding(onboarding);
      } catch {
        /* a dead session is cleared by the client; RequireAuth redirects */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function handleLogout() {
    setMenuOpen(false);
    await logout();
    navigate("/login");
  }

  // brief skeleton on every route change, standing in for real data fetches
  const [pageLoading, setPageLoading] = useState(true);
  useEffect(() => {
    setPageLoading(true);
    const t = setTimeout(() => setPageLoading(false), 600);
    return () => clearTimeout(t);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e) {
      if (!footRef.current?.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  function go(to) {
    setMenuOpen(false);
    navigate(to);
  }

  return (
    <div className="dash">
      <aside className="sidebar">
        <Logo className="sidebar-logo" />

        <nav className="sidebar-nav">
          {NAV_SECTIONS.map((section) => (
            <div className="nav-group" key={section.label}>
              <p className="nav-group-label">{section.label}</p>
              {section.items.map((item) => (
                <NavLink
                  key={item.key}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    "nav-item" + (isActive ? " active" : "")
                  }
                >
                  {ICONS[item.key]}
                  {item.name}
                  {item.key === "notifications" && unread > 0 && (
                    <span className="nav-badge">{unread}</span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot" ref={footRef}>
          {menuOpen && (
            <div className="tenant-menu" role="menu">
              <button type="button" role="menuitem" onClick={() => go("/dashboard/settings")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Profile
              </button>
              <button type="button" role="menuitem" onClick={() => go("/dashboard/billing")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <path d="M2 10h20" />
                </svg>
                Usage &amp; billing
              </button>
              <button type="button" role="menuitem" onClick={() => go("/dashboard/support")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M9.1 9a3 3 0 015.8 1c0 2-3 2.5-3 4" />
                  <path d="M12 17.5h.01" />
                </svg>
                Support
                {supportUnread > 0 && <span className="nav-badge">{supportUnread}</span>}
              </button>
              <button type="button" role="menuitem" onClick={handleLogout}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H6a2 2 0 01-2-2V5a2 2 0 012-2h3" />
                  <path d="M16 17l5-5-5-5M21 12H9" />
                </svg>
                Log out
              </button>
            </div>
          )}
          <button
            type="button"
            className={"tenant-chip" + (menuOpen ? " open" : "")}
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span className="tenant-avatar">
              {business.logo ? (
                <img src={business.logo} alt="" />
              ) : (
                businessInitial(business.name)
              )}
              {supportUnread > 0 && <span className="tenant-dot" aria-label="New support message" />}
            </span>
            <div>
              <p className="tenant-name">
                {business.name || "Your business"} <VerifiedBadge compact />
              </p>
              <p className="tenant-plan">Fleet plan</p>
            </div>
            <svg className="tenant-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 15l6-6 6 6" />
            </svg>
          </button>
        </div>
      </aside>

      <main className="dash-content">
        {pageLoading ? <PageSkeleton path={location.pathname} /> : <Outlet />}
      </main>

      <Toasts />
    </div>
  );
}
