import { useState } from "react";
import { Link } from "react-router-dom";
import useReveal from "../hooks/useReveal";
import usePageTitle from "../hooks/usePageTitle";
import SiteNav from "../components/SiteNav";
import SiteFooter from "../components/SiteFooter";
import PricingPlans from "../components/PricingPlans";
import { PILLARS, RATE, LAUNCH_RATE } from "./pricingData";
import "./landing.css";

function Reveal({ as: Tag = "div", className = "", children }) {
  const ref = useReveal();
  return (
    <Tag ref={ref} className={`${className} reveal-group`.trim()}>
      {children}
    </Tag>
  );
}

const FAQS = [
  {
    q: "How do I get an account?",
    a: "Access is by request. Tell us about your business, we verify its registration and director details, then send your logins within 24 hours. Every fleet on Ardena is a real, verified rental business.",
  },
  {
    q: "How does billing work?",
    a: "You pay per vehicle on the platform, KES 400 a month each, and just KES 200 during your first 3 months, with every module included. Pay by card or M-Pesa, cancel anytime, and every account starts with a 14 day free trial.",
  },
  {
    q: "Do I need my own identity verification account?",
    a: "No. Verification is built into the platform and pay as you go, a flat KES 100 per renter check, paid from a prepaid wallet you top up like airtime. No monthly commitment.",
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
    <div className="landing">
      <SiteNav />

      {/* ---- Hero (clean page, copy only) ---- */}
      <section className="panel hero">
        <div className="hero-body">
          <div className="hero-copy">
            <h1>
              Run your entire rental
              <br />
              business from <span className="hl">one place</span>.
            </h1>
            <p className="hero-sub">
              Fleet, bookings, verified customers and payments. The operational
              backbone premium car rental businesses run on, billed monthly with
              no heavy setup.
            </p>
            <div className="hero-cta">
              <Link to="/signup" className="btn btn-primary">
                Request access
              </Link>
              <Link to="/login" className="btn btn-ghost">
                Sign in
              </Link>
            </div>
          </div>
        </div>

        <a href="#modules" className="scroll-cue" aria-label="Scroll to see more">
          <span>See what's inside</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 3v10m0 0l-4-4m4 4l4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      </section>

      {/* ---- Pillars (white) ---- */}
      <section className="panel pillars" id="modules">
        <Reveal className="section-head">
          <h2>One subscription. The whole operation.</h2>
        </Reveal>
        <Reveal className="pillar-list">
          {PILLARS.map((p, i) => (
            <div className="pillar" key={p.title}>
              <span className="pillar-no">{String(i + 1).padStart(2, "0")}</span>
              <h3>{p.title}</h3>
              <p>{p.desc}</p>
            </div>
          ))}
          <p className="pillar-note">
            Client profiles, staff roles, notifications and reports come with
            all of it. <Link to="/pricing">See everything included</Link>.
          </p>
        </Reveal>
      </section>

      {/* ---- Pricing (white) ---- */}
      <section className="panel pricing" id="pricing">
        <Reveal className="section-head">
          <h2>Simple pricing that scales with your fleet.</h2>
          <p className="section-sub">
            Every module included on every plan. KES {LAUNCH_RATE} per vehicle
            for your first 3 months, KES {RATE} after. 14 day free trial, no
            card required.
          </p>
        </Reveal>
        <PricingPlans />
      </section>

      {/* ---- FAQ (black) ---- */}
      <section className="panel faq" id="faq">
        <Reveal className="section-head">
          <h2>Frequently asked questions.</h2>
        </Reveal>
        <Reveal className="faq-list">
          {FAQS.map((f, i) => (
            <details key={f.q} open={openFaq === i}>
              <summary
                onClick={(e) => {
                  e.preventDefault();
                  setOpenFaq(openFaq === i ? null : i);
                }}
              >
                {f.q}
                <span className="faq-mark" aria-hidden="true" />
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </Reveal>
      </section>

      {/* ---- Closing (white) ---- */}
      <section className="panel closing">
        <Reveal className="closing-body">
          <h2>
            Built for businesses that
            <br />
            take rentals seriously.
          </h2>
          <p>Request access for your fleet, or sign in if you already have logins.</p>
          <div className="hero-cta">
            <Link to="/signup" className="btn btn-primary">
              Request access
            </Link>
            <Link to="/login" className="btn btn-ghost">
              Sign in
            </Link>
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  );
}
