import { useState } from "react";
import { Link } from "react-router-dom";
import useReveal from "../hooks/useReveal";
import SiteNav from "../components/SiteNav";
import SiteFooter from "../components/SiteFooter";
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

/* Per-vehicle pricing: launch rate for the first 3 months, standard after.
   Verification is pay as you go. */
const RATE = 400;
const LAUNCH_RATE = 200;
const MINIMUM = 2000;
const CHECK_PRICE = 100;

const monthlyFor = (vehicles, rate) => Math.max(MINIMUM, vehicles * rate);
const fmtKES = (n) => n.toLocaleString("en-KE");

const FAQS = [
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
  const [openFaq, setOpenFaq] = useState(null);
  const [fleetSize, setFleetSize] = useState(12);

  return (
    <div className="landing">
      <SiteNav />

      {/* ---- Hero (white) ---- */}
      <section className="panel hero">
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
          <h2>Pay per vehicle. Nothing else.</h2>
          <p className="section-sub">
            Every module included. KES {LAUNCH_RATE} per vehicle for your first
            3 months, KES {RATE} after. 14 day free trial, no card required.
          </p>
        </Reveal>
        <Reveal className="plan-grid price-grid">
          <article className="plan-card featured">
            <span className="plan-tag">Launch price</span>
            <h3>Fleet plan</h3>
            <div className="calc">
              <div className="calc-head">
                <label htmlFor="fleet-size">How many vehicles do you run?</label>
                <strong>{fleetSize}</strong>
              </div>
              <input
                id="fleet-size"
                type="range"
                min="3"
                max="100"
                value={fleetSize}
                onChange={(e) => setFleetSize(Number(e.target.value))}
              />
              <p className="calc-price">
                KES {fmtKES(monthlyFor(fleetSize, LAUNCH_RATE))}
                <span> /month for your first 3 months</span>
              </p>
              <p className="calc-after">
                then KES {fmtKES(monthlyFor(fleetSize, RATE))} /month · cancel
                anytime
              </p>
            </div>
            <ul>
              <li>Unlimited bookings &amp; staff seats</li>
              <li>M-Pesa payment prompting included</li>
              <li>Fleet, clients, notifications &amp; reports</li>
              <li>KES {fmtKES(MINIMUM)} monthly minimum</li>
            </ul>
            <Link to="/signup" className="btn btn-primary inverse">
              Start free trial
            </Link>
          </article>

          <article className="plan-card">
            <h3>Renter verification</h3>
            <p className="plan-price">
              KES {CHECK_PRICE} <span>per check · pay as you go</span>
            </p>
            <ul>
              <li>ID lookup, selfie &amp; licence in one check</li>
              <li>Top up like airtime, via M-Pesa or card</li>
              <li>Credits never expire</li>
              <li>No monthly commitment</li>
            </ul>
            <Link to="/signup" className="btn btn-ghost">
              Get started
            </Link>
          </article>
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

      <SiteFooter />
    </div>
  );
}
