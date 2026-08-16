import { useState } from "react";
import { Link } from "react-router-dom";
import useReveal from "../hooks/useReveal";
import usePageTitle from "../hooks/usePageTitle";
import ArdNav from "../components/ArdNav";
import ArdFooter from "../components/ArdFooter";
import { MODULES, TIERS, CHECK_PRICE, TRIAL_DAYS, fmtKES } from "./pricingData";
import heroImg from "../assets/hero.jpg";
import "./landingArdena.css";

/* The landing page follows the ardena.co.ke design language: a full-bleed
   photo hero with the copy on the shaded left, then alternating white /
   #f8fafc / cream bands, each opening with a "▪ LABEL" eyebrow and pairing a
   sticky intro with a numbered list on the opposite side.

   Nav and footer are the ardena-styled ArdNav / ArdFooter rather than the
   shared SiteNav / SiteFooter, and the styles live in ./landingArdena.css
   scoped under `.ard`, so /contact keeps the older look untouched.

   Full pricing lives on /pricing; this page carries only a teaser, so the
   bands are stated in exactly one place. */

function Reveal({ as: Tag = "div", className = "", children }) {
  const ref = useReveal();
  return (
    <Tag ref={ref} className={`${className} reveal-group`.trim()}>
      {children}
    </Tag>
  );
}

const TRUST = [
  {
    title: "Verified businesses only",
    desc: "Access is by request. We check your business registration and director details before issuing logins, so every fleet on the platform is a real, trading rental business.",
  },
  {
    title: "Your data stays yours",
    desc: "Every business runs in its own isolated workspace. Your fleet, your customers and your payments are never visible to another operator on the platform.",
  },
  {
    title: "Roles and an audit trail",
    desc: "Give each person the access their job needs — admin, booking agent, finance — and see every action they take recorded in an activity log.",
  },
];

/* Built from TIERS so the landing can never quote a price /pricing disagrees
   with. */
const bandSummary = TIERS.map(
  (t) => `KES ${fmtKES(t.monthly)} for ${t.range.toLowerCase()}`
).join(", ");

const FAQS = [
  {
    q: "How do I get an account?",
    a: "Access is by request. Tell us about your business, we verify its registration and director details, then send your logins within 24 hours. Every fleet on Ardena is a real, verified rental business.",
  },
  {
    q: "How does billing work?",
    a: `You pay one flat price for your fleet band — ${bandSummary} — billed monthly, with every module included on every band. Pay by card or M-Pesa and cancel anytime. Every account starts with a ${TRIAL_DAYS} day free trial.`,
  },
  {
    q: "Do I need my own identity verification account?",
    a: `No. Verification is built into the platform and pay as you go, a flat KES ${CHECK_PRICE} per renter check, paid from a prepaid wallet you top up like airtime. No monthly commitment.`,
  },
  {
    q: "How do customers pay?",
    a: "Your staff send a payment prompt from any booking and the customer approves it on their phone via M-Pesa. Card payments are on the roadmap.",
  },
  {
    q: "Can I control what my staff can see and do?",
    a: "Yes. Assign roles like admin, booking agent or finance, and every action is recorded in an activity log.",
  },
  {
    q: "Can I bring my existing fleet and customers?",
    a: "Yes. You can add vehicles and customers manually or import them in bulk during onboarding, and our team will help you get set up.",
  },
  {
    q: "Is my business data isolated?",
    a: "Completely. Every business runs in its own workspace and your fleet, customers and payments are never visible to anyone else.",
  },
];

