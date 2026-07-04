import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fmtDate } from "./bookingsStore";
import { SESSIONS, STATUS_CHIP } from "./verificationsStore";
import { StepMark } from "./Verification";
import "./fleet.css";
import "./bookings.css";
import "./verification.css";

const FILTERS = ["All", "Verified", "Failed", "In progress", "Abandoned"];

export default function VerificationsList() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SESSIONS.filter((s) => {
      if (filter !== "All" && s.status !== filter) return false;
      if (!q) return true;
      return (
        s.customer.toLowerCase().includes(q) ||
        s.phone.replace(/\s/g, "").includes(q.replace(/\s/g, "")) ||
        (s.ref && s.ref.toLowerCase().includes(q)) ||
        s.id.toLowerCase().includes(q)
      );
    });
  }, [query, filter]);

  return (
    <>
      <Link className="back-link" to="/dashboard/verification" aria-label="Back to verification">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </Link>

      <section className="panel-card">
        <div className="fleet-toolbar">
          <div className="search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              type="search"
              placeholder="Search customer, phone, booking or session"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search verifications"
            />
          </div>
          <div className="seg" role="group" aria-label="Filter by outcome">
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
              <th>Session</th>
              <th>ID</th>
              <th>Selfie</th>
              <th>Licence</th>
              <th>Status</th>
              <th>Notes</th>
              <th>Started</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <td>
                  <p className="strong">{s.customer}</p>
                  <p className="cell-sub">{s.phone}</p>
                </td>
                <td>
                  <p>{s.id}</p>
                  <p className="cell-sub">
                    {s.ref ? (
                      <Link className="spec-link" to={`/dashboard/bookings/${encodeURIComponent(s.ref)}`}>
                        {s.ref}
                      </Link>
                    ) : (
                      "Walk-in"
                    )}
                  </p>
                </td>
                {["id", "selfie", "licence"].map((step) => (
                  <td key={step}>
                    <StepMark value={s.steps[step]} />
                  </td>
                ))}
                <td>
                  <span className={`chip ${STATUS_CHIP[s.status]}`}>{s.status}</span>
                </td>
                <td className="session-note">{s.reason || "—"}</td>
                <td>{fmtDate(s.date)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="empty-block fleet-empty">
            <p>No verification sessions match your search.</p>
          </div>
        )}
      </section>
    </>
  );
}
