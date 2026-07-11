import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchBookings } from "../lib/api";
import { fmtRange, rentalDays } from "./bookingsStore";
import BookingsTrend from "./charts/BookingsTrend";
import BookingCalendar from "./BookingCalendar";
import EmptyState, { EMPTY_ICONS } from "./EmptyState";
import { toast } from "./toastStore";
import "./fleet.css";
import "./bookings.css";

const pad = (n) => String(n).padStart(2, "0");
function todayLocalISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const STATUSES = ["All", "Pending", "Confirmed", "Active", "Completed", "Cancelled"];

export const STATUS_CHIP = {
  Pending: "pending",
  Confirmed: "confirmed",
  Active: "active",
  Completed: "completed",
  Cancelled: "cancelled",
};

export const PAY_CHIP = {
  Paid: "active",
  "Prompt sent": "pending",
  Unpaid: "completed",
  Refunded: "cancelled",
  Failed: "cancelled",
};

const fmtAmount = (n) => n.toLocaleString("en-KE");

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");

  const load = useCallback(async () => {
    try {
      const params = {};
      if (status !== "All") params.status = status;
      const data = await fetchBookings(params);
      setBookings(data.data || []);
    } catch (err) {
      toast(err.message || "Failed to load bookings", "danger");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bookings;
    return bookings.filter(
      (b) =>
        b.customer.toLowerCase().includes(q) ||
        b.ref.toLowerCase().includes(q) ||
        b.vehicle.toLowerCase().includes(q) ||
        b.plate.toLowerCase().includes(q)
    );
  }, [bookings, query]);

  const bookingNo = useMemo(() => {
    const m = new Map();
    bookings.forEach((b, i) => m.set(b.ref, i + 1));
    return m;
  }, [bookings]);

  const stats = useMemo(() => {
    const today = todayLocalISO();
    const count = (s) => bookings.filter((b) => b.status === s).length;
    const todayReturns = bookings.filter(
      (b) => b.status === "Active" && b.dropoff === today
    ).length;
    return {
      active: count("Active"),
      confirmed: count("Confirmed"),
      pending: count("Pending"),
      todayReturns,
    };
  }, [bookings]);

  if (loading) {
    return <div className="empty-block fleet-empty"><p>Loading bookings…</p></div>;
  }

  return (
    <>
      <div className="page-actions">
        <Link to="/dashboard/bookings/new" className="btn btn-primary page-action-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New booking
        </Link>
      </div>

      <div className="stat-grid fleet-stats">
        <article className="stat-card">
          <p className="stat-label">Active rentals</p>
          <p className="stat-value">{stats.active}</p>
          <p className="stat-note">vehicles out right now</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Upcoming pickups</p>
          <p className="stat-value">{stats.confirmed}</p>
          <p className="stat-note">confirmed reservations</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Pending review</p>
          <p className="stat-value">{stats.pending}</p>
          <p className="stat-note">awaiting confirmation</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Today's returns</p>
          <p className="stat-value">{stats.todayReturns}</p>
          <p className="stat-note">vehicles due back today</p>
        </article>
      </div>

      {bookings.length === 0 ? (
        <section className="panel-card">
          <EmptyState
            icon={EMPTY_ICONS.bookings}
            title="No bookings yet"
            message="Reserve a car for a customer and it shows up here. New bookings start as pending until you confirm them."
            action={
              <Link to="/dashboard/bookings/new" className="btn btn-primary">
                Create a booking
              </Link>
            }
          />
        </section>
      ) : (
      <>
      <div className="bookings-top">
        <section className="chart-card">
          <header className="card-head">
            <h2>Booking trend</h2>
            <p>New bookings per week, last 8 weeks</p>
          </header>
          <BookingsTrend bookings={bookings} />
        </section>

        <section className="panel-card">
          <header className="card-head">
            <h2>Pickups &amp; returns</h2>
            <p>At a glance, by day</p>
          </header>
          <BookingCalendar bookings={bookings} />
        </section>
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
              aria-label="Search bookings"
            />
          </div>
          <div className="seg" role="group" aria-label="Filter by status">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                className={s === status ? "active" : ""}
                onClick={() => setStatus(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Vehicle</th>
              <th>Dates</th>
              <th className="num rate-col">Amount</th>
              <th>Status</th>
              <th className="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => {
              const days = rentalDays(b.pickup, b.dropoff);
              return (
                <tr key={b.ref}>
                  <td>
                    <div className="row-name">
                      <span className="row-no">{bookingNo.get(b.ref)}</span>
                      <span className="strong">{b.customer}</span>
                    </div>
                  </td>
                  <td>
                    <p className="strong">{b.vehicle}</p>
                    <p className="cell-sub">{b.plate}</p>
                  </td>
                  <td>
                    <p>{fmtRange(b.pickup, b.dropoff)}</p>
                    <p className="cell-sub">
                      {days} day{days > 1 ? "s" : ""}
                    </p>
                  </td>
                  <td className="num rate-col">{fmtAmount(days * b.rate)}</td>
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
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="empty-block fleet-empty">
            <p>No bookings match your search.</p>
          </div>
        )}
      </section>
      </>
      )}
    </>
  );
}
