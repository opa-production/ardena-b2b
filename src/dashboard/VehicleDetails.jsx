import { useState, useSyncExternalStore } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  subscribe,
  getVehicles,
  getVehicle,
  removeVehicle,
  expiringSoon,
} from "./fleetStore";
import { getBookings } from "./bookingsStore";
import { downloadVehicleStatement } from "./pdf";
import "./fleet.css";

const MONTHS = [
  { label: "July 2026", prefix: "2026-07" },
  { label: "June 2026", prefix: "2026-06" },
  { label: "May 2026", prefix: "2026-05" },
];

const CHIP_CLASS = {
  Available: "available",
  "On booking": "booked",
  "In maintenance": "maintenance",
};

const UPCOMING = [
  { customer: "Wanjiku Kamau", dates: "Jul 2 – Jul 6", amount: "48,000" },
  { customer: "James Otieno", dates: "Jul 12 – Jul 15", amount: "36,000" },
];

export default function VehicleDetails() {
  useSyncExternalStore(subscribe, getVehicles); // re-render on store changes
  const { plate } = useParams();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [month, setMonth] = useState(MONTHS[1].prefix); // June has the history

  const v = getVehicle(decodeURIComponent(plate));

  if (!v) {
    return (
      <>
        <Link to="/dashboard/fleet" className="back-link" aria-label="Back to fleet">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="empty-block fleet-empty">
          <p>This vehicle is no longer in your fleet.</p>
        </div>
      </>
    );
  }

  const insSoon = expiringSoon(v.ins);
  const inspSoon = expiringSoon(v.inspection);

  return (
    <>
      <header className="head-card">
        <div className="head-left">
          <Link to="/dashboard/fleet" className="back-link" aria-label="Back to fleet">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="head-titles">
            <h1>{v.name}</h1>
            <p>
              {v.plate} · {v.cat} ·{" "}
              <span className={`chip ${CHIP_CLASS[v.status]}`}>{v.status}</span>
            </p>
          </div>
        </div>
        <div className="details-actions">
          <button type="button" className="btn btn-ghost" disabled title="Editing is coming soon">
            Edit
          </button>
          {confirming ? (
            <span className="confirm-inline">
              Delete this vehicle?
              <button
                type="button"
                className="icon-btn danger"
                onClick={() => {
                  removeVehicle(v.plate);
                  navigate("/dashboard/fleet");
                }}
              >
                Yes
              </button>
              <button type="button" className="icon-btn" onClick={() => setConfirming(false)}>
                No
              </button>
            </span>
          ) : (
            <button type="button" className="btn btn-ghost danger-btn" onClick={() => setConfirming(true)}>
              Delete
            </button>
          )}
        </div>
      </header>

      <div className="details-grid">
        <section className="panel-card">
          <header className="card-head">
            <h2>Vehicle information</h2>
            <p>Registry record</p>
          </header>
          <dl className="spec-grid">
            <div className="spec">
              <dt>Number plate</dt>
              <dd>{v.plate}</dd>
            </div>
            <div className="spec">
              <dt>Category</dt>
              <dd>{v.cat}</dd>
            </div>
            <div className="spec">
              <dt>Day rate</dt>
              <dd>KES {v.rate.toLocaleString("en-KE")}</dd>
            </div>
            <div className="spec">
              <dt>Added to fleet</dt>
              <dd>{v.added || "—"}</dd>
            </div>
            <div className="spec">
              <dt>Insurance expiry</dt>
              <dd>
                {v.ins || "—"}
                {insSoon !== null && <span className="ins-soon"> · in {insSoon} days</span>}
              </dd>
            </div>
            <div className="spec">
              <dt>Inspection due</dt>
              <dd>
                {v.inspection || "—"}
                {inspSoon !== null && <span className="ins-soon"> · in {inspSoon} days</span>}
              </dd>
            </div>
            {v.notes && (
              <div className="spec spec-full">
                <dt>Notes</dt>
                <dd>{v.notes}</dd>
              </div>
            )}
          </dl>
        </section>

        <div className="details-side">
          <section className="panel-card">
            <header className="card-head">
              <h2>Utilisation</h2>
              <p>Share of days booked, last 90 days</p>
            </header>
            <p className="util-hero">{v.util}%</p>
            <span className="util-bar util-bar-lg">
              <i style={{ width: `${v.util}%` }} />
            </span>
          </section>

          <section className="panel-card">
            <header className="card-head">
              <h2>Upcoming bookings</h2>
              <p>Next reservations for this vehicle</p>
            </header>
            {v.status === "On booking" ? (
              <ul className="mini-list">
                {UPCOMING.map((b) => (
                  <li key={b.dates}>
                    <div>
                      <p className="attention-title">{b.customer}</p>
                      <p className="attention-meta">{b.dates}</p>
                    </div>
                    <span className="mini-amount">KES {b.amount}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mini-empty">No upcoming bookings.</p>
            )}
          </section>

          <section className="panel-card">
            <header className="card-head">
              <h2>Statements</h2>
              <p>Monthly earnings for this vehicle, as PDF</p>
            </header>
            <div className="field">
              <label htmlFor="stmt-month">Period</label>
              <select
                id="stmt-month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              >
                {MONTHS.map((m) => (
                  <option key={m.prefix} value={m.prefix}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn btn-ghost pay-btn stmt-btn"
              onClick={() =>
                downloadVehicleStatement(
                  v,
                  getBookings(),
                  MONTHS.find((m) => m.prefix === month).label,
                  month
                )
              }
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v12m0 0l-4-4m4 4l4-4" />
                <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
              </svg>
              Download statement
            </button>
            <p className="side-hint">
              Bookings, days rented, utilisation and gross earnings for the
              period. Share it with the vehicle's owner.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
