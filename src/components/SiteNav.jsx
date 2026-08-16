import { Link, NavLink, useLocation } from "react-router-dom";
import Logo from "./Logo";

/* Marketing-site header: 5 links + sign in. Section links use plain anchors
   ("/#modules") so they work from subpages and the landing page alike.
   The current page gets a small brand dot: route links via NavLink, and the
   landing anchors (Product / FAQ) from the location hash. */
export default function SiteNav() {
  const { pathname, hash } = useLocation();
  const onLanding = pathname === "/";
  const faqActive = onLanding && hash === "#faq";
  const productActive = onLanding && !faqActive;

  return (
    <header className="nav">
      <Logo />
      <nav className="nav-links" aria-label="Site">
        <a href="/#modules" className={productActive ? "active" : ""}>
          Product
        </a>
        <NavLink to="/pricing">Pricing</NavLink>
        <a href="/#faq" className={faqActive ? "active" : ""}>
          FAQ
        </a>
        <NavLink to="/contact">Contact</NavLink>
      </nav>
      <div className="nav-actions">
        <Link to="/login" className="btn btn-primary">
          Sign in
        </Link>
      </div>
    </header>
  );
}
