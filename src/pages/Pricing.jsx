import { useState } from "react";
import { Link } from "react-router-dom";
import usePageTitle from "../hooks/usePageTitle";
import useReveal from "../hooks/useReveal";
import ArdNav from "../components/ArdNav";
import ArdFooter from "../components/ArdFooter";
import PricingPlans from "../components/PricingPlans";
import { CHECK_PRICE, FREE_MONTHS, fmtKES } from "./pricingData";
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

/* Every figure here is derived from pricingData, never typed. A pricing page
   that disagrees with the invoice is worse than no pricing page — which during
   the launch phase means these answers may state exactly two things: the free
   months, and the per-check verification price. */
const PRICING_FAQS = [
  {
    q: "What does it cost?",
    a: `Nothing for your first ${FREE_MONTHS} months. No card, no commitment, every module included. We are still setting the prices that follow, and we would rather say that plainly than publish a number we might change.`,
  },
  {
    q: "What happens after the free months?",
    a: `We will announce pricing well before your free months run out, and every workspace already signed up hears it from us first, by email and in the dashboard. Nobody gets moved onto a paid plan by surprise, and nobody is charged without agreeing to the price.`,
  },
  {
    q: "Is renter verification free too?",
    a: `No, checks are the one thing billed during the free months, at KES ${fmtKES(CHECK_PRICE)} each, paid from a prepaid wallet you top up like airtime. Each check costs us money at the registry, so it is a genuine pass-through rather than something we can give away. You only pay for checks you actually run.`,
  },
  {
    q: "Is there a limit on vehicles or staff during the free months?",
    a: "No. Add every car you run and invite your whole team. We would rather see the platform used properly than meter a trial.",
  },
  {
    q: "Do I have to list on the Ardena app?",
    a: "No. The dashboard runs your own direct bookings perfectly well on its own, and plenty of fleets use it that way. Listing is how you fill the cars that are sitting idle.",
  },
  {
    q: "Do you take commission on my own direct bookings?",
    a: "Never. Bookings you bring in yourself, walk-ins, phone, your repeat corporate clients, are yours in full. We only take a cut of business the Ardena app sends you, because that is business you did not have.",
  },
  {
    q: "Am I tied into a contract?",
    a: "No. There is nothing to cancel during the free months, and when pricing does start it will be monthly with no lock-in. Your data is yours to export whenever you want it.",
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
              Free for your
              <br />
              <span className="pr-title-soft">first {FREE_MONTHS} months.</span>
            </h1>
            <p className="pr-sub">
              Every module, every vehicle, your whole team, no card required.
              We&apos;re still setting what comes after, and we&apos;ll announce
              it well before it starts.
            </p>
          </div>
        </section>

        {/* ---- The plan + estimator ---- */}
        <section className="pr-cards" id="plans">
          <div className="ard-container">
            <PricingPlans />
          </div>
        </section>

        {/* ---- What happens after the free months ----
             The one question a free launch offer always raises. Answering it
             here, unprompted and above the FAQ, is the difference between an
             offer and a trap. */}
        <section className="ard-section ard-section--white">
          <div className="ard-container">
            <h2 className="ard-section-title">And after that?</h2>
            <Reveal className="pr-explain">
              <p className="pr-explain-lead">
                We haven&apos;t set the prices yet, and we&apos;re not going to
                pretend otherwise. What we can promise is how it will happen:
                pricing gets announced well before your free months end, every
                workspace already signed up hears it from us first, and nobody
                is moved onto a paid plan without agreeing to the price.
              </p>
              <p className="pr-explain-lead">
                When it lands it will be competitive for the Kenyan market,
                monthly, and cancellable, the same terms we would want. Your
                data is yours to export either way.
              </p>
              <p className="pr-explain-foot">
                Renter verification is the exception, and it is charged from day
                one: KES {fmtKES(CHECK_PRICE)} per check, drawn from a prepaid
                wallet. Each check costs us money at the registry, so it is
                passed straight through rather than given away.
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
                  Start free, decide later
                </h2>
                <p className="ard-cta-text">
                  {FREE_MONTHS} months, every module, no card. If it
                  isn&apos;t running your business by the end of them, walk
                  away, and if it is, you&apos;ll know the price before you
                  ever pay it.
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
