import { Link } from "react-router-dom";
import Logo from "./Logo";
import { SOCIALS } from "./socials";

export default function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <Logo />
          <p>
            Ardena for Business. The operating system for car rental and fleet
            businesses in Kenya.
          </p>
          <div className="footer-socials">
            {SOCIALS.map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                aria-label={s.name}
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>
        <div className="footer-col">
          <p className="footer-head">Product</p>
          <a href="/#modules">Fleet management</a>
          <a href="/#modules">Bookings</a>
          <a href="/#modules">Verification</a>
          <Link to="/pricing">Pricing</Link>
        </div>
        <div className="footer-col">
          <p className="footer-head">Company</p>
          <Link to="/contact">Contact</Link>
          <a href="/#faq">FAQ</a>
          <a href="https://ardena.co.ke" target="_blank" rel="noreferrer">
            ardena.co.ke
          </a>
        </div>
        <div className="footer-col">
          <p className="footer-head">Get started</p>
          <Link to="/signup">Request access</Link>
          <Link to="/login">Sign in</Link>
        </div>
      </div>
      <div className="footer-bar">
        <span>© {new Date().getFullYear()} Ardena. All rights reserved.</span>
        <span>Nairobi, Kenya</span>
      </div>
    </footer>
  );
}
