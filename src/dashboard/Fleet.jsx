import { useMemo, useState } from "react";
import "./fleet.css";

const VEHICLES = [
  { name: "Toyota Prado", plate: "KDL 482A", cat: "SUV", rate: 12000, util: 82, ins: "12 Jul 2026", insSoon: 9, status: "On booking" },
  { name: "Mazda CX-5", plate: "KDQ 118F", cat: "SUV", rate: 9500, util: 74, ins: "3 Nov 2026", status: "On booking" },
  { name: "Subaru Forester", plate: "KDN 226E", cat: "SUV", rate: 9000, util: 68, ins: "18 Sep 2026", status: "Available" },
  { name: "Toyota Axio", plate: "KDJ 903C", cat: "Saloon", rate: 4500, util: 71, ins: "2 Oct 2026", status: "On booking" },
  { name: "Toyota Premio", plate: "KCY 651H", cat: "Saloon", rate: 5000, util: 63, ins: "22 Aug 2026", status: "Available" },
  { name: "Honda Fit", plate: "KDG 337J", cat: "Hatchback", rate: 3500, util: 58, ins: "9 Dec 2026", status: "Available" },
  { name: "Mazda Demio", plate: "KCT 904K", cat: "Hatchback", rate: 3200, util: 49, ins: "15 Jan 2027", status: "Available" },
  { name: "Nissan NV350", plate: "KCZ 771B", cat: "Van", rate: 7500, util: 66, ins: "17 Jul 2026", insSoon: 14, status: "On booking" },
  { name: "Toyota HiAce", plate: "KDB 129D", cat: "Van", rate: 8000, util: 61, ins: "30 Sep 2026", status: "Available" },
  { name: "Toyota Hilux", plate: "KDA 554D", cat: "Pickup", rate: 8500, util: 57, ins: "8 Aug 2026", status: "In maintenance" },
  { name: "Isuzu D-Max", plate: "KCX 449G", cat: "Pickup", rate: 8000, util: 52, ins: "25 Oct 2026", status: "Available" },
  { name: "Land Rover Defender", plate: "KDM 001Z", cat: "SUV", rate: 18000, util: 44, ins: "29 Jul 2026", insSoon: 26, status: "In maintenance" },
];

const STATUSES = ["All", "Available", "On booking", "In maintenance"];

const CHIP_CLASS = {
  Available: "available",
  "On booking": "booked",
  "In maintenance": "maintenance",
};

const fmtRate = (r) => r.toLocaleString("en-KE");

export default function Fleet() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return VEHICLES.filter((v) => {
      if (status !== "All" && v.status !== status) return false;
      if (!q) return true;
      return (
        v.name.toLowerCase().includes(q) ||
        v.plate.toLowerCase().includes(q) ||
        v.cat.toLowerCase().includes(q)
      );
    });
  }, [query, status]);

  const counts = useMemo(() => {
    const c = { Available: 0, "On booking": 0, "In maintenance": 0 };
    VEHICLES.forEach((v) => c[v.status]++);
    return c;
  }, []);

  return (
    <>
      <div className="page-head-row">
        <div className="page-head">
          <h1>Fleet</h1>
          <p>{VEHICLES.length} vehicles registered</p>
        </div>
        <button type="button" className="btn btn-primary">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add vehicle
        </button>
      </div>

      <div className="stat-grid fleet-stats">
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

      <section className="panel-card">
        <div className="fleet-toolbar">
          <div className="search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              type="search"
              placeholder="Search vehicle, plate or category"
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
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Category</th>
              <th className="num">Day rate</th>
              <th>Utilisation</th>
              <th>Insurance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => (
              <tr key={v.plate}>
                <td>
                  <p className="strong">{v.name}</p>
                  <p className="cell-sub">{v.plate}</p>
                </td>
                <td>{v.cat}</td>
                <td className="num">{fmtRate(v.rate)}</td>
                <td>
                  <span className="util-cell">
                    <span className="util-bar">
                      <i style={{ width: `${v.util}%` }} />
                    </span>
                    {v.util}%
                  </span>
                </td>
                <td>
                  {v.insSoon ? (
                    <span className="ins-soon">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
                        <path d="M12 9v4M12 17h.01" />
                      </svg>
                      in {v.insSoon} days
                    </span>
                  ) : (
                    v.ins
                  )}
                </td>
                <td>
                  <span className={`chip ${CHIP_CLASS[v.status]}`}>{v.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="empty-block fleet-empty">
            <p>No vehicles match your search.</p>
          </div>
        )}
      </section>
    </>
  );
}
