import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  subscribe as subscribeTheme,
  getTheme,
  applyTheme,
  clearTheme,
  toggleTheme,
} from "./themeStore";
import { NAV_SECTIONS } from "./nav";
import { ICONS } from "./icons";
import {
  subscribe as subscribeBusiness,
  getBusiness,
  setBusiness,
  hydrateBusiness,
  businessInitial,
} from "./businessStore";
import { hydrateOnboarding } from "./onboardingStore";
import { hydratePolicy } from "./policyStore";
import { hydrateFleet } from "./fleetStore";
import {
  fetchMe,
  fetchBusiness,
  fetchPolicy,
  fetchOnboarding,
  fetchUnreadCount,
  fetchSupportUnread,
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
  const [navOpen, setNavOpen] = useState(false);
  const footRef = useRef(null);

  const [unread, setUnread] = useState(0);
  const [supportUnread, setSupportUnread] = useState(0);
  const business = useSyncExternalStore(subscribeBusiness, getBusiness);
  const theme = useSyncExternalStore(subscribeTheme, getTheme);

  // Paint the saved theme onto <html> while inside the dashboard; drop it on the
  // way out so marketing/auth pages always render light.
  useLayoutEffect(() => {
    applyTheme();
    return () => clearTheme();
  }, []);

  // hydrate the session: profile, business, policy, onboarding + fleet
  useEffect(() => {
    let alive = true;
    hydrateFleet().catch(() => {}); // every page reads the fleet store
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

  // Poll unread counts every 60 s — notifications + support badge
  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const [notifData, supportData] = await Promise.allSettled([
          fetchUnreadCount(),
          fetchSupportUnread(),
        ]);
        if (!alive) return;
        if (notifData.status === "fulfilled") setUnread(notifData.value.unread_count);
        if (supportData.status === "fulfilled") setSupportUnread(supportData.value.unread_count);
      } catch {
        // silent
      }
    }
    poll();
    const id = setInterval(poll, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
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
    setNavOpen(false); // close the mobile drawer whenever we navigate
    const t = setTimeout(() => setPageLoading(false), 600);
    return () => clearTimeout(t);
  }, [location.pathname]);

  // mobile drawer: lock body scroll while open, close on Escape
  useEffect(() => {
    if (!navOpen) return;
    function onKey(e) {
      if (e.key === "Escape") setNavOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [navOpen]);

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
    <div className={"dash" + (navOpen ? " nav-open" : "")}>
      <header className="dash-topbar">
        <button
          type="button"
          className="nav-toggle"
          onClick={() => setNavOpen((o) => !o)}
          aria-label={navOpen ? "Close menu" : "Open menu"}
          aria-expanded={navOpen}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
        <Logo className="topbar-logo" />
        {unread > 0 && <span className="topbar-badge" aria-label={`${unread} unread`}>{unread}</span>}
      </header>

      {navOpen && (
        <div className="nav-backdrop" onClick={() => setNavOpen(false)} aria-hidden="true" />
      )}

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
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={theme === "dark"}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTheme();
                }}
              >
                {theme === "dark" ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
                  </svg>
                )}
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </button>
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
