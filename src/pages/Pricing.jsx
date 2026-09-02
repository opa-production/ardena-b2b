import { useState } from "react";
import { Link } from "react-router-dom";
import usePageTitle from "../hooks/usePageTitle";
import useReveal from "../hooks/useReveal";
import ArdNav from "../components/ArdNav";
import ArdFooter from "../components/ArdFooter";
import PricingPlans from "../components/PricingPlans";
import {
  CHECK_PRICE,
  COMMISSION_RATE,
  CREDIT_EXAMPLES,
  LAUNCH_MONTHS,
  LAUNCH_RATE,
  MIN_VEHICLES,
  RATE,
  TRIAL_DAYS,
  fmtKES,
} from "./pricingData";
import "./landingArdena.css";
import "./pricingCards.css";

function Reveal({ as: Tag = "div", className = "", children }) {
  const ref = useReveal();
  return (
    <Tag ref={ref} className={`${className} reveal-group`.trim()}>
      {children}
    </Tag>
  );
}

const COMMISSION_PCT = Math.round(COMMISSION_RATE * 1000) / 10;

/* Every figure here is derived from pricingData, never typed. A pricing page
   that disagrees with the invoice is worse than no pricing page. */
const PRICING_FAQS = [
  {
    q: "How is my bill worked out?",
    a: `KES ${fmtKES(RATE)} per vehicle per month, with a minimum of ${MIN_VEHICLES} vehicles. So a ${MIN_VEHICLES}-car fleet pays KES ${fmtKES(RATE * MIN_VEHICLES)} and a 25-car fleet pays KES ${fmtKES(RATE * 25)} — the same price per car either way. Your first ${LAUNCH_MONTHS} months are KES ${fmtKES(LAUNCH_RATE)} per vehicle.`,
  },
  {
    q: `Why a ${MIN_VEHICLES}-vehicle minimum?`,
    a: `It's the floor that keeps the per-vehicle price honest. We used to set a minimum in shillings instead, which meant every fleet under five cars paid an identical bill — a ${MIN_VEHICLES}-car fleet was effectively paying nearly double per car what a big fleet paid. A minimum expressed in vehicles doesn't do that.`,
  },
  {
    q: "How does the Ardena app credit work?",
    a: `List your cars on the Ardena consumer app and we take ${COMMISSION_PCT}% commission on the bookings that come through it. That commission comes straight off your subscription. Earn more in commission than your subscription is worth and you pay nothing for the dashboard that month — we've already been paid.`,
  },
  {
    q: "Do I have to list on the Ardena app?",
    a: "No. The dashboard runs your own direct bookings perfectly well on its own, and plenty of fleets use it that way. Listing is how you stop paying for it — and how you fill the cars that are sitting idle.",
  },
  {
    q: "Do you take commission on my own direct bookings?",
    a: "Never. Bookings you bring in yourself — walk-ins, phone, your repeat corporate clients — are yours in full. We only take a cut of business the Ardena app sends you, because that's business you didn't have.",
  },
  {
    q: "What counts as a vehicle?",
    a: `Any vehicle active on your account. Cars you've archived or sold don't count, so a fleet that shrinks pays less the following cycle — down to the ${MIN_VEHICLES}-vehicle minimum.`,
  },
  {
    q: "What happens when I add a car mid-month?",
    a: "Nothing until your next cycle. We snapshot your fleet size when the invoice is raised, so adding a car never triggers a bill mid-month. Nobody should be worse off for growing.",
  },
  {
    q: "Is renter verification included?",
    a: `No, and deliberately so. Checks are KES ${CHECK_PRICE} each, paid from a prepaid wallet you top up like airtime. It is a real cost we pass straight through rather than padding every plan to cover the heaviest users. The app credit applies to your subscription, not to check charges.`,
  },
  {
    q: "Am I tied into a contract?",
    a: `No. Billing is monthly and you can cancel anytime — you keep the rest of the month you've paid for. Start on the ${TRIAL_DAYS} day free trial and decide after that.`,
  },
];

