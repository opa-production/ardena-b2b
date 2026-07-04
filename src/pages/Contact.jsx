import { useState } from "react";
import SiteNav from "../components/SiteNav";
import SiteFooter from "../components/SiteFooter";
import "./landing.css";

/* Swap URLs for the live profiles */
const SOCIALS = [
  {
    name: "Instagram",
    href: "https://instagram.com/ardena.ke",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
        <circle cx="12" cy="12" r="4.2" />
        <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    name: "X",
    href: "https://x.com/ardenahq",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644z" />
      </svg>
    ),
  },
  {
    name: "LinkedIn",
    href: "https://linkedin.com/company/ardena",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S.02 4.88.02 3.5 1.13 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8h4v15.5h-4V8zm7.5 0h3.8v2.2h.05c.53-1 1.83-2.2 3.77-2.2 4.03 0 4.78 2.65 4.78 6.1v9.4h-4V15c0-2.03-.04-4.64-2.83-4.64-2.83 0-3.27 2.2-3.27 4.48v8.66h-4V8z" />
      </svg>
    ),
  },
  {
    name: "Facebook",
    href: "https://facebook.com/ardenakenya",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.45H15.2c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z" />
      </svg>
    ),
  },
];

export default function Contact() {
  const [sent, setSent] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setSent(true);
    e.target.reset();
  }

  return (
    <div className="landing contact-page">
      <SiteNav />

      {/* ---- Hero: title + description alone (white, full viewport) ---- */}
      <section className="panel contact-hero">
        <div className="contact-hero-body">
          <h1>Talk to us.</h1>
          <p>
            Whether you run five cars or five hundred, we'd love to show you
            around or help you get unstuck. We reply within one business day.
          </p>
        </div>
      </section>

      {/* ---- Email form: intro left, form right (black, full viewport) ---- */}
      <section className="panel modules form-panel" id="email">
        <div className="form-split">
          <div className="form-intro">
            <h2>Drop us an email.</h2>
            <p>
              Fill in the form and it lands straight in our inbox — no ticket
              numbers, no bots. A real person replies within one business day.
            </p>
          </div>

          <form className="contact-form form-elevated" onSubmit={handleSubmit} onChange={() => setSent(false)}>
            <div className="contact-row">
              <div className="field">
                <label htmlFor="c-name">Your name</label>
                <input id="c-name" type="text" placeholder="Wanjiku Kamau" required />
              </div>
              <div className="field">
                <label htmlFor="c-business">Business name</label>
                <input id="c-business" type="text" placeholder="Acme Car Hire" />
              </div>
            </div>
            <div className="contact-row">
              <div className="field">
                <label htmlFor="c-email">Work email</label>
                <input id="c-email" type="email" placeholder="you@business.co.ke" required />
              </div>
              <div className="field">
                <label htmlFor="c-phone">Phone</label>
                <input id="c-phone" type="tel" placeholder="0700 000 000" />
              </div>
            </div>
            <div className="field">
              <label htmlFor="c-topic">What's this about?</label>
              <select id="c-topic" defaultValue="Sales & demos">
                <option>Sales &amp; demos</option>
                <option>Support</option>
                <option>Partnerships</option>
                <option>Something else</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="c-message">Message</label>
              <textarea
                id="c-message"
                rows="4"
                placeholder="Tell us about your fleet and what you need"
                required
              />
            </div>
            <div className="contact-actions">
              <button type="submit" className="btn btn-primary">
                Send message
              </button>
              {sent && (
                <p className="sent-note" role="status">
                  Thanks — we've got it. Expect a reply within one business day.
                </p>
              )}
            </div>
          </form>
        </div>
      </section>

      {/* ---- Socials (white, full viewport) ---- */}
      <section className="panel social-panel" id="socials">
        <div className="section-head">
          <h2>Find us on socials.</h2>
          <p className="section-sub">
            Product updates, fleet-running tips and what we're building next.
          </p>
        </div>
        <div className="social-row">
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
      </section>

      <SiteFooter />
    </div>
  );
}
