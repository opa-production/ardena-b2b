import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fmtDate } from "./bookingsStore";
import { LOOKUPS, STATUS_CHIP, maskNumber } from "./verificationsStore";
import "./fleet.css";
import "./bookings.css";
import "./verification.css";

const FILTERS = ["All", "Verified", "Not found", "Mismatch"];

export default function VerificationsList() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return LOOKUPS.filter((c) => {
      if (filter !== "All" && c.status !== filter) return false;
      if (!q) return true;
      return (
        c.customer.toLowerCase().includes(q) ||
        c.idNumber.toLowerCase().includes(q) ||
        (c.ref && c.ref.toLowerCase().includes(q)) ||
        c.id.toLowerCase().includes(q)
      );
    });
  }, [query, filter]);

  return (
    <>
      <header className="head-card">
        <div className="head-left">
          <Link className="back-link" to="/dashboard/verification" aria-label="Back to verification">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="head-titles">
            <h1>All checks</h1>
            <p>Every renter you've looked up.</p>
          </div>
        </div>
      </header>

      <section className="panel-card">
        <div className="fleet-toolbar">
          <div className="search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              type="search"
              placeholder="Search renter, number or booking"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search checks"
            />
          </div>
          <div className="seg" role="group" aria-label="Filter by result">
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
              <th>Renter</th>
              <th>Check</th>
              <th>Type</th>
              <th>Number</th>
              <th>Result</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td>
                  <p className="strong">{c.customer}</p>
                  <p className="cell-sub">
                    {c.ref ? (
                      <Link className="spec-link" to={`/dashboard/bookings/${encodeURIComponent(c.ref)}`}>
                        {c.ref}
                      </Link>
                    ) : (
                      "Walk-in"
                    )}
                  </p>
                </td>
                <td>{c.id}</td>
                <td>{c.idType}</td>
                <td className="mono">{maskNumber(c.idNumber)}</td>
                <td>
                  <span className={`chip ${STATUS_CHIP[c.status]}`}>{c.status}</span>
                </td>
                <td>{fmtDate(c.date)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="empty-block fleet-empty">
            <p>No checks match your search.</p>
          </div>
        )}
      </section>
    </>
  );
}
