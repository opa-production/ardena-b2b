import { useState } from "react";
import { Link } from "react-router-dom";
import useReveal from "../hooks/useReveal";
import usePageTitle from "../hooks/usePageTitle";
import ArdNav from "../components/ArdNav";
import ArdFooter from "../components/ArdFooter";
import { FREE_MONTHS } from "./pricingData";
import { SEO_PAGES } from "./seoPagesData";
import "./landingArdena.css";

function Reveal({ className = "", children }) {
  const ref = useReveal();
  return (
    <div ref={ref} className={`reveal-group ${className}`.trim()}>
      {children}
    </div>
  );
}

/* One search landing page (car rental software, fleet management…), in the
   landing page's language: a dark hero, then one full-screen section at a
   time on desktop, alternating sides, then the questions people actually ask.
   Copy lives in seoPagesData.js, shared with the static HTML the build writes
   for crawlers that don't run JavaScript. */
export default function SeoPage({ page }) {
  usePageTitle(page.h1);
  const [openFaq, setOpenFaq] = useState(null);
  const others = SEO_PAGES.filter((p) => p.slug !== page.slug);

  return (
    <div className="ard">
      <ArdNav />

      <main>
        <section className="ard-hero">
          <div className="ard-hero-shades" aria-hidden="true">
            <span className="ard-hero-shade ard-hero-shade--blob-a" />
            <span className="ard-hero-shade ard-hero-shade--blob-b" />
          </div>
          <div className="ard-hero-inner">
            <div className="ard-hero-content">
              <h1 className="ard-hero-title seo-hero-title">{page.h1}</h1>
              <p className="ard-hero-sub">{page.lead}</p>
              <div className="ard-hero-buttons">
                <Link to="/signup" className="ard-btn ard-btn--ink">
                  Request access
                </Link>
                <Link to="/pricing" className="ard-btn ard-btn--outline">
                  See pricing
                </Link>
              </div>
            </div>
          </div>
        </section>

        {page.sections.map((s, i) => (
          <section
            key={s.heading}
            className={`ard-section ard-section--screen ${i % 2 ? "ard-section--cream" : "ard-section--light"}`}
          >
            <div className="ard-container">
              <div className={`ard-split${i % 2 ? " ard-split--reverse" : ""}`}>
                {i % 2 ? (
                  <>
                    <Points points={s.points} />
                    <Intro s={s} />
                  </>
                ) : (
                  <>
                    <Intro s={s} />
                    <Points points={s.points} />
                  </>
                )}
              </div>
            </div>
          </section>
        ))}

        <section className="ard-section ard-section--white">
          <div className="ard-container">
            <h2 className="ard-section-title">Questions</h2>
            <Reveal className="ard-faq-list">
              {page.faq.map((f, i) => (
                <div className={`ard-faq-item${openFaq === i ? " is-open" : ""}`} key={f.q}>
                  <button
                    type="button"
                    className="ard-faq-q"
                    aria-expanded={openFaq === i}
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    {f.q}
                    <span className="ard-faq-icon" aria-hidden="true">+</span>
                  </button>
                  <div className="ard-faq-a">
                    <p>{f.a}</p>
                  </div>
                </div>
              ))}
            </Reveal>

            <div className="ard-cta-card seo-cta">
              <div className="ard-cta-content">
                <h2 className="ard-cta-title">Try it free for {FREE_MONTHS} months</h2>
                <p className="ard-cta-text">
                  Tell us about your business and we will verify it and send your
                  logins within 24 hours. No card required.
                </p>
              </div>
              <Link to="/signup" className="ard-btn ard-btn--ink">
                Request access
              </Link>
            </div>

            <nav className="seo-related" aria-label="More from Ardena for Business">
              <span>Also see</span>
              {others.map((p) => (
                <Link key={p.slug} to={`/${p.slug}`}>
                  {p.nav}
                </Link>
              ))}
            </nav>
          </div>
        </section>
      </main>

      <ArdFooter />
    </div>
  );
}

function Intro({ s }) {
  return (
    <Reveal className="ard-intro">
      <p className="ard-label">▪ {s.label}</p>
      <h2 className="ard-heading">{s.heading}</h2>
      <p className="ard-desc">{s.desc}</p>
    </Reveal>
  );
}

function Points({ points }) {
  return (
    <Reveal className="ard-list">
      {points.map((p, i) => (
        <div className="ard-item" key={p.title}>
          <div className="ard-item-num">{String(i + 1).padStart(2, "0")}</div>
          <div className="ard-item-body">
            <h3 className="ard-item-title">{p.title}</h3>
            <p className="ard-item-desc">{p.desc}</p>
          </div>
        </div>
      ))}
    </Reveal>
  );
}
