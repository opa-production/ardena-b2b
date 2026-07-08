import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Logo from "../components/Logo";
import usePageTitle from "../hooks/usePageTitle";
import { fetchTrust } from "../lib/api";
import "./auth.css";
import "./trust.css";

/* Public trust pages, served by GET /trust/{slug}. The slug is what a
   verified business shares with customers. */
export default function VerifyBusiness() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [biz, setBiz] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchTrust(slug)
      .then((data) => {
        if (!alive || !data) return;
        setBiz({
          name: data.name,
          location: data.location,
          since: data.since || data.verified_since,
          fleet: data.fleet_summary || data.fleet,
          checks: Array.isArray(data.checks) ? data.checks : [],
        });
      })
      .catch(() => {}) // unknown slug → "no verified business" card
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [slug]);

  usePageTitle(biz ? `${biz.name} is verified` : "Verification");

  if (loading) {
    return (
      <div className="trust">
        <header className="trust-nav">
          <Logo />
        </header>
        <main className="trust-card">
          <h1>Checking this link…</h1>
        </main>
      </div>
    );
  }

  return (
    <div className="trust">
      <header className="trust-nav">
        <Logo />
      </header>

      {biz ? (
        <main className="trust-card">
          <span className="trust-shield" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1.7l8 3.2v6.1c0 5.1-3.4 9.7-8 11.3-4.6-1.6-8-6.2-8-11.3V4.9l8-3.2z" />
              <path d="M10.9 15.2l-3-3 1.4-1.4 1.6 1.6 4-4 1.4 1.4-5.4 5.4z" fill="#fff" />
            </svg>
          </span>

          <h1>
            {biz.name} is <span className="trust-hl">Ardena Verified</span>.
          </h1>
          <p className="trust-sub">
            Verified rental business
            {biz.location ? ` · ${biz.location}` : ""}
            {biz.since ? ` · since ${biz.since}` : ""}
          </p>

          <ul className="trust-checks">
            {biz.checks.map((c) => (
              <li key={c}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                {c}
              </li>
            ))}
          </ul>

          {biz.fleet && <p className="trust-meta">{biz.fleet}</p>}

          <p className="trust-blurb">
            Ardena checked official registration records and director identity
            documents before this business was allowed on the platform. If
            someone claims to be {biz.name} but sent you a different link,
            don't hand over money or documents.
          </p>

          <div className="trust-cta">
            <a className="btn btn-primary" href="https://ardena.co.ke" target="_blank" rel="noreferrer">
              Browse cars on ardena.co.ke
            </a>
            <Link className="btn btn-ghost" to="/signup">
              Verify your business
            </Link>
          </div>
        </main>
      ) : (
        <main className="trust-card">
          <h1>No verified business here.</h1>
          <p className="trust-sub">
            This link doesn't match any verified business. Check the link you
            were sent, and be careful who you pay.
          </p>
          <div className="trust-cta">
            <Link className="btn btn-primary" to="/">
              Go to Ardena for Business
            </Link>
          </div>
        </main>
      )}

      <p className="trust-foot">
        © {new Date().getFullYear()} Ardena Platforms Africa Ltd ·
        business.ardena.co.ke
      </p>
    </div>
  );
}
