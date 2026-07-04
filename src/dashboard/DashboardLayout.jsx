import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { NAV_SECTIONS } from "./nav";
import { ICONS } from "./icons";
import Logo from "../components/Logo";
import "./dashboard.css";

export default function DashboardLayout() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const footRef = useRef(null);

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
              </button>
              <button type="button" role="menuitem" onClick={() => go("/")}>
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
            <span className="tenant-avatar">A</span>
            <div>
              <p className="tenant-name">Acme Car Hire</p>
              <p className="tenant-plan">Growth plan</p>
            </div>
            <svg className="tenant-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 15l6-6 6 6" />
            </svg>
          </button>
        </div>
      </aside>

      <main className="dash-content">
        <Outlet />
      </main>
    </div>
  );
}
