import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ICONS } from "./icons";

/* A sidebar row that opens to reveal its children rather than navigating.
 *
 * The group itself is a button, not a link — there is no "Account" page, only
 * the three underneath it. It starts open when one of its children is the
 * current route, so landing on /dashboard/billing from a bookmark shows you
 * where you are instead of a collapsed row you have to go hunting through.
 *
 * Open state is deliberately local and unpersisted: the only thing that should
 * force it open is being inside it. */
export default function NavGroup({ item }) {
  const { pathname } = useLocation();
  const hasActiveChild = item.children.some(
    (c) => pathname === c.to || pathname.startsWith(`${c.to}/`)
  );
  const [open, setOpen] = useState(hasActiveChild);

  // Navigating into the group from outside it (a link on another page, the
  // back button) should reveal the children too, not just a direct click.
  useEffect(() => {
    if (hasActiveChild) setOpen(true);
  }, [hasActiveChild]);

  const panelId = `nav-group-${item.key}`;

  return (
    <div className={"nav-parent" + (open ? " is-open" : "")}>
      <button
        type="button"
        className={"nav-item nav-toggle-row" + (hasActiveChild && !open ? " has-active" : "")}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
      >
        {ICONS[item.key]}
        {item.name}
        <svg
          className="nav-chevron"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <div className="nav-sub" id={panelId} hidden={!open}>
        {item.children.map((child) => (
          <NavLink
            key={child.key}
            to={child.to}
            end={child.end}
            className={({ isActive }) => "nav-item nav-sub-item" + (isActive ? " active" : "")}
          >
            {child.name}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
