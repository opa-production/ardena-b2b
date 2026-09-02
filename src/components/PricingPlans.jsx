import { useState } from "react";
import { Link } from "react-router-dom";
import useReveal from "../hooks/useReveal";
import {
  COMMISSION_RATE,
  FLEET_CAP,
  LAUNCH_MONTHS,
  LAUNCH_RATE,
  MIN_VEHICLES,
  PLAN,
  RATE,
  TRIAL_DAYS,
  billAfterCredit,
  commissionOn,
  fmtKES,
  monthlyFor,
} from "../pages/pricingData";
import "../pages/pricingCards.css";

/* Filled tick for an included line; hollow grey for one that sits outside the
   subscription. Showing the excluded line rather than hiding it is the point —
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

const COMMISSION_PCT = Math.round(COMMISSION_RATE * 1000) / 10;

/* Sensible starting point for the estimator: a small fleet doing no app
   business at all. Someone landing here sees the honest full price first and
   watches it fall as they drag, rather than being shown a zero they have to
   work backwards from. */
const DEFAULT_VEHICLES = 5;
const DEFAULT_APP_BOOKINGS = 0;
const APP_BOOKINGS_MAX = 200000;
const APP_BOOKINGS_STEP = 5000;

/**
 * One plan card, and an estimator beside it.
 *
 * There is only one plan, so the old three-card ladder had nothing to compare —
 * and the two things a fleet owner actually wants to know (what does MY fleet
 * cost, and how does the app credit change it) are the two things a static card
 * cannot answer. The estimator answers both in one drag.
 *
 * Monthly billing only for now — annual prepay is a later phase, so there is
 * deliberately no term to choose.
 */
export default function PricingPlans() {
  const ref = useReveal();
  const [vehicles, setVehicles] = useState(DEFAULT_VEHICLES);
  const [appBookings, setAppBookings] = useState(DEFAULT_APP_BOOKINGS);

  const subscription = monthlyFor(vehicles);
  const rawCredit = commissionOn(appBookings);
  // Shown capped at the subscription: the credit reduces a bill, it is never a
  // payout, and displaying "− KES 9,000" against a KES 1,200 bill would imply
  // money owed back.
  const credit = Math.min(rawCredit, subscription);
  const payable = billAfterCredit(subscription, rawCredit);

  const atMinimum = vehicles < MIN_VEHICLES;
  const overCap = vehicles >= FLEET_CAP;

  return (
    <div ref={ref} className="pc-grid pc-grid--two reveal-group">
      {/* ---- The plan ---- */}
      <article className="pc-card pc-card--violet">
        <header className="pc-head">
          <span className="pc-dot" aria-hidden="true" />
          <h3 className="pc-name">{PLAN.name}</h3>
        </header>

        <p className="pc-price">
          <span className="pc-amount">KES {fmtKES(RATE)}</span>
          <span className="pc-per">/ vehicle / month</span>
        </p>

        <p className="pc-range">
          KES {fmtKES(LAUNCH_RATE)} per vehicle for your first {LAUNCH_MONTHS}{" "}
          months · billed for a minimum of {MIN_VEHICLES} vehicles
        </p>

        <Link to="/signup" className="pc-cta pc-cta--solid">
          Start free trial
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

      {/* ---- Estimator ---- */}
      <article className="pc-card pc-card--teal">
        <header className="pc-head">
          <span className="pc-dot" aria-hidden="true" />
          <h3 className="pc-name">Work out your bill</h3>
        </header>

        <div className="pc-field">
          <label className="pc-field-label" htmlFor="pc-vehicles">
            <span>Vehicles in your fleet</span>
            <strong>
              {vehicles}
              {overCap ? "+" : ""}
            </strong>
          </label>
          <input
            id="pc-vehicles"
            type="range"
            min="1"
            max={FLEET_CAP}
            step="1"
            value={vehicles}
            onChange={(e) => setVehicles(Number(e.target.value))}
            className="pc-slider"
          />
        </div>

        <div className="pc-field">
          <label className="pc-field-label" htmlFor="pc-bookings">
            <span>Monthly bookings through the Ardena app</span>
            <strong>KES {fmtKES(appBookings)}</strong>
          </label>
          <input
            id="pc-bookings"
            type="range"
            min="0"
            max={APP_BOOKINGS_MAX}
            step={APP_BOOKINGS_STEP}
            value={appBookings}
            onChange={(e) => setAppBookings(Number(e.target.value))}
            className="pc-slider"
          />
        </div>

        <dl className="pc-breakdown">
          <div>
            <dt>
              Subscription
              {atMinimum && (
                <span className="pc-note"> · {MIN_VEHICLES}-vehicle minimum</span>
              )}
            </dt>
            <dd>KES {fmtKES(subscription)}</dd>
          </div>
          <div className={credit > 0 ? "pc-breakdown-credit" : ""}>
            <dt>
              Ardena app credit
              <span className="pc-note"> · {COMMISSION_PCT}% commission</span>
            </dt>
            <dd>{credit > 0 ? `− KES ${fmtKES(credit)}` : "KES 0"}</dd>
          </div>
          <div className="pc-breakdown-total">
            <dt>You pay</dt>
            <dd>KES {fmtKES(payable)}</dd>
          </div>
        </dl>

        <p className="pc-calc-foot">
          {payable === 0
            ? "Your app bookings more than cover the subscription, so the dashboard costs you nothing this month."
            : `Standard rate shown. Your first ${LAUNCH_MONTHS} months are half this, and the first ${TRIAL_DAYS} days are free.`}
        </p>

        {overCap && (
          <p className="pc-calc-foot">
            Running {FLEET_CAP}+ vehicles?{" "}
            <Link to="/contact" className="pc-inline-link">
              Talk to us about a custom plan
            </Link>
            .
          </p>
        )}
      </article>
    </div>
  );
}
