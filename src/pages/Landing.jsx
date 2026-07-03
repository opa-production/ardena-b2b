import { useState } from "react";
import { Link } from "react-router-dom";
import useReveal from "../hooks/useReveal";
import Logo from "../components/Logo";
import "./landing.css";

function Reveal({ as: Tag = "div", className = "", children }) {
  const ref = useReveal();
  return (
    <Tag ref={ref} className={`${className} reveal-group`.trim()}>
      {children}
    </Tag>
  );
}

const MODULES = [
  {
    title: "Fleet management",
    desc: "Every vehicle, document and rate in one registry with availability at a glance.",
  },
  {
    title: "Bookings & reservations",
    desc: "Create, confirm and track reservations with automatic availability conflict checks.",
  },
  {
    title: "Client management",
    desc: "A clean profile for every customer with their bookings, payments and history.",
  },
  {
    title: "Identity verification",
    desc: "Verify renters in seconds with ID lookup, liveness and license checks built in.",
  },
  {
    title: "Payment prompting",
    desc: "Prompt customers to pay from any booking. M-Pesa first, tracked end to end.",
  },
  {
    title: "Staff & roles",
    desc: "Invite your team with the right access. Every action logged, always auditable.",
  },
  {
    title: "Notifications",
    desc: "Your team stays ahead of bookings, payments and expiring documents in real time.",
  },
  {
    title: "Reports & analytics",
    desc: "Revenue, utilisation and fleet performance, always up to date and exportable.",
  },
];

/* Placeholder pricing until real KES figures are decided (BUILD_PLAN §12) */
const PLANS = [
  {
    name: "Starter",
    price: "KES 4,900",
    period: "per month",
    features: ["Up to 10 vehicles", "3 staff seats", "50 verifications / month", "M-Pesa payment prompting"],
    featured: false,
  },
  {
    name: "Growth",
    price: "KES 12,900",
    period: "per month",
    features: ["Up to 50 vehicles", "10 staff seats", "250 verifications / month", "Priority support"],
    featured: true,
  },
  {
    name: "Scale",
    price: "Custom",
    period: "talk to us",
    features: ["Unlimited vehicles", "Unlimited staff seats", "Pay as you go verifications", "Dedicated onboarding"],
    featured: false,
  },
];

const FAQS = [
  {
    q: "How does billing work?",
    a: "One monthly subscription per business. Pick a plan, pay by card or M-Pesa, and cancel anytime. Every plan starts with a 14 day free trial.",
  },
  {
    q: "Do I need my own identity verification account?",
    a: "No. Verification is built into the platform. Your team verifies renters directly from a booking and each plan includes a monthly allowance.",
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
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="landing">
      {/* ---- Hero (white) ---- */}
      <section className="panel hero">
        <header className="nav">
          <Logo />
          <nav className="nav-actions">
            <Link to="/login" className="btn btn-primary">
              Sign in
            </Link>
          </nav>
        </header>

        <div className="hero-body">
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
            <Link to="/dashboard" className="btn btn-primary">
              View live demo
            </Link>
            <Link to="/signup" className="btn btn-ghost">
              Create your account
            </Link>
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

      {/* ---- Modules (black) ---- */}
      <section className="panel modules" id="modules">
        <Reveal className="section-head">
          <h2>One subscription. The whole operation.</h2>
        </Reveal>
        <Reveal className="module-grid">
          {MODULES.map((m) => (
            <article className="module-card" key={m.title}>
              <span className="module-dot" />
              <h3>{m.title}</h3>
              <p>{m.desc}</p>
            </article>
          ))}
        </Reveal>
      </section>

      {/* ---- Pricing (white) ---- */}
      <section className="panel pricing" id="pricing">
        <Reveal className="section-head">
          <h2>Simple monthly pricing.</h2>
          <p className="section-sub">Start free for 14 days. No card required.</p>
        </Reveal>
        <Reveal className="plan-grid">
          {PLANS.map((p) => (
            <article
              className={"plan-card" + (p.featured ? " featured" : "")}
              key={p.name}
            >
              {p.featured && <span className="plan-tag">Most popular</span>}
              <h3>{p.name}</h3>
              <p className="plan-price">
                {p.price} <span>{p.period}</span>
              </p>
              <ul>
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <Link
                to="/signup"
                className={"btn " + (p.featured ? "btn-primary inverse" : "btn-ghost")}
              >
                Get started
              </Link>
            </article>
          ))}
        </Reveal>
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
          <p>Start with a demo, or set up your fleet in minutes.</p>
          <div className="hero-cta">
            <Link to="/signup" className="btn btn-primary">
              Get started
            </Link>
            <Link to="/dashboard" className="btn btn-ghost">
              View live demo
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ---- Footer (black) ---- */}
      <footer className="footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <Logo />
            <p>
              The operating system for car rental and fleet businesses in
              Kenya.
            </p>
          </div>
          <div className="footer-col">
            <p className="footer-head">Product</p>
            <a href="#modules">Fleet management</a>
            <a href="#modules">Bookings</a>
            <a href="#modules">Verification</a>
            <a href="#modules">Payments</a>
          </div>
          <div className="footer-col">
            <p className="footer-head">Company</p>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
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
    </div>
  );
}
