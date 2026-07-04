import { Link } from "react-router-dom";
import Logo from "./Logo";

/* Marketing-site header: 5 links + sign in. Section links use plain anchors
   ("/#modules") so they work from subpages and the landing page alike. */
export default function SiteNav() {
  return (
    <header className="nav">
      <Logo />
      <nav className="nav-links" aria-label="Site">
        <a href="/#modules">Product</a>
        <a href="/#pricing">Pricing</a>
        <a href="/#faq">FAQ</a>
        <Link to="/about">About</Link>
        <Link to="/contact">Contact</Link>
      </nav>
      <div className="nav-actions">
        <Link to="/login" className="btn btn-primary">
          Sign in
        </Link>
      </div>
    </header>
  );
}
