import { Link } from "react-router-dom";
import Logo from "./Logo";
import { SOCIALS } from "./socials";

/* Marketing footer in the ardena.co.ke language: brand row, hairline, then a
   four-column link grid on the light gradient. Styles live in
   pages/landingArdena.css, so render this inside an `.ard` wrapper.

   Public pages only — no sign-in or dashboard links (the nav has those), and
   no search landing pages (they link to each other and live in the sitemap).
   Company and legal links point at ardena.co.ke, which owns them for every
   Ardena product, so there is one set of terms and one privacy policy. */
const MAIN = "https://ardena.co.ke";

const COMPANY = [
  { label: "About us", href: `${MAIN}/about` },
  { label: "Team", href: `${MAIN}/teams` },
  { label: "Applications", href: `${MAIN}/applications` },
  { label: "Ardena car rental app", href: MAIN },
  { label: "Help", href: `${MAIN}/help` },
  { label: "Status", href: `${MAIN}/status` },
];

const LEGAL = [
  { label: "Terms & conditions", href: `${MAIN}/terms` },
  { label: "Privacy policy", href: `${MAIN}/privacy` },
  { label: "Legal", href: `${MAIN}/legal` },
];

const ext = { target: "_blank", rel: "noreferrer" };

export default function ArdFooter() {
  return (
    <footer className="ard-footer">
      <div className="ard-footer-wrap">
        <div className="ard-footer-top">
          <Logo />
          <p className="ard-footer-tagline">
            Ardena for Business. Car rental and fleet management software for
            rental businesses in Kenya.
          </p>
        </div>

        <hr className="ard-footer-divider" />

        <div className="ard-footer-main">
          <div>
            <p className="ard-footer-col-title">Product</p>
            <ul className="ard-footer-links">
              <li>
                <a href="/#modules">Features</a>
              </li>
              <li>
                <Link to="/pricing">Pricing</Link>
              </li>
              <li>
                <a href="/#faq">FAQ</a>
              </li>
              <li>
                <Link to="/contact">Contact sales</Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="ard-footer-col-title">Company</p>
            <ul className="ard-footer-links">
              {COMPANY.map((l) => (
                <li key={l.label}>
                  <a href={l.href} {...ext}>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="ard-footer-social-block">
            <p className="ard-footer-col-title">Contact</p>
            <ul className="ard-footer-links ard-footer-contact">
              <li>
                <a href="mailto:support@ardena.co.ke">support@ardena.co.ke</a>
              </li>
              <li>
                <a href="tel:+254707856829">+254 707 856 829</a>
              </li>
              <li>Nakuru, Kenya</li>
            </ul>
            <div className="ard-footer-social">
              {SOCIALS.map((s) => (
                <a key={s.name} href={s.href} {...ext} aria-label={s.name}>
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="ard-footer-bar">
          <span>© {new Date().getFullYear()} Ardena Platforms Africa Ltd. All rights reserved.</span>
          <nav className="ard-footer-legal" aria-label="Legal">
            {LEGAL.map((l) => (
              <a key={l.label} href={l.href} {...ext}>
                {l.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
