import { useSyncExternalStore } from "react";
import { Link, useParams } from "react-router-dom";
import { subscribe, getClients, getClient } from "./clientsStore";
import {
  subscribe as subscribeBookings,
  getBookings,
  fmtDate,
  fmtRange,
  rentalDays,
} from "./bookingsStore";
import { STATUS_CHIP } from "./Bookings";
import { VERIF_CHIP } from "./Clients";
import "./fleet.css";
import "./bookings.css";

const fmtAmount = (n) => n.toLocaleString("en-KE");

export default function ClientDetails() {
  useSyncExternalStore(subscribe, getClients); // re-render on store changes
  const bookings = useSyncExternalStore(subscribeBookings, getBookings);
  const { id } = useParams();

  const c = getClient(decodeURIComponent(id));

  if (!c) {
    return (
      <>
        <Link to="/dashboard/clients" className="back-link" aria-label="Back to clients">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="empty-block fleet-empty">
          <p>This client doesn't exist.</p>
        </div>
      </>
    );
  }

  const history = bookings.filter((b) => b.customer === c.name);
  const spend = history
    .filter((b) => b.status !== "Cancelled")
    .reduce((sum, b) => sum + rentalDays(b.pickup, b.dropoff) * b.rate, 0);

  return (
    <>
      <header className="head-card">
        <div className="head-left">
          <Link to="/dashboard/clients" className="back-link" aria-label="Back to clients">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="head-titles">
            <h1>{c.name}</h1>
            <p>
              {c.id} · {c.phone} ·{" "}
              <span className={`chip ${VERIF_CHIP[c.verification]}`}>{c.verification}</span>
            </p>
          </div>
        </div>
        <Link to="/dashboard/bookings/new" className="btn btn-primary">
          New booking
        </Link>
      </header>

      <div className="details-grid">
        <section className="panel-card">
          <header className="card-head">
            <h2>Client information</h2>
            <p>Customer record</p>
          </header>
          <dl className="spec-grid">
            <div className="spec">
              <dt>Phone (M-Pesa)</dt>
              <dd>{c.phone}</dd>
            </div>
            <div className="spec">
              <dt>Email</dt>
              <dd>{c.email}</dd>
            </div>
            <div className="spec">
              <dt>ID document</dt>
              <dd>{c.idType}</dd>
            </div>
            <div className="spec">
              <dt>Client since</dt>
              <dd>{fmtDate(c.joined)}</dd>
            </div>
            {c.notes && (
              <div className="spec spec-full">
                <dt>Notes</dt>
                <dd>{c.notes}</dd>
              </div>
            )}
          </dl>
        </section>

        <div className="details-side">
          <section className="panel-card">
            <header className="card-head">
              <h2>Lifetime value</h2>
              <p>Across {history.length} booking{history.length === 1 ? "" : "s"}</p>
            </header>
            <p className="util-hero">KES {fmtAmount(spend)}</p>
          </section>

          <section className="panel-card">
            <header className="card-head">
              <h2>Identity verification</h2>
              <p>Checked via Dojah</p>
            </header>
            <div className="pay-row">
              <span>Status</span>
              <span className={`chip ${VERIF_CHIP[c.verification]}`}>{c.verification}</span>
            </div>
            <p className="side-hint">
              {c.verification === "Verified"
                ? "ID and driver's licence matched. Safe to hand over keys."
                : c.verification === "Failed"
                  ? "Last check failed, ask the customer to resubmit their documents."
                  : "The customer hasn't completed the ID check yet."}
            </p>
          </section>
        </div>
      </div>

      <section className="panel-card history-card">
        <header className="card-head">
          <h2>Booking history</h2>
          <p>Every reservation under this client</p>
        </header>
        {history.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Ref</th>
                <th>Vehicle</th>
                <th>Dates</th>
                <th className="num">Amount</th>
                <th>Status</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {history.map((b) => (
                <tr key={b.ref}>
                  <td className="strong">{b.ref}</td>
                  <td>
                    <p className="strong">{b.vehicle}</p>
                    <p className="cell-sub">{b.plate}</p>
                  </td>
                  <td>{fmtRange(b.pickup, b.dropoff)}</td>
                  <td className="num">{fmtAmount(rentalDays(b.pickup, b.dropoff) * b.rate)}</td>
                  <td>
                    <span className={`chip ${STATUS_CHIP[b.status]}`}>{b.status}</span>
                  </td>
                  <td className="actions-cell">
                    <Link
                      className="icon-btn"
                      to={`/dashboard/bookings/${encodeURIComponent(b.ref)}`}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mini-empty">No bookings yet, create their first one.</p>
        )}
      </section>
    </>
  );
}
