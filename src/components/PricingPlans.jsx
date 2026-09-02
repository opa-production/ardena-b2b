import { Link } from "react-router-dom";
import useReveal from "../hooks/useReveal";
import { FREE_MONTHS, PLAN } from "../pages/pricingData";
import "../pages/pricingCards.css";

/* Filled tick for an included line; hollow grey for one that sits outside the
   free period. Showing the excluded line rather than hiding it is the point —
   nobody should discover the verification charge on an invoice. */
function Tick({ muted = false }) {
  return (
    <span className={`pc-tick${muted ? " pc-tick--muted" : ""}`} aria-hidden="true">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </span>
  );
}

/**
 * The launch offer: one card, one promise.
 *
 * This replaced a plan card and a per-vehicle estimator beside it. Both quoted
 * a subscription price, and there isn't one yet — pricing is set after the free
 * months and announced first. An estimator with nothing to estimate is worse
 * than no estimator, so the card says the two things that are true today: it
 * is free for FREE_MONTHS months, and — via the muted feature line — that
 * renter checks are still billed.
 */
export default function PricingPlans() {
  const ref = useReveal();

  return (
    <div ref={ref} className="pc-grid reveal-group">
      <article className="pc-card pc-card--violet pc-card--solo">
        <header className="pc-head">
          <span className="pc-dot" aria-hidden="true" />
          <h3 className="pc-name">{PLAN.name}</h3>
        </header>

        <p className="pc-price">
          <span className="pc-amount">Free</span>
          <span className="pc-per">for {FREE_MONTHS} months</span>
        </p>

        <p className="pc-range">
          No card required. We&apos;ll announce pricing well before the free
          months end, and tell you first.
        </p>

        <Link to="/signup" className="pc-cta pc-cta--solid">
          Get started free
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>

        <ul className="pc-features">
          {PLAN.features.map((f) => (
            <li key={f}>
              <Tick />
              {f}
            </li>
          ))}
          {PLAN.muted.map((f) => (
            <li className="pc-feature--muted" key={f}>
              <Tick muted />
              {f}
            </li>
          ))}
        </ul>
      </article>
    </div>
  );
}
