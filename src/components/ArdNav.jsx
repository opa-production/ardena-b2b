import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Logo from "./Logo";

/* Marketing header in the ardena.co.ke language: fixed, white at 97% with a
   backdrop blur, links centred, and a single blue CTA on the right — the only
   place brand blue appears on these pages.

   Section links are plain anchors ("/#modules") so they work from any page.
   Styles live in pages/landingArdena.css under `.ard`, so every page using
   this must render inside an `.ard` wrapper. */

const LINKS = [
  { label: "Home", to: "/" },
  { label: "Pricing", to: "/pricing" },
  { label: "Contact", to: "/contact" },
];

export default function ArdNav() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <header className="ard-header">
      <nav className="ard-nav">
        <Logo />

        <ul className={`ard-nav-menu${open ? " is-open" : ""}`}>
          {LINKS.map((l) => {
            // hash links scroll within a page rather than being one, so they
            // never take the current-page dot
            const active = Boolean(l.to) && pathname === l.to;
            const cls = `ard-nav-link${active ? " is-active" : ""}`;
            return (
              <li key={l.label}>
                {l.to ? (
                  <Link to={l.to} className={cls} onClick={() => setOpen(false)}>
                    {l.label}
                  </Link>
                ) : (
                  <a href={l.href} className={cls} onClick={() => setOpen(false)}>
                    {l.label}
                  </a>
                )}
              </li>
            );
          })}
        </ul>

        <div className="ard-nav-end">
          <Link to="/login" className="ard-nav-cta">
            Sign in
          </Link>
          <button
            type="button"
            className={`ard-nav-toggle${open ? " is-open" : ""}`}
            aria-label="Toggle navigation"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>
    </header>
  );
}
