import { Link } from "react-router-dom";
import SiteNav from "../components/SiteNav";
import SiteFooter from "../components/SiteFooter";
import "./landing.css";

const VALUES = [
  {
    title: "Operators first",
    desc: "We build for the person handing over the keys. Every screen earns its place on a busy pickup morning.",
  },
  {
    title: "Trust built in",
    desc: "Verified renters, logged actions and isolated workspaces. Handing a stranger a car should never be a gamble.",
  },
  {
    title: "Kenya-ready",
    desc: "M-Pesa first, KES pricing, local IDs and licences. Built where the business actually runs, not adapted for it.",
  },
];

const STATS = [
  { value: "Nakuru", label: "where we started" },
  { value: "17 Mar 2026", label: "incorporated" },
  { value: "8", label: "modules in one plan" },
];

export default function About() {
  return (
    <div className="landing about-page">
      <SiteNav />

      {/* ---- Hero: small header + description alone (white, full viewport) ---- */}
      <section className="panel about-hero">
        <div className="about-hero-body">
          <h1>About Ardena for Business.</h1>
          <p>
            Ardena for Business is the business side of{" "}
            <a href="https://ardena.co.ke" target="_blank" rel="noreferrer">
              ardena.co.ke
            </a>
            , built by Ardena Platforms Africa Ltd, incorporated on 17 March
            2026 and started in Nakuru, Kenya.
          </p>
        </div>
      </section>

      {/* ---- Story (black, full viewport) ---- */}
      <section className="panel modules about-story">
        <div className="story-body">
          <h2>Why we exist.</h2>
          <div className="prose prose-dark">
            <p>
              Most car rental businesses in Kenya run on WhatsApp threads,
              paper logbooks and a spreadsheet someone updates at midnight.
              Bookings clash, payments go unreconciled, and handing keys to a
              stranger rests on a photocopy of an ID.
            </p>
            <p>
              Ardena began at ardena.co.ke, where renters find quality cars.
              Ardena Platforms Africa Ltd, incorporated on 17 March 2026 and
              born in Nakuru, built Ardena for Business as the business
              extension of that platform: fleet, bookings, verified customers,
              M-Pesa payments, staff and reporting in one system, billed per
              vehicle with no heavy setup.
            </p>
            <p>
              Today we're building for owners who take rentals seriously: the
              five-car operator scaling to fifty, and the established fleet
              that's outgrown its spreadsheet.
            </p>
          </div>

          <div className="about-stats">
            {STATS.map((s) => (
              <div className="about-stat" key={s.label}>
                <strong>{s.value}</strong>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Values + CTA (white, full viewport) ---- */}
      <section className="panel about-values">
        <div className="section-head">
          <h2>What we optimise for.</h2>
        </div>
        <div className="module-grid values-grid">
          {VALUES.map((v) => (
            <article className="module-card" key={v.title}>
              <span className="module-dot" />
              <h3>{v.title}</h3>
              <p>{v.desc}</p>
            </article>
          ))}
        </div>
        <div className="hero-cta about-cta">
          <Link to="/signup" className="btn btn-primary">
            Get started
          </Link>
          <Link to="/contact" className="btn btn-ghost">
            Talk to us
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
