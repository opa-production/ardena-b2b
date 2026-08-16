import { Link } from "react-router-dom";
import useReveal from "../hooks/useReveal";
import { TIERS, fmtKES } from "../pages/pricingData";
import "../pages/pricingCards.css";

/* Filled tick for an included line; hollow grey for one this tier doesn't get.
   Showing the excluded lines rather than hiding them is what makes the ladder
   legible — you can see what the next tier up buys you. */
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
 * The three fleet-band cards.
 *
 * Monthly billing only for now — annual prepay is a later phase, so there is
 * deliberately no term to choose.
 */
export default function PricingPlans() {
  const ref = useReveal();

  return (
    <div ref={ref} className="pc-grid reveal-group">
      {TIERS.map((tier) => (
        <article
          className={`pc-card pc-card--${tier.accent}${tier.popular ? " pc-card--popular" : ""}`}
          key={tier.key}
        >
          {tier.popular && <span className="pc-flag">Most popular</span>}

          <header className="pc-head">
            <span className="pc-dot" aria-hidden="true" />
            <h3 className="pc-name">{tier.name}</h3>
          </header>

          <p className="pc-price">
            <span className="pc-amount">KES {fmtKES(tier.monthly)}</span>
            <span className="pc-per">/mo</span>
          </p>

          <p className="pc-range">{tier.range}</p>

          <Link
            to={tier.cta.to}
            className={`pc-cta${tier.popular ? " pc-cta--solid" : ""}`}
          >
            {tier.cta.label}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>

          <ul className="pc-features">
            {tier.features.map((f) => (
              <li key={f}>
                <Tick />
                {f}
              </li>
            ))}
            {tier.muted.map((f) => (
              <li className="pc-feature--muted" key={f}>
                <Tick muted />
                {f}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}
