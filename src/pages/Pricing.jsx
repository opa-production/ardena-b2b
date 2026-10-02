import { useState } from "react";
import { Link } from "react-router-dom";
import usePageTitle from "../hooks/usePageTitle";
import useReveal from "../hooks/useReveal";
import ArdNav from "../components/ArdNav";
import ArdFooter from "../components/ArdFooter";
import PricingPlans from "../components/PricingPlans";
import {
  CHECK_PRICE,
  FLEET_CAP,
  FLEET_FREE_CARS,
  FLEET_RULE,
  fleetFee,
  FLEET_PRICE,
  STARTER_CARS,
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

/* Every figure here is derived from pricingData, never typed, so the page
   can't disagree with the backend's plans (GET /public/plans). */
const PRICING_FAQS = [
  {
    q: "What does it cost?",
    a: `Starter is free forever for up to ${STARTER_CARS} cars. On Fleet ${FLEET_RULE} a month, however big your fleet. So a fleet of 5 cars pays for 2: KES ${fmtKES(fleetFee(5))} a month. Enterprise is priced with you.`,
  },
  {
    q: "Is there a free trial?",
    a: `There's no time-limited trial. Instead, Starter is free forever for up to ${STARTER_CARS} cars, with bookings, clients, payments, staff and the calendar. Move to Fleet when you want reports, exports and more cars, and drop back to Starter any time. We never charge you unless you choose to upgrade.`,
  },
  {
    q: "How do I pay?",
    a: "From your Ardena wallet, which you top up with M-Pesa or card like airtime. Fleet is paid 30 days at a time and renews itself from the wallet, and you can turn renewal off whenever you like.",
  },
  {
    q: "What if I don't pay?",
    a: `You move to Starter. Nothing is locked and nothing is deleted: your cars, bookings, clients and history all stay. New bookings go on your first ${STARTER_CARS} cars and reports pause until you upgrade again.`,
  },
  {
    q: "I list cars on the Ardena app. Do I pay twice?",
    a: "No. The commission we earn from your Ardena app bookings comes off your Fleet bill. List a few cars that get booked and the dashboard can cost you nothing.",
  },
  {
    q: "Is renter verification included?",
    a: `Checks are pay as you go on every plan, at KES ${fmtKES(CHECK_PRICE)} each from your wallet. Each check costs us money at the registry, so it is a genuine pass-through, and you only pay for checks you actually run.`,
  },
  {
    q: "Do you take commission on my own direct bookings?",
    a: "Never. Bookings you bring in yourself, walk-ins, phone, your repeat corporate clients, are yours in full. We only take a cut of business the Ardena app sends you, because that is business you did not have.",
  },
  {
    q: "Am I tied into a contract?",
    a: "No. Fleet is 30 days at a time with no lock-in, and your data is yours to export whenever you want it.",
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
              Start free.
              <br />
              <span className="pr-title-soft">Pay as your fleet grows.</span>
            </h1>
            <p className="pr-sub">
              Starter is free forever for up to {STARTER_CARS} cars. On Fleet your first{" "}
              {FLEET_FREE_CARS} stay free and each extra car is KES {FLEET_PRICE} a month, never
              more than KES {fmtKES(FLEET_CAP)}.
            </p>
          </div>
        </section>

        {/* ---- The plan + estimator ---- */}
        <section className="pr-cards" id="plans">
          <div className="ard-container">
            <PricingPlans />
          </div>
        </section>

        {/* ---- How paying works ----
             The questions a price always raises, answered before anyone has
             to go looking in the FAQ. */}
        <section className="ard-section ard-section--white">
          <div className="ard-container">
            <h2 className="ard-section-title">How paying works</h2>
            <Reveal className="pr-explain">
              <p className="pr-explain-lead">
                Fleet is paid from your Ardena wallet, 30 days at a time, and
                renews itself from the wallet. Top the wallet up with M-Pesa or
                card whenever it suits you, and turn renewal off any time.
              </p>
              <p className="pr-explain-lead">
                If a renewal can&apos;t be paid, you simply move to Starter.
                Nothing is locked and nothing is deleted, and upgrading again
                picks up where you left off. Commission we earn from your Ardena
                app bookings comes off your bill.
              </p>
              <p className="pr-explain-foot">
                Renter verification is pay as you go on every plan: KES{" "}
                {fmtKES(CHECK_PRICE)} per check, drawn from the same wallet.
                Each check costs us money at the registry, so it is passed
                straight through rather than given away.
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
                <h2 className="ard-cta-title">
                  Start free, upgrade when it pays
                </h2>
                <p className="ard-cta-text">
                  Run up to {STARTER_CARS} cars free on Starter, and move to
                  Fleet when reports and a bigger fleet are worth KES{" "}
                  {FLEET_PRICE} a car to you.
                </p>
              </div>
              <Link to="/signup" className="ard-btn ard-btn--ink">
                Get started
              </Link>
            </div>
          </div>
        </section>
      </main>

      <ArdFooter />
    </div>
  );
}
