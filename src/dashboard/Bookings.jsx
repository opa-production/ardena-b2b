import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { fetchBookings } from "../lib/api";
import PageSkeleton from "./PageSkeleton";
import { bookingNumbers, latestFirst } from "./bookingsStore";
import BookingsTable from "./BookingsTable";
import BookingsTrend from "./charts/BookingsTrend";
import BookingCalendar from "./BookingCalendar";
import EmptyState, { EMPTY_ICONS } from "./EmptyState";
import { toast } from "./toastStore";
import { seedRecords } from "./recordSeeds";
import "./fleet.css";
import "./bookings.css";
import RefreshButton from "../components/RefreshButton";

const pad = (n) => String(n).padStart(2, "0");
function todayLocalISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// The overview shows the latest few; the rest live on All bookings.
const RECENT_COUNT = 5;

export default function Bookings() {
  const { pathname } = useLocation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Everything, unfiltered: the KPIs, trend and calendar describe the whole
  // book, and the table below only needs the newest few of it.
  const load = useCallback(async () => {
    try {
      const data = await fetchBookings({});
      const rows = data.data || [];
      setBookings(rows);
      // so opening one of these paints instantly — see recordSeeds
      seedRecords("bookings", rows, (b) => b.ref);
    } catch (err) {
      toast(err.message || "Failed to load bookings", "danger");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const bookingNo = useMemo(() => bookingNumbers(bookings), [bookings]);
  const recent = useMemo(() => latestFirst(bookings).slice(0, RECENT_COUNT), [bookings]);

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

  if (loading) return <PageSkeleton path={pathname} />;

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
            message="Reserve a car and it shows up here."
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
          <header className="card-head toolbar-title">
            <h2>Latest bookings</h2>
            <p>
              The newest {Math.min(RECENT_COUNT, bookings.length)} of {bookings.length}
            </p>
          </header>
          <div className="toolbar-actions">
            <RefreshButton onRefresh={load} />
            <Link to="/dashboard/bookings/all" className="btn btn-ghost toolbar-btn">
              All bookings
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        <BookingsTable rows={recent} numberOf={bookingNo} />
      </section>
      </>
      )}
    </>
  );
}
