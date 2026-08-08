import { useMemo, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { subscribe, getVehicles, removeVehicle, isFleetLoaded } from "./fleetStore";
import { toast } from "./toastStore";
import EmptyState, { EMPTY_ICONS } from "./EmptyState";
import "./fleet.css";

const STATUSES = ["All", "Available", "On booking", "In maintenance"];

const CHIP_CLASS = {
  Available: "available",
  "On booking": "booked",
  "In maintenance": "maintenance",
};

const fmtRate = (r) => r.toLocaleString("en-KE");

export default function Fleet() {
  const vehicles = useSyncExternalStore(subscribe, getVehicles);
  const loaded = useSyncExternalStore(subscribe, isFleetLoaded);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [confirming, setConfirming] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vehicles.filter((v) => {
      if (status !== "All" && v.status !== status) return false;
      if (!q) return true;
      return (
        v.name.toLowerCase().includes(q) ||
        v.plate.toLowerCase().includes(q) ||
        v.cat.toLowerCase().includes(q)
      );
    });
  }, [vehicles, query, status]);

  const counts = useMemo(() => {
    const c = { Available: 0, "On booking": 0, "In maintenance": 0 };
    vehicles.forEach((v) => c[v.status]++);
    return c;
  }, [vehicles]);

  // stable display number per vehicle (1, 2, 3…) by list order
  const vehicleNo = useMemo(() => {
    const m = new Map();
    vehicles.forEach((v, i) => m.set(v.plate, i + 1));
    return m;
  }, [vehicles]);

  return (
    <>
      <div className="stat-grid fleet-stats">
        <article className="stat-card">
          <p className="stat-label">Total fleet</p>
          <p className="stat-value">{vehicles.length}</p>
          <p className="stat-note">vehicles registered</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Available</p>
          <p className="stat-value">{counts.Available}</p>
          <p className="stat-note">ready to book</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">On booking</p>
          <p className="stat-value">{counts["On booking"]}</p>
          <p className="stat-note">out with customers</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">In maintenance</p>
          <p className="stat-value">{counts["In maintenance"]}</p>
          <p className="stat-note">temporarily off fleet</p>
        </article>
      </div>

      {!loaded && vehicles.length === 0 ? (
        <section className="panel-card">
          <div className="empty-block fleet-empty">
            <p>Loading your fleet…</p>
          </div>
        </section>
      ) : vehicles.length === 0 ? (
        <section className="panel-card">
          <EmptyState
            icon={EMPTY_ICONS.fleet}
            title="No vehicles yet"
            message="Add your first vehicle to start taking bookings. It's bookable the moment you save it."
            action={
              <Link to="/dashboard/fleet/new" className="btn btn-primary">
                Add your first vehicle
              </Link>
            }
          />
        </section>
      ) : (
      <section className="panel-card">
        <div className="fleet-toolbar">
          <div className="search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              type="search"
              placeholder="Search vehicle or plate"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search fleet"
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
          {vehicles.length >= 100 ? (
            <Link to="/dashboard/support" className="btn toolbar-btn" style={{ background: "var(--warning-bg,#fef3c7)", color: "#92400e", border: "1px solid #fcd34d" }}>
              Fleet at capacity — contact sales
            </Link>
          ) : (
            <Link to="/dashboard/fleet/new" className="btn btn-primary toolbar-btn">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add vehicle
            </Link>
          )}
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Plate</th>
              <th className="num rate-col">Day rate</th>
              <th>Status</th>
              <th className="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => {
              return (
                <tr key={v.plate}>
                  <td>
                    <div className="row-name">
                      <span className="row-no">{vehicleNo.get(v.plate)}</span>
                      <span className="strong">{v.name}</span>
                    </div>
                  </td>
                  <td>{v.plate}</td>
                  <td className="num rate-col">{fmtRate(v.rate)}</td>
                  <td>
                    <span className={`chip ${CHIP_CLASS[v.status]}`}>{v.status}</span>
                  </td>
                  <td className="actions-cell">
                    {confirming === v.plate ? (
                      <span className="confirm-inline">
                        Delete?
                        <button
                          type="button"
                          className="icon-btn danger"
                          onClick={async () => {
                            setConfirming(null);
                            try {
                              await removeVehicle(v.plate);
                              toast(`${v.name} (${v.plate}) removed from the fleet.`, "danger");
                            } catch (err) {
                              toast(err.message, "danger");
                            }
                          }}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => setConfirming(null)}
                        >
                          No
                        </button>
                      </span>
                    ) : (
                      <>
                        <Link
                          className="icon-btn"
                          to={`/dashboard/fleet/${encodeURIComponent(v.plate)}`}
                        >
                          View
                        </Link>
                        <Link
                          className="icon-btn"
                          to={`/dashboard/fleet/${encodeURIComponent(v.plate)}/marketplace`}
                          title="Manage marketplace listing"
                        >
                          Marketplace
                        </Link>
                        <button
                          type="button"
                          className="icon-btn danger"
                          aria-label={`Delete ${v.name}`}
                          onClick={() => setConfirming(v.plate)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                          </svg>
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="empty-block fleet-empty">
            <p>No vehicles match your search.</p>
          </div>
        )}
      </section>
      )}
    </>
  );
}