export default function Landing() {
  usePageTitle("");
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="ard">
      <ArdNav />

      <main>
        {/* ---- Hero ---- */}
        <section className="ard-hero">
          <img
            src={heroImg}
            alt=""
            className="ard-hero-img"
            width="1920"
            height="1080"
            fetchpriority="high"
            decoding="async"
          />
          <div className="ard-hero-overlay" />

          <div className="ard-hero-inner">
            <div className="ard-hero-content">
              <h1 className="ard-hero-title">
                Run your entire rental business from one place
              </h1>
              <p className="ard-hero-sub">
                Fleet, bookings, verified customers and payments. The
                operational backbone premium car rental businesses run on, at
                one flat price with no heavy setup.
              </p>
              <div className="ard-hero-buttons">
                <Link to="/signup" className="ard-btn ard-btn--solid">
                  Request access
                </Link>
                <Link to="/login" className="ard-btn ard-btn--glass">
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ---- What's inside: sticky intro left, numbered modules right ---- */}
        <section className="ard-section ard-section--light" id="modules">
          <div className="ard-container">
            <div className="ard-split">
              <Reveal className="ard-intro">
                <p className="ard-label">▪ WHAT&apos;S INSIDE</p>
                <h2 className="ard-heading">
                  The whole operation, one subscription
                </h2>
                <p className="ard-desc">
                  Ardena for Business replaces the spreadsheets, the WhatsApp
                  threads and the paper files with one system your whole team
                  works from. Every module below is included on every band,
                  whatever size your fleet.
                </p>
              </Reveal>

              <Reveal className="ard-list">
                {MODULES.map((m, i) => (
                  <div className="ard-item" key={m.title}>
                    <div className="ard-item-num">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="ard-item-body">
                      <h3 className="ard-item-title">{m.title}</h3>
                      <p className="ard-item-desc">{m.desc}</p>
                    </div>
                  </div>
                ))}
              </Reveal>
            </div>
          </div>
        </section>

        {/* ---- Trust: cream band, sides flipped ---- */}
        <section className="ard-section ard-section--cream">
          <div className="ard-container">
            <div className="ard-split ard-split--reverse">
              <Reveal className="ard-list ard-trust-list">
                {TRUST.map((t, i) => (
                  <div className="ard-trust-item" key={t.title}>
                    <span className="ard-trust-marker">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="ard-trust-title">{t.title}</h3>
                      <p className="ard-trust-desc">{t.desc}</p>
                    </div>
                  </div>
                ))}
              </Reveal>

              <Reveal className="ard-intro">
                <p className="ard-label">▪ SAFETY &amp; TRUST</p>
                <h2 className="ard-heading">Built for real businesses</h2>
                <p className="ard-desc">
                  You are trusting us with your fleet, your customers and your
                  money. Here is how that trust is held up on our side.
                </p>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ---- FAQ ---- */}
        <section className="ard-section ard-section--white" id="faq">
          <div className="ard-container">
            <h2 className="ard-section-title">Frequently asked questions</h2>
            <Reveal className="ard-faq-list">
              {FAQS.map((f, i) => (
                <div
                  className={`ard-faq-item${openFaq === i ? " is-open" : ""}`}
                  key={f.q}
                >
                  <button
                    type="button"
                    className="ard-faq-q"
                    aria-expanded={openFaq === i}
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    {f.q}
                    <span className="ard-faq-icon" aria-hidden="true">
                      +
                    </span>
                  </button>
                  <div className="ard-faq-a">
                    <p>{f.a}</p>
                  </div>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* ---- Closing CTA ---- */}
        <section className="ard-section ard-section--white">
          <div className="ard-container">
            <div className="ard-cta-card">
              <div className="ard-cta-content">
                <h2 className="ard-cta-title">
                  Bring your fleet onto Ardena for Business
                </h2>
                <p className="ard-cta-text">
                  Tell us about your business and we will verify it and send
                  your logins within 24 hours. Every account starts with a{" "}
                  {TRIAL_DAYS} day free trial, no card required.
                </p>
              </div>
              <Link to="/signup" className="ard-btn ard-btn--ink">
                Request access
              </Link>
            </div>
          </div>
        </section>
      </main>

      <ArdFooter />
    </div>
  );
}
