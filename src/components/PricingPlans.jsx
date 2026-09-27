import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useReveal from "../hooks/useReveal";
import { fetchPublicPlans } from "../lib/api";
import { FOUNDING_SLOTS, FREE_MONTHS, TIERS, fmtKES } from "../pages/pricingData";
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
 * Every card has a coloured top band (name, price, the one button) and a white
 * lower panel for the reading text. White on the brand blue is only 3.9:1, fine
 * for the large price but not for small copy, so the small copy sits on white
 * where it is easy to read on every card.
 *
 * The founding line reads the live number of spots left from the backend
 * (GET /public/plans) and simply leaves the count out if that call fails, so
 * the page never shows a stale or invented figure.
 */
export default function PricingPlans() {
  const ref = useReveal();
  const [left, setLeft] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchPublicPlans()
      .then((p) => alive && setLeft(p?.founding?.left ?? null))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div ref={ref} className="reveal-group">
      {left !== 0 && (
        <p className="pc-founding">
          <span className="pc-founding-tag">Founding offer</span>
          Our first {FOUNDING_SLOTS} businesses get {FREE_MONTHS} months of Fleet free.
          {left != null && (
            <strong>
              {" "}
              {left} {left === 1 ? "spot" : "spots"} left.
            </strong>
          )}
        </p>
      )}

      <div className="pc-grid">
        {TIERS.map((t) => (
          <article className={`pc-card pc-card--${t.tone}`} key={t.key}>
            <div className="pc-top">
              <span className="pc-name">{t.name}</span>
              <p className="pc-price">
                <Price price={t.price} />
                <span className="pc-per">{t.per}</span>
              </p>
              <Link to={t.cta.to} className={`pc-cta${t.cta.solid ? " pc-cta--solid" : ""}`}>
                {t.cta.label}
              </Link>
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
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
