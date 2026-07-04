import { Link } from "react-router-dom";
import SiteNav from "../components/SiteNav";
import SiteFooter from "../components/SiteFooter";
import "./landing.css";

const VALUES = [
  {
    title: "Operators first",
    desc: "We build for the person handing over the keys — every screen earns its place on a busy pickup morning.",
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
  { value: "2026", label: "founded in Nairobi" },
  { value: "8", label: "modules in one subscription" },
  { value: "14 days", label: "free on every plan" },
];

export default function About() {
  return (
    <div className="landing site-page">
      <SiteNav />

      <section className="panel">
        <div className="page-body">
          <div className="page-intro">
            <h1>
              The operating system for
              <br />
              rental businesses.
            </h1>
          </div>

          <div className="prose">
            <p>
              Most car rental businesses in Kenya run on WhatsApp threads,
              paper logbooks and a spreadsheet someone updates at midnight.
              Bookings clash, payments go unreconciled, and handing keys to a
              stranger rests on a photocopy of an ID.
            </p>
            <p>
              Ardena started in Nairobi in 2026 to change that. We put the
              whole operation — fleet, bookings, verified customers, M-Pesa
              payments, staff and reporting — into one system a rental team
              can learn in an afternoon, billed as a single monthly
              subscription with no heavy setup.
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

      {/* ---- Values (black) ---- */}
      <section className="panel modules about-values">
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
      </section>

      {/* ---- CTA (white) ---- */}
      <section className="panel closing about-closing">
        <div className="closing-body">
          <h2>See it with your own fleet.</h2>
          <p>Start with a demo, or set up your vehicles in minutes.</p>
          <div className="hero-cta">
            <Link to="/signup" className="btn btn-primary">
              Get started
            </Link>
            <Link to="/contact" className="btn btn-ghost">
              Talk to us
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
