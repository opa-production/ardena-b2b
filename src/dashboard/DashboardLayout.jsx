import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  subscribe as subscribeTheme,
  getTheme,
  applyTheme,
  clearTheme,
  toggleTheme,
} from "./themeStore";
import { visibleSections } from "./nav";
import NavGroup from "./NavGroup";
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
import { hydrateConfig } from "./configStore";
import { hydrateChauffeurs } from "./chauffeursStore";
import { hydrateTracking } from "./trackingStore";
import PageSkeleton from "./PageSkeleton";
import { preloadCommonPages } from "./pageLoaders";
import {
  subscribe as subscribeUnread,
  getUnread,
  startUnreadPolling,
} from "./unreadStore";
import {
  fetchMe,
  fetchBusiness,
  fetchPolicy,
  fetchOnboarding,
  fetchBillingGate,
  fetchHostLinkSuggestion,
  logout,
} from "../lib/api";
import Logo from "../components/Logo";
import { HOST_ACCOUNT_LINKING, VEHICLE_TRACKING } from "../lib/features";
import usePageTitle from "../hooks/usePageTitle";
import useRole from "../hooks/useRole";
import HostLinkDialog from "./HostLinkDialog";
import ConfirmDialog from "../components/ConfirmDialog";
import AssistantLauncher from "./AssistantLauncher";
import Toasts from "./Toasts";
import "./dashboard.css";

/* The dark theme is built and working, but the toggle is parked while the
   light palette settles. Flip this back to true to return "Dark mode" to the
   tenant menu — themeStore and every [data-theme="dark"] rule stay live, so
   nothing else has to change. */
const SHOW_THEME_TOGGLE = false;

function PaymentWall({ gate }) {
  const navigate = useNavigate();
  const fmtAmt = (n) => Number(n).toLocaleString("en-KE");
  return (
    <div className="pay-wall">
      <div className="pay-wall-card">
        <div className="pay-wall-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h2>Subscription past due</h2>
        <p>Your dashboard is paused. Settle your outstanding balance to continue.</p>
        <div className="pay-wall-amount">
          <span className="pay-wall-detail">
            {gate.vehicle_count} vehicle{gate.vehicle_count !== 1 ? "s" : ""} × KES 200 / month
          </span>
          <span className="pay-wall-total">KES {fmtAmt(gate.due_amount)}</span>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => navigate("/dashboard/usage")}>
          Go to billing
        </button>
        <button type="button" className="btn btn-ghost" style={{ width: "100%", marginTop: "8px" }} onClick={() => navigate("/dashboard/support")}>
          Contact support
        </button>
      </div>
    </div>
  );
}

// Session-scoped so "not now" stops the nagging for this visit but the offer
// comes back next time they sign in.
const HOST_LINK_DISMISSED = "ardena-hostlink-dismissed";

