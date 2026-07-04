import { useMemo, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import {
  subscribe,
  getBookings,
  setPayment,
  fmtRange,
  rentalDays,
} from "./bookingsStore";
import { PAY_CHIP } from "./Bookings";
import { fmtAmount, receiptFor } from "./Payments";
import "./fleet.css";
import "./bookings.css";
import "./payments.css";

const FILTERS = ["All", "Paid", "Prompt sent", "Unpaid", "Refunded"];

export default function PaymentsList() {
  const bookings = useSyncExternalStore(subscribe, getBookings);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bookings.filter((b) => {
      if (filter !== "All" && b.payment !== filter) return false;
      if (!q) return true;
      return (
        b.customer.toLowerCase().includes(q) ||
        b.ref.toLowerCase().includes(q) ||
        b.vehicle.toLowerCase().includes(q) ||
        b.plate.toLowerCase().includes(q)
      );
    });
  }, [bookings, query, filter]);

  return (
    <>
      <Link className="back-link" to="/dashboard/payments">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M11 18l-6-6 6-6" />
        </svg>
        Payments
      </Link>

      <div className="page-head">
        <h1>All payments</h1>
        <p>Every transaction across your bookings.</p>
      </div>

      <section className="panel-card">
        <div className="fleet-toolbar">
          <div className="search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              type="search"
              placeholder="Search customer, ref, vehicle or plate"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search payments"
            />
          </div>
          <div className="seg" role="group" aria-label="Filter by payment status">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                className={f === filter ? "active" : ""}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Vehicle</th>
              <th>Booking dates</th>
              <th className="num">Amount</th>
              <th>Receipt</th>
              <th>Status</th>
              <th className="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => {
              const amount = rentalDays(b.pickup, b.dropoff) * b.rate;
              const canPrompt =
                b.payment !== "Paid" &&
                b.payment !== "Refunded" &&
                b.status !== "Cancelled" &&
                b.status !== "Completed";
              return (
                <tr key={b.ref}>
                  <td>
                    <p className="strong">{b.customer}</p>
                    <p className="cell-sub">{b.ref}</p>
                  </td>
                  <td>
                    <p>{b.vehicle}</p>
                    <p className="cell-sub">{b.plate}</p>
                  </td>
                  <td>{fmtRange(b.pickup, b.dropoff)}</td>
                  <td className="num">{fmtAmount(amount)}</td>
                  <td>
                    {b.payment === "Paid" || b.payment === "Refunded"
                      ? receiptFor(b.ref)
                      : "—"}
                  </td>
                  <td>
                    <span className={`chip ${PAY_CHIP[b.payment]}`}>{b.payment}</span>
                  </td>
                  <td className="actions-cell">
                    {canPrompt && (
                      <button
                        type="button"
                        className="icon-btn prompt-green"
                        onClick={() => setPayment(b.ref, "Prompt sent")}
                      >
                        {b.payment === "Prompt sent" ? "Resend prompt" : "Send prompt"}
                      </button>
                    )}
                    <Link
                      className="icon-btn"
                      to={`/dashboard/bookings/${encodeURIComponent(b.ref)}`}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="empty-block fleet-empty">
            <p>No payments match your search.</p>
          </div>
        )}
      </section>
    </>
  );
}
