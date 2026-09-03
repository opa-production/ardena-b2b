import { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import Dropdown from "../components/Dropdown";
import usePageTitle from "../hooks/usePageTitle";
import { requestAccess } from "../lib/api";
import "./auth.css";

/* Display labels mapped to the API's fleet_size values.
   The values on the right are the backend's enum (see api.js), not ours to
   restyle — "3 to 10" would be rejected. The labels on the left are what the
   user reads and are swept like any other copy.
   strip-dashes: keep-start */
const FLEET_SIZES = {
  "3 to 10 vehicles": "3–10",
  "11 to 30 vehicles": "11–30",
  "31 to 100 vehicles": "31–100",
  "100+ vehicles": "100+",
};
// strip-dashes: keep-end
const FLEET_LABELS = Object.keys(FLEET_SIZES);

/* Access is by request: every business is verified before logins are sent. */
export default function Signup() {
  usePageTitle("Request access");
  const [sent, setSent] = useState(null); // { reference } once submitted
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    business: "",
    town: "",
    name: "",
    email: "",
    phone: "",
    website: "",
  });
  const [fleetSize, setFleetSize] = useState(FLEET_LABELS[0]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await requestAccess({
        business_name: form.business.trim(),
        contact_name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        fleet_size: FLEET_SIZES[fleetSize],
        town: form.town.trim(),
        website: form.website.trim() || undefined,
      });
      setSent({ reference: res?.reference || res?.ref || null });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="auth">
        <header className="auth-nav">
          <Logo />
        </header>

        <main className="auth-card">
          <span className="request-check" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </span>
          <h1>Request received.</h1>
          <p>
            We verify every business first. Your logins arrive by email or
            WhatsApp within 24 hours.
          </p>
          {sent.reference && (
            <p className="request-ref">Reference: {sent.reference}</p>
          )}
          <Link to="/" className="btn btn-ghost">
            Back to home
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="auth">
      <header className="auth-nav">
        <Logo />
      </header>

      <main className="request-split">
        <div className="request-intro">
          <h1>Request access</h1>
          <p>
            For verified rental businesses. We&apos;ll send your logins within
            24 hours.
          </p>
          <p className="auth-switch">
            Already have logins? <Link to="/login">Sign in</Link>
          </p>
          <p className="auth-cancel">
            <Link to="/">Cancel</Link>
          </p>
        </div>

        <form className="auth-form request-form" onSubmit={handleSubmit}>
          <div className="auth-row">
            <div className="field">
              <label htmlFor="r-business">Business name</label>
              <input id="r-business" type="text" placeholder="Acme Car Hire Ltd" autoComplete="organization" value={form.business} onChange={set("business")} required />
            </div>
            <div className="field">
              <label htmlFor="r-fleet">Fleet size</label>
              <Dropdown
                id="r-fleet"
                value={fleetSize}
                onChange={setFleetSize}
                options={FLEET_LABELS}
              />
            </div>
          </div>
          <div className="auth-row">
            <div className="field">
              <label htmlFor="r-town">Town / county</label>
              <input id="r-town" type="text" placeholder="Nakuru" value={form.town} onChange={set("town")} required />
            </div>
            <div className="field">
              <label htmlFor="r-name">Your name</label>
              <input id="r-name" type="text" placeholder="Wanjiku Kamau" autoComplete="name" value={form.name} onChange={set("name")} required />
            </div>
          </div>
          <div className="auth-row">
            <div className="field">
              <label htmlFor="r-email">Work email</label>
              <input id="r-email" type="email" placeholder="you@company.co.ke" autoComplete="email" value={form.email} onChange={set("email")} required />
            </div>
            <div className="field">
              <label htmlFor="r-phone">Phone (WhatsApp)</label>
              <input id="r-phone" type="tel" placeholder="0700 000 000" autoComplete="tel" value={form.phone} onChange={set("phone")} required />
            </div>
          </div>
          <div className="field">
            <label htmlFor="r-web">Website or Instagram <span className="field-opt">optional</span></label>
            <input id="r-web" type="text" placeholder="acmecarhire.co.ke" value={form.website} onChange={set("website")} />
          </div>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Sending…" : "Request access"}
          </button>
        </form>
      </main>
    </div>
  );
}
