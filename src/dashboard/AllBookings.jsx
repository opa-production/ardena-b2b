import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { fetchBookings } from "../lib/api";
import PageSkeleton from "./PageSkeleton";
import EmptyState from "./EmptyState";
import BookingsTable from "./BookingsTable";
import { bookingNumbers, latestFirst } from "./bookingsStore";
import { toast } from "./toastStore";
import { seedRecords } from "./recordSeeds";
import usePageTitle from "../hooks/usePageTitle";
import RefreshButton from "../components/RefreshButton";
import FilterDropdown from "../components/FilterDropdown";
import "./fleet.css";
import "./bookings.css";

const STATUSES = [
  { value: "All", label: "All statuses" },
  "Pending",
  "Confirmed",
  "Active",
  "Completed",
  "Cancelled",
];

const SOURCES = [
  { value: "all", label: "Everywhere" },
  { value: "dashboard", label: "Dashboard" },
  { value: "marketplace", label: "Ardena app" },
];

/* Every booking, newest first, with search and filters. The Bookings overview
   shows only the latest few and links here for the rest. Filtering is local:
   the whole list is already loaded, so switching a filter is instant rather
   than a round trip per click. */
export default function AllBookings() {
  usePageTitle("All bookings");
  const { pathname } = useLocation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [source, setSource] = useState("all");

  const load = useCallback(async () => {
    try {
      const data = await fetchBookings({});
      const rows = data.data || [];
      setBookings(rows);
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

  const numberOf = useMemo(() => bookingNumbers(bookings), [bookings]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return latestFirst(bookings).filter(
      (b) =>
        (status === "All" || b.status === status) &&
        (source === "all" || (b.source || "dashboard") === source) &&
        (!q ||
          b.customer.toLowerCase().includes(q) ||
          b.ref.toLowerCase().includes(q) ||
          b.vehicle.toLowerCase().includes(q) ||
          b.plate.toLowerCase().includes(q))
    );
  }, [bookings, query, status, source]);

  if (loading) return <PageSkeleton path={pathname} />;

  return (
    <>
      <Link to="/dashboard/bookings" className="page-back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Bookings
      </Link>

      <h1 className="sr-only">All bookings</h1>

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
          <div className="toolbar-actions">
            <FilterDropdown id="bk-status" label="Status" value={status} onChange={setStatus} options={STATUSES} />
            <FilterDropdown id="bk-source" label="Booked via" value={source} onChange={setSource} options={SOURCES} />
            <RefreshButton onRefresh={load} />
          </div>
        </div>

        {bookings.length === 0 ? (
          <EmptyState minimal title="No bookings yet" />
        ) : (
          <>
            <p className="list-count">
              {rows.length} of {bookings.length} booking{bookings.length === 1 ? "" : "s"}
            </p>
            <BookingsTable rows={rows} numberOf={numberOf} />
            {rows.length === 0 && (
              <div className="empty-block fleet-empty">
                <p>No bookings match these filters.</p>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