export default function Pricing() {
  usePageTitle("Pricing");
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="ard">
      <ArdNav />

      <main>
        {/* ---- Hero: owns the viewport, copy hard-left like the home page ---- */}
        <section className="pr-hero">
          <div className="pr-hero-inner">
            <h1 className="pr-title">
              Pay for the cars
              <br />
              <span className="pr-title-soft">you actually run.</span>
            </h1>
            <p className="pr-sub">
              KES {fmtKES(RATE)} per vehicle per month — the same price whether
              you run three cars or thirty. List on the Ardena app and your
              commission pays the bill for you.
            </p>
          </div>
        </section>

        {/* ---- The plan + estimator ---- */}
        <section className="pr-cards" id="plans">
          <div className="ard-container">
            <PricingPlans />
          </div>
        </section>

        {/* ---- How the credit works ----
             The estimator shows the mechanism moving; this shows it standing
             still, side by side, which is what makes it obvious that a small
             listed fleet can pay nothing while a big unlisted one pays full
             price. Both read from the same numbers. */}
        <section className="ard-section ard-section--white">
          <div className="ard-container">
            <h2 className="ard-section-title">
              Your Ardena bookings pay your bill
            </h2>
            <Reveal className="pr-explain">
              <p className="pr-explain-lead">
                Every booking the Ardena consumer app sends you earns us{" "}
                {COMMISSION_PCT}% commission. Rather than charge you that{" "}
                <em>and</em> a subscription, we take the commission off your
                subscription. We end up earning whichever is larger — never
                both.
              </p>
              <p className="pr-explain-lead">
                Which means the fleets selling well on Ardena pay nothing for
                the software, and the ones using the software without listing
                pay for it normally. Your own direct bookings are never touched.
              </p>

              <div className="pr-table-wrap">
                <table className="pr-table">
                  <thead>
                    <tr>
                      <th>Fleet</th>
                      <th>Ardena app bookings</th>
                      <th>Subscription</th>
                      <th>Credit</th>
                      <th>You pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CREDIT_EXAMPLES.map((row) => (
                      <tr key={`${row.vehicles}-${row.appBookings}`}>
                        <td>
                          <strong>{row.vehicles} cars</strong>
                          <span className="pr-table-note">{row.note}</span>
                        </td>
                        <td>KES {fmtKES(row.appBookings)}</td>
                        <td>KES {fmtKES(row.subscription)}</td>
                        <td className={row.credit > 0 ? "pr-table-credit" : ""}>
                          {row.credit > 0
                            ? `− KES ${fmtKES(row.credit)}`
                            : "—"}
                        </td>
                        <td className="pr-table-total">
                          {row.payable === 0
                            ? "Nothing"
                            : `KES ${fmtKES(row.payable)}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="pr-explain-foot">
                Figures at the standard KES {fmtKES(RATE)} rate. Your first{" "}
                {LAUNCH_MONTHS} months are KES {fmtKES(LAUNCH_RATE)} per
                vehicle, and the first {TRIAL_DAYS} days are free.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ---- Pricing questions ---- */}
        <section className="ard-section ard-section--light">
          <div className="ard-container">
            <h2 className="ard-section-title">Pricing questions</h2>
            <Reveal className="ard-faq-list">
              {PRICING_FAQS.map((f, i) => (
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

        {/* ---- Closing ---- */}
        <section className="ard-section ard-section--white">
          <div className="ard-container">
            <div className="ard-cta-card">
              <div className="ard-cta-content">
                <h2 className="ard-cta-title">Start free, pay when it works</h2>
                <p className="ard-cta-text">
                  Every account begins with a {TRIAL_DAYS} day free trial and no
                  card. If it isn&apos;t running your business by the end of it,
                  walk away.
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
