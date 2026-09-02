import { Link } from "react-router-dom";
import useReveal from "../hooks/useReveal";
import { TIERS, fmtKES } from "../pages/pricingData";
import "../pages/pricingCards.css";

/* Filled tick for an included line; hollow grey for one that sits outside the
   plan. Showing the excluded line rather than hiding it is the point, nobody
   should discover the verification charge on an invoice. */
function Tick({ muted = false }) {
  return (
    <span className={`pc-tick${muted ? " pc-tick--muted" : ""}`} aria-hidden="true">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </span>
  );
}

/* The price slot, which has three states and keeps the same shape in all of
   them so the row of cards does not move when the figures land:
   0 is free, a number is a price, and null is a tier we have not priced yet. */
function Price({ price }) {
  if (price === null) {
    return (
      <span className="pc-amount pc-amount--pending" aria-label="Price not announced yet">
        Soon
      </span>
    );
  }
  if (price === 0) return <span className="pc-amount">Free</span>;
  return (
    <span className="pc-amount">
      <span className="pc-cur">KES </span>
      {fmtKES(price)}
    </span>
  );
}

/**
 * The plan grid.
 *
 * Three tiers, one of which has a price. That is deliberate: the free months
 * are real and the rest is not set, so the cards show the shape without
 * quoting a figure nobody has committed to. Every tier is data in
 * pricingData.js, so announcing prices is a number per tier rather than a
 * markup change, and nothing here shifts when they arrive.
 */
export default function PricingPlans() {
  const ref = useReveal();

  return (
    <div ref={ref} className="pc-grid reveal-group">
      {TIERS.map((t) => (
        <article className={`pc-card${t.price === null ? " pc-card--pending" : ""}`} key={t.key}>
          <header className="pc-head">
            <span className="pc-name">{t.name}</span>
          </header>

          <p className="pc-price">
            <Price price={t.price} />
            <span className="pc-per">{t.per}</span>
          </p>

          <p className="pc-range">{t.blurb}</p>

          <Link
            to={t.cta.to}
            className={`pc-cta${t.cta.solid ? " pc-cta--solid" : ""}`}
          >
            {t.cta.label}
          </Link>

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
        </article>
      ))}
    </div>
  );
}
