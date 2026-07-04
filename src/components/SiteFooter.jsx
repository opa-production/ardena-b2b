import { Link } from "react-router-dom";
import Logo from "./Logo";

export default function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <Logo />
          <p>
            The operating system for car rental and fleet businesses in Kenya.
          </p>
        </div>
        <div className="footer-col">
          <p className="footer-head">Product</p>
          <a href="/#modules">Fleet management</a>
          <a href="/#modules">Bookings</a>
          <a href="/#modules">Verification</a>
          <a href="/#pricing">Pricing</a>
        </div>
        <div className="footer-col">
          <p className="footer-head">Company</p>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          <a href="/#faq">FAQ</a>
          <a href="https://ardena.co.ke" target="_blank" rel="noreferrer">
            ardena.co.ke
          </a>
        </div>
        <div className="footer-col">
          <p className="footer-head">Get started</p>
          <Link to="/signup">Create an account</Link>
          <Link to="/login">Sign in</Link>
          <Link to="/dashboard">View live demo</Link>
        </div>
      </div>
      <div className="footer-bar">
        <span>© {new Date().getFullYear()} Ardena. All rights reserved.</span>
        <span>Nairobi, Kenya</span>
      </div>
    </footer>
  );
}
