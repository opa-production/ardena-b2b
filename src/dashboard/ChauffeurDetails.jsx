import { useState, useSyncExternalStore } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  subscribe,
  getChauffeur,
  updateChauffeur,
  removeChauffeur,
  CH_STATUSES,
  CH_CHIP,
  fmtDay,
  licenceState,
} from "./chauffeursStore";
import ConfirmDialog from "../components/ConfirmDialog";
import { toast } from "./toastStore";
import usePageTitle from "../hooks/usePageTitle";
import "./fleet.css";
import "./bookings.css";
import "./chauffeurs.css";

const fmtAmount = (n) => Number(n || 0).toLocaleString("en-KE");

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0].toUpperCase()).join("");
}

export default function ChauffeurDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const c = useSyncExternalStore(subscribe, () => getChauffeur(id));

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [confirmDel, setConfirmDel] = useState(false);

  usePageTitle(c ? c.name : "Chauffeur");

  const back = (
    <Link to="/dashboard/chauffeurs" className="back-link" aria-label="Back to chauffeurs">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
    </Link>
  );

  if (!c) {
    return (
      <>
        {back}
        <div className="empty-block fleet-empty"><p>This chauffeur doesn't exist.</p></div>
      </>
    );
  }

  const lic = licenceState(c.licence_expiry);
  const history = c.history || [];

  function setStatus(s) {
    updateChauffeur(c.id, { status: s });
  }

  function endAssignment() {
    updateChauffeur(c.id, { assignment: null, status: "Available" });
    toast("Assignment ended, chauffeur set to available.");
  }

  function openEdit() {
    setForm({
      phone: c.phone || "",
      email: c.email || "",
      id_no: c.id_no || "",
      licence_no: c.licence_no || "",
      licence_expiry: c.licence_expiry || "",
      daily_rate: c.daily_rate || 0,
      notes: c.notes || "",
    });
    setEditing(true);
  }

  function saveEdit(e) {
    e.preventDefault();
    updateChauffeur(c.id, {
      ...form,
      daily_rate: Number(form.daily_rate) || 0,
    });
    setEditing(false);
    toast("Chauffeur details updated.");
  }

  function del() {
    setConfirmDel(false);
    removeChauffeur(c.id);
    toast(`${c.name} removed from your drivers.`);
    navigate("/dashboard/chauffeurs");
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <header className="head-card">
        <div className="head-left">
          {back}
          <span className="chauffeur-avatar lg">{initials(c.name)}</span>
          <div className="head-titles">
            <h1>{c.name}</h1>
            <p>
              {c.id} · {c.phone} ·{" "}
              <span className={`chip ${CH_CHIP[c.status]}`}>{c.status}</span>
            </p>
          </div>
        </div>
        <div className="details-actions">
          <button type="button" className="btn btn-ghost" onClick={openEdit}>Edit</button>
          <button type="button" className="btn btn-ghost danger-btn" onClick={() => setConfirmDel(true)}>Remove</button>
        </div>
      </header>

      <div className="details-grid">
        <div className="settings-main">
          <section className="panel-card">
            <header className="card-head">
              <h2>Chauffeur information</h2>
              <p>Driver record &amp; compliance</p>
            </header>
            <dl className="spec-grid">
              <div className="spec">
                <dt>Phone (M-Pesa)</dt>
                <dd>{c.phone || "—"}</dd>
              </div>
              <div className="spec">
                <dt>Email</dt>
                <dd>{c.email || "—"}</dd>
              </div>
              <div className="spec">
                <dt>National ID</dt>
                <dd className="mono">{c.id_no || "—"}</dd>
              </div>
              <div className="spec">
                <dt>Driving licence</dt>
                <dd className="mono">{c.licence_no || "—"}</dd>
              </div>
              <div className="spec">
                <dt>Licence expiry</dt>
                <dd>
                  {fmtDay(c.licence_expiry)}
                  {lic && <span className={`chip ${lic.tone === "danger" ? "cancelled" : "pending"} lic-chip`}>{lic.label}</span>}
                </dd>
              </div>
              <div className="spec">
                <dt>Daily rate</dt>
                <dd>KES {fmtAmount(c.daily_rate)}</dd>
              </div>
              <div className="spec">
                <dt>On roster since</dt>
                <dd>{fmtDay(c.joined)}</dd>
              </div>
              {c.notes && (
                <div className="spec spec-full">
                  <dt>Notes</dt>
                  <dd>{c.notes}</dd>
                </div>
              )}
            </dl>
          </section>

          <section className="panel-card history-card">
            <header className="card-head">
              <h2>Trip history</h2>
              <p>Every assignment this chauffeur has driven</p>
            </header>
            {history.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Vehicle</th>
                    <th>Route</th>
                    <th className="num">Amount</th>
                    <th>Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((t) => (
                    <tr key={t.id}>
                      <td>{fmtDay(t.date)}</td>
                      <td className="strong">{t.customer}</td>
                      <td>{t.vehicle}</td>
                      <td>{t.route}</td>
                      <td className="num">{fmtAmount(t.amount)}</td>
                      <td>
                        <span className="rating">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                            <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.7 5.9 20.4l1.4-6.8L2.2 9l6.9-.7L12 2z" />
                          </svg>
                          {t.rating}.0
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="mini-empty">No trips recorded yet.</p>
            )}
          </section>
        </div>

        <div className="details-side">
          <section className="panel-card">
            <header className="card-head">
              <h2>Duty status</h2>
              <p>Set availability</p>
            </header>
            <div className="duty-seg">
              {CH_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={"duty-btn" + (c.status === s ? " active" : "")}
                  onClick={() => setStatus(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </section>

          <section className="panel-card">
            <header className="card-head">
              <h2>Current assignment</h2>
              <p>Where this driver is now</p>
            </header>
            {c.assignment ? (
              <>
                <div className="pay-row">
                  <span>Booking</span>
                  <Link className="spec-link" to={`/dashboard/bookings/${encodeURIComponent(c.assignment.booking_ref)}`}>
                    {c.assignment.booking_ref}
                  </Link>
                </div>
                <div className="pay-row">
                  <span>Customer</span>
                  <span className="mini-amount">{c.assignment.customer}</span>
                </div>
                <div className="pay-row">
                  <span>Vehicle</span>
                  <span className="mini-amount">{c.assignment.vehicle} · {c.assignment.plate}</span>
                </div>
                <div className="pay-row">
                  <span>Dates</span>
                  <span className="mini-amount">{fmtDay(c.assignment.from)} → {fmtDay(c.assignment.to)}</span>
                </div>
                <button type="button" className="btn btn-ghost danger-btn end-assign" onClick={endAssignment}>
                  End assignment
                </button>
              </>
            ) : (
              <p className="side-hint" style={{ marginTop: 0 }}>
                Not on a trip. Set the chauffeur to <strong>On trip</strong> when you assign them to a booking.
              </p>
            )}
          </section>

          <section className="panel-card">
            <header className="card-head">
              <h2>Performance</h2>
              <p>Lifetime</p>
            </header>
            <div className="pay-row">
              <span>Rating</span>
              <span className="rating">
                {c.rating ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                      <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.7 5.9 20.4l1.4-6.8L2.2 9l6.9-.7L12 2z" />
                    </svg>
                    {c.rating.toFixed(1)}
                  </>
                ) : "No ratings"}
              </span>
            </div>
            <div className="pay-row">
              <span>Trips completed</span>
              <span className="mini-amount">{c.trips}</span>
            </div>
            <div className="pay-row">
              <span>Daily rate</span>
              <span className="mini-amount">KES {fmtAmount(c.daily_rate)}</span>
            </div>
          </section>
        </div>
      </div>

      {editing && form && (
        <div className="modal-overlay" onClick={() => setEditing(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head">
              <h3>Edit {c.name}</h3>
              <button type="button" className="icon-btn" onClick={() => setEditing(false)}>✕</button>
            </header>
            <form onSubmit={saveEdit} className="modal-body">
              <label className="field-label">
                Phone
                <input type="tel" className="field-input" value={form.phone} onChange={set("phone")} />
              </label>
              <label className="field-label">
                Email
                <input type="email" className="field-input" value={form.email} onChange={set("email")} placeholder="Optional" />
              </label>
              <label className="field-label">
                National ID
                <input type="text" className="field-input" value={form.id_no} onChange={set("id_no")} />
              </label>
              <label className="field-label">
                Driving licence no.
                <input type="text" className="field-input" value={form.licence_no} onChange={set("licence_no")} />
              </label>
              <label className="field-label">
                Licence expiry
                <input type="date" className="field-input" value={form.licence_expiry} onChange={set("licence_expiry")} />
              </label>
              <label className="field-label">
                Daily rate (KES)
                <input type="number" min="0" step="100" className="field-input" value={form.daily_rate} onChange={set("daily_rate")} />
              </label>
              <label className="field-label">
                Notes
                <textarea rows="2" className="field-input" value={form.notes} onChange={set("notes")} />
              </label>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDel}
        title="Remove chauffeur?"
        message={`${c.name} will be removed from your roster. Their trip history is discarded.`}
        confirmLabel="Remove"
        onConfirm={del}
        onCancel={() => setConfirmDel(false)}
      />
    </>
  );
}
