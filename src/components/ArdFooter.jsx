import { Link } from "react-router-dom";
import Logo from "./Logo";
import { SOCIALS } from "./socials";

/* Marketing footer in the ardena.co.ke language: brand row, hairline, then a
   four-column link grid on the light gradient. Styles live in
   pages/landingArdena.css, so render this inside an `.ard` wrapper. */
export default function ArdFooter() {
  return (
    <footer className="ard-footer">
      <div className="ard-footer-wrap">
        <div className="ard-footer-top">
          <Logo />
          <p className="ard-footer-tagline">
            Ardena for Business. The operating system for car rental and fleet
            businesses in Kenya.
          </p>
        </div>

        <hr className="ard-footer-divider" />

        <div className="ard-footer-main">
          <div>
            <p className="ard-footer-col-title">Product</p>
            <ul className="ard-footer-links">
              <li>
                <a href="/#modules">Fleet management</a>
              </li>
              <li>
                <a href="/#modules">Bookings</a>
              </li>
              <li>
                <a href="/#modules">Verification</a>
              </li>
              <li>
                <Link to="/pricing">Pricing</Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="ard-footer-col-title">Company</p>
            <ul className="ard-footer-links">
              <li>
                <Link to="/contact">Contact</Link>
              </li>
              <li>
                <a href="/#faq">FAQ</a>
              </li>
              <li>
                <a href="https://ardena.co.ke" target="_blank" rel="noreferrer">
                  ardena.co.ke
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="ard-footer-col-title">Get started</p>
            <ul className="ard-footer-links">
              <li>
                <Link to="/signup">Request access</Link>
              </li>
              <li>
                <Link to="/login">Sign in</Link>
              </li>
            </ul>
          </div>

          <div className="ard-footer-social-block">
            <p className="ard-footer-col-title">Follow</p>
            <div className="ard-footer-social">
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
        </div>

        <div className="ard-footer-bar">
          <span>© {new Date().getFullYear()} Ardena. All rights reserved.</span>
          <span>Nairobi, Kenya</span>
        </div>
      </div>
    </footer>
  );
}