export default function DashboardLayout() {
  usePageTitle("Dashboard");
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const footRef = useRef(null);

  const { notifications: unread, support: supportUnread } = useSyncExternalStore(
    subscribeUnread,
    getUnread
  );
  const [gate, setGate] = useState(null);
  const business = useSyncExternalStore(subscribeBusiness, getBusiness);
  const theme = useSyncExternalStore(subscribeTheme, getTheme);
  const { can } = useRole();
  // Recomputed when the session changes — a role change mid-session (staff page)
  // should reshape the sidebar without a reload.
  const navSections = useMemo(
    () => visibleSections(can, business.appLinked),
    [can, business.appLinked]
  );
  const [linkPrompt, setLinkPrompt] = useState(null);

  // Paint the saved theme onto <html> while inside the dashboard; drop it on the
  // way out so marketing/auth pages always render light.
  useLayoutEffect(() => {
    applyTheme();
    return () => clearTheme();
  }, []);

  // Offer to link an existing Ardena host account, once per session. Dismissing
  // it shouldn't nag on every navigation, so the answer is remembered for the
  // browser session rather than forever — a business that says "not now" while
  // busy should still find it later.
  useEffect(() => {
    if (!HOST_ACCOUNT_LINKING) return; // deferred phase — never offer it
    if (!can("linkHostAccount")) return;
    try {
      if (sessionStorage.getItem(HOST_LINK_DISMISSED) === "1") return;
    } catch {
      /* private mode — just show it */
    }
    let alive = true;
    fetchHostLinkSuggestion()
      .then((s) => {
        if (alive && s?.should_prompt) setLinkPrompt(s);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [can]);

  /* Hydrate the session: profile, business, policy, onboarding + fleet.
   *
   * All of it goes out at once. This used to await fetchMe and only then fire
   * the other three, but none of them take anything from its response — they
   * are all "what is this workspace", answered from the bearer token. On a
   * backend answering in the better part of a second, that ordering cost a
   * whole round trip of blank dashboard for nothing.
   *
   * Each lands on its own: the business name appears the moment fetchMe
   * returns, whether or not the policy is still in flight. */
  useEffect(() => {
    let alive = true;
    const settle = (fn) => (data) => {
      if (alive && data) fn(data);
    };

    hydrateFleet().catch(() => {}); // every page reads the fleet store
    hydrateConfig(); // pulls the Mapbox token (and any future client config)
    hydrateChauffeurs().catch(() => {}); // chauffeur roster (§C)
    // Tracking is behind a flag and every screen that reads the store is a
    // coming-soon page while it's off, so don't spend a request on it.
    if (VEHICLE_TRACKING) hydrateTracking().catch(() => {});

    fetchMe()
      .then(({ user, business: biz }) => {
        if (!alive) return;
        const name = biz?.name || biz?.business_name || user?.business_name;
        if (name) setBusiness({ name });
      })
      .catch(() => {
        /* a dead session is cleared by the client; RequireAuth redirects */
      });
    fetchBusiness().then(settle(hydrateBusiness)).catch(() => {});
    fetchPolicy().then(settle(hydratePolicy)).catch(() => {});
    fetchOnboarding().then(settle(hydrateOnboarding)).catch(() => {});

    return () => {
      alive = false;
    };
  }, []);

  // The shared 60 s badge poll — see unreadStore. Everything else that shows
  // a count reads the same store rather than asking again.
  useEffect(() => startUnreadPolling(), []);

  /* Confirmed, because signing out is one click from a menu that also holds
     Profile — and on a shared counter machine the cost of a misclick is the
     next person having to find the password. */
  const [confirmLogout, setConfirmLogout] = useState(false);

  async function handleLogout() {
    setConfirmLogout(false);
    setMenuOpen(false);
    await logout();
    navigate("/login");
  }

  /* The subscription gate: checked once on entry, and again when the billing
     page is opened — that is where it gets cleared, so that is the only
     navigation whose outcome can change it. It used to re-check on every route
     change, which put an extra request in front of every click for an answer
     that changes at most once a month. */
  const onBillingPage = location.pathname === "/dashboard/usage";
  useEffect(() => {
    fetchBillingGate().then(setGate).catch(() => {});
  }, [onBillingPage]);

  /* No artificial gate before the page renders.
   *
   * There used to be an 80 ms skeleton here on every route change, meant as
   * instant feedback. It did the opposite: the Outlet was unmounted for the
   * duration, so the page component didn't mount — and therefore didn't start
   * its own fetch — until the timer expired. Every navigation paid 80 ms
   * before the first request even left the browser, and then showed the
   * page's own skeleton anyway. Pages render immediately now and manage their
   * own loading state, which is what they were already doing. */
  useEffect(() => {
    setNavOpen(false); // close the mobile drawer whenever we navigate
  }, [location.pathname]);

  // Fetch the screens people move between while the shell sits idle, so the
  // code split never costs a wait on the first click — see pageLoaders.
  useEffect(() => preloadCommonPages(), []);

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

  function dismissLinkPrompt() {
    setLinkPrompt(null);
    try {
      sessionStorage.setItem(HOST_LINK_DISMISSED, "1");
    } catch {
      /* private mode — it'll just offer again next navigation */
    }
  }

  return (
    <div className={"dash" + (navOpen ? " nav-open" : "")}>
      {linkPrompt && (
        <HostLinkDialog suggestion={linkPrompt} onClose={dismissLinkPrompt} />
      )}

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
          {navSections.map((section) => (
            <div className="nav-group" key={section.label}>
              <p className="nav-group-label">{section.label}</p>
              {section.items.map((item) =>
                item.children ? (
                  <NavGroup key={item.key} item={item} />
                ) : (
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
                    {item.key === "support" && supportUnread > 0 && (
                      <span className="nav-badge">{supportUnread}</span>
                    )}
                    {item.soon && <span className="nav-soon">Soon</span>}
                  </NavLink>
                )
              )}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot" ref={footRef}>
          {menuOpen && (
            <div className="tenant-menu" role="menu">
              {SHOW_THEME_TOGGLE && (
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
              )}
              <button type="button" role="menuitem" onClick={() => go("/dashboard/settings")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Profile
              </button>
              {/* Tracking, billing and Support used to hide in here; they are
                  sidebar destinations now (see nav.js) so they can actually be
                  found. Feature request is the exception that belongs here: it
                  is about Ardena rather than about the workspace, in the same
                  way Profile and Log out are, and it would have been the only
                  sidebar row that isn't part of running the business. */}
              <button type="button" role="menuitem" onClick={() => go("/dashboard/feature-request")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18h6" />
                  <path d="M10 21h4" />
                  <path d="M12 3a6 6 0 00-3.5 10.9c.3.3.5.7.5 1.1h6c0-.4.2-.8.5-1.1A6 6 0 0012 3z" />
                </svg>
                Feature request
              </button>
              <button
                type="button"
                role="menuitem"
                className="menu-danger"
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmLogout(true);
                }}
              >
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
              <p className="tenant-name">{business.name || "Your business"}</p>
              <p className="tenant-plan">Fleet plan</p>
            </div>
            <svg className="tenant-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 15l6-6 6 6" />
            </svg>
          </button>
        </div>
      </aside>

      <main className="dash-content">
        {gate?.gated && !onBillingPage ? (
          <PaymentWall gate={gate} />
        ) : (
          /* A page's chunk still arriving looks the same as its data still
             arriving — the skeleton it was going to show anyway. */
          <Suspense fallback={<PageSkeleton path={location.pathname} />}>
            <Outlet />
          </Suspense>
        )}
      </main>

      <ConfirmDialog
        open={confirmLogout}
        title="Log out?"
        message="You'll need your password to sign back in."
        confirmLabel="Log out"
        onConfirm={handleLogout}
        onCancel={() => setConfirmLogout(false)}
      />

      <AssistantLauncher />
      <Toasts />
    </div>
  );
}
