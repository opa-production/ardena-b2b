import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Logo from "./Logo";

/* Marketing header in the ardena.co.ke language: fixed, white at 97% with a
   backdrop blur, links centred, and a single blue CTA on the right, the only
   place brand blue appears on these pages.

   On phones the Sign in CTA leaves the bar and the hamburger opens a
   full-height dark sheet: large light links over hairline rules, with Get
   started and Sign in pinned to the bottom.

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

  // while the sheet is open: no page scroll behind it, Escape closes it
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className={`ard-header${open ? " is-menu-open" : ""}`}>
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
          <li className="ard-nav-sheet-foot">
            <Link to="/signup" className="ard-nav-sheet-cta" onClick={() => setOpen(false)}>
              Get started
            </Link>
            <Link to="/login" className="ard-nav-sheet-signin" onClick={() => setOpen(false)}>
              Sign in
            </Link>
          </li>
        </ul>

        <div className="ard-nav-end">
          <Link to="/login" className="ard-nav-cta">
            Sign in
          </Link>
          <button
            type="button"
            className={`ard-nav-toggle${open ? " is-open" : ""}`}
            aria-label={open ? "Close menu" : "Open menu"}
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
