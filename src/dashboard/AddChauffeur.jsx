import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { addChauffeur, CH_STATUSES } from "./chauffeursStore";
import Dropdown from "../components/Dropdown";
import DatePicker from "./DatePicker";
import { todayISO } from "./bookingsStore";
import { toast } from "./toastStore";
import usePageTitle from "../hooks/usePageTitle";
import "./fleet.css";

export default function AddChauffeur() {
  usePageTitle("Add chauffeur");
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("Available");
  const [expiry, setExpiry] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = f.get("name").trim();
    if (!name) {
      setError("Enter the chauffeur's name.");
      return;
    }
    if (!expiry) {
      setError("Pick the driving-licence expiry date.");
      return;
    }

    setSaving(true);
    const created = addChauffeur({
      name,
      phone: f.get("phone").trim(),
      email: f.get("email").trim(),
      id_no: f.get("id_no").trim(),
      licence_no: f.get("licence_no").trim(),
      licence_expiry: expiry,
      daily_rate: Number(f.get("daily_rate")) || 0,
      status,
      notes: f.get("notes").trim(),
    });
    setSaving(false);
    toast(`${name} added to your chauffeurs.`);
    navigate(`/dashboard/chauffeurs/${created.id}`);
  }

  return (
    <>
      <header className="head-card">
        <div className="head-left">
          <Link to="/dashboard/chauffeurs" className="back-link" aria-label="Back to chauffeurs">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="head-titles">
            <h1>Add chauffeur</h1>
            <p>Register a driver you rent out with a car.</p>
          </div>
        </div>
      </header>

      <div className="details-grid">
        <form id="add-chauffeur-form" className="panel-card" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="c-name">Full name</label>
              <input id="c-name" name="name" type="text" placeholder="James Mwangi" required />
            </div>
            <div className="field">
              <label htmlFor="c-phone">Phone (M-Pesa)</label>
              <input id="c-phone" name="phone" type="tel" placeholder="0712 345 678" required />
            </div>
            <div className="field">
              <label htmlFor="c-email">Email</label>
              <input id="c-email" name="email" type="email" placeholder="Optional" />
            </div>
            <div className="field">
              <label htmlFor="c-id">National ID</label>
              <input id="c-id" name="id_no" type="text" placeholder="e.g. 28451190" />
            </div>
            <div className="field">
              <label htmlFor="c-licence">Driving licence no.</label>
              <input id="c-licence" name="licence_no" type="text" placeholder="DLB0492187" required />
            </div>
            <div className="field">
              <label htmlFor="c-expiry">Licence expiry</label>
              <DatePicker
                id="c-expiry"
                name="licence_expiry"
                value={expiry}
                onChange={setExpiry}
                minDate={todayISO()}
                placeholder="Pick the expiry date"
              />
            </div>
            <div className="field">
              <label htmlFor="c-rate">Daily rate (KES)</label>
              <input id="c-rate" name="daily_rate" type="number" min="0" step="100" placeholder="2,500" />
            </div>
            <div className="field">
              <label htmlFor="c-status">Status</label>
              <Dropdown id="c-status" name="status" value={status} onChange={setStatus} options={CH_STATUSES} />
            </div>
            <div className="field form-full">
              <label htmlFor="c-notes">Notes</label>
              <textarea id="c-notes" name="notes" rows="3" placeholder="Languages, certifications, anything your team should know" />
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}
        </form>

        <aside className="details-side">
          <section className="panel-card">
            <header className="card-head">
              <h2>Actions</h2>
              <p>Save this chauffeur or discard</p>
            </header>
            <div className="action-stack">
              <button type="submit" form="add-chauffeur-form" className="btn btn-primary" disabled={saving}>
                {saving ? "Adding…" : "Add chauffeur"}
              </button>
              <Link to="/dashboard/chauffeurs" className="btn btn-ghost">Cancel</Link>
            </div>
            <p className="action-hint">
              You can assign a chauffeur to a booking and record trips from their profile.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
