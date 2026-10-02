import { Link } from "react-router-dom";
import useReveal from "../hooks/useReveal";
import { TIERS, fmtKES } from "../pages/pricingData";
import "../pages/pricingCards.css";

/* Filled tick for an included line; hollow grey for one that sits outside the
   plan. Showing the excluded line rather than hiding it is the point: nobody
   should discover the verification charge, or a missing feature, later. */
function Tick({ muted = false }) {
  return (
    <span className={`pc-tick${muted ? " pc-tick--muted" : ""}`} aria-hidden="true">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </span>
  );
}

/* 0 is free, a number is a price, null is custom terms. */
function Price({ price }) {
  if (price === null) return <span className="pc-amount">Custom</span>;
  if (price === 0) return <span className="pc-amount">Free</span>;
  return (
    <span className="pc-amount">
      <span className="pc-cur">KES </span>
      {fmtKES(price)}
    </span>
  );
}

/**
 * The plan grid: Starter, Fleet and Enterprise, each in its own colour.
 *
 * Fleet is a fully blue card and Enterprise a fully lavender one; Starter stays
 * white. The button sits at the foot of every card so the three line up. The
 * blue is a shade deeper than the brand #007FFA because white small text on
 * #007FFA is only 3.9:1; on #0068D6 it passes at 5.2:1.
 */
export default function PricingPlans() {
  const ref = useReveal();

  return (
    <div ref={ref} className="reveal-group">
      <div className="pc-grid">
        {TIERS.map((t) => (
          <article className={`pc-card pc-card--${t.tone}`} key={t.key}>
            <div className="pc-top">
              <span className="pc-name">{t.name}</span>
              <p className="pc-price">
                <Price price={t.price} />
                <span className="pc-per">{t.per}</span>
              </p>
            </div>

            <div className="pc-body">
              <p className="pc-range">{t.blurb}</p>
              <ul className="pc-features">
                {t.features.map((f) => (
                  <li key={f}>
                    <Tick />
                    {f}
                  </li>
                ))}
                {t.muted.map((f) => (
                  <li className="pc-feature--muted" key={f}>
                    <Tick muted />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to={t.cta.to} className={`pc-cta${t.cta.solid ? " pc-cta--solid" : ""}`}>
                {t.cta.label}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
