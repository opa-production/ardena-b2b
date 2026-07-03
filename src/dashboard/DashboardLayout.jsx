import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { NAV_SECTIONS } from "./nav";
import { ICONS } from "./icons";
import Logo from "../components/Logo";
import "./dashboard.css";

export default function DashboardLayout() {
  const navigate = useNavigate();

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

        <div className="sidebar-foot">
          <div className="tenant-chip">
            <span className="tenant-avatar">A</span>
            <div>
              <p className="tenant-name">Acme Car Hire</p>
              <p className="tenant-plan">Growth plan</p>
            </div>
          </div>
          <button
            type="button"
            className="logout-btn"
            onClick={() => navigate("/")}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H6a2 2 0 01-2-2V5a2 2 0 012-2h3" />
              <path d="M16 17l5-5-5-5M21 12H9" />
            </svg>
            Log out
          </button>
        </div>
      </aside>

      <main className="dash-content">
        <Outlet />
      </main>
    </div>
  );
}
