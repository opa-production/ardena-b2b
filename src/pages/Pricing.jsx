import { useState } from "react";
import { Link } from "react-router-dom";
import usePageTitle from "../hooks/usePageTitle";
import useReveal from "../hooks/useReveal";
import ArdNav from "../components/ArdNav";
import ArdFooter from "../components/ArdFooter";
import PricingPlans from "../components/PricingPlans";
import { CHECK_PRICE, TRIAL_DAYS } from "./pricingData";
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

const PRICING_FAQS = [
  {
    q: "What counts as a vehicle?",
    a: "Any vehicle active on your account. Cars you have archived or sold don't count, so a fleet that shrinks moves back down a band.",
  },
  {
    q: "What happens when I outgrow a band?",
    a: "You move up to the next one and we only charge the difference for the rest of your term — never a full new bill mid-cycle. Nobody should be worse off for adding a car.",
  },
  {
    q: "Is renter verification included?",
    a: `No, and deliberately so. Checks are KES ${CHECK_PRICE} each, paid from a prepaid wallet you top up like airtime. It is a real cost we pass straight through rather than padding every plan to cover the heaviest users.`,
  },
  {
    q: "Am I tied into a contract?",
    a: `No. Every band is billed monthly and you can cancel anytime — you keep the rest of the month you've paid for. Start on the ${TRIAL_DAYS} day free trial and decide after that.`,
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
              Simple, transparent
              <br />
              <span className="pr-title-soft">fleet pricing.</span>
            </h1>
            <p className="pr-sub">
              One fixed price for your whole fleet band — no per-vehicle maths,
              no surprise invoice the month you buy another car.
            </p>
          </div>
        </section>

        {/* ---- The three bands ---- */}
        <section className="pr-cards" id="plans">
          <div className="ard-container">
            <PricingPlans />
          </div>
        </section>

        {/* ---- Pricing questions ---- */}
        <section className="ard-section ard-section--white">
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
        <section className="ard-section ard-section--light">
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
