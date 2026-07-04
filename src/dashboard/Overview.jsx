import BookingHeatmap from "./charts/BookingHeatmap";
import RevenueDumbbell from "./charts/RevenueDumbbell";
import UtilisationTrend from "./charts/UtilisationTrend";
import "./overview.css";

const KPIS = [
  {
    label: "Collected this month",
    value: "KES 482,300",
    delta: "+12%",
    good: true,
    vs: "vs June",
  },
  {
    label: "Active bookings",
    value: "11",
    delta: "+2",
    good: true,
    vs: "vs last week",
  },
  {
    label: "Fleet utilisation",
    value: "71%",
    delta: "+5pts",
    good: true,
    vs: "vs June",
  },
  {
    label: "Verifications run",
    value: "38",
    delta: "36 passed",
    neutral: true,
    vs: "this month",
  },
];

const FLEET = [
  { label: "Available", count: 14 },
  { label: "On booking", count: 7 },
  { label: "In maintenance", count: 3 },
];
const FLEET_TOTAL = FLEET.reduce((s, f) => s + f.count, 0);

const ATTENTION = [
  {
    kind: "warning",
    title: "Insurance expiring",
    meta: "KDL 482A · in 9 days",
  },
  {
    kind: "warning",
    title: "Inspection due",
    meta: "KCZ 771B · in 14 days",
  },
  {
    kind: "critical",
    title: "Verification failed",
    meta: "P. Njoroge · ID mismatch",
  },
];

const STATUS_ICON = {
  warning: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  ),
  critical: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9l-6 6M9 9l6 6" />
    </svg>
  ),
};

export default function Overview() {
  return (
    <>
      {/* ---- KPI row ---- */}
      <div className="stat-grid">
        {KPIS.map((k) => (
          <article className="stat-card" key={k.label}>
            <p className="stat-label">{k.label}</p>
            <p className="stat-value">{k.value}</p>
            <p className="stat-note">
              <span
                className={
                  "stat-delta" + (k.neutral ? "" : k.good ? " up" : " down")
                }
              >
                {k.delta}
              </span>{" "}
              {k.vs}
            </p>
          </article>
        ))}
      </div>

      {/* ---- Charts ---- */}
      <div className="chart-row">
        <section className="chart-card">
          <header className="card-head">
            <h2>Booking rhythm</h2>
            <p>Pickups by day and time, last 4 weeks</p>
          </header>
          <BookingHeatmap />
        </section>

        <section className="chart-card">
          <header className="card-head">
            <h2>Revenue by vehicle class</h2>
            <p>KES '000 · SUVs are this month's mover</p>
          </header>
          <RevenueDumbbell />
        </section>
      </div>

      {/* ---- Utilisation trend + side widgets ---- */}
      <div className="overview-grid">
        <section className="chart-card">
          <header className="card-head">
            <h2>Fleet utilisation</h2>
            <p>% of vehicles out on booking, weekly, last 12 weeks</p>
          </header>
          <UtilisationTrend />
        </section>

        <div className="overview-side">
          <section className="panel-card">
            <header className="card-head">
              <h2>Fleet status</h2>
              <p>{FLEET_TOTAL} vehicles</p>
            </header>
            <div className="fleet-rows">
              {FLEET.map((f) => (
                <div className="fleet-row" key={f.label}>
                  <span className="fleet-label">{f.label}</span>
                  <span className="fleet-bar">
                    <i style={{ width: `${(f.count / FLEET_TOTAL) * 100}%` }} />
                  </span>
                  <span className="fleet-count">{f.count}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel-card">
            <header className="card-head">
              <h2>Needs attention</h2>
              <p>Documents and checks</p>
            </header>
            <ul className="attention-list">
              {ATTENTION.map((a) => (
                <li key={a.title + a.meta}>
                  <span className={`attention-icon ${a.kind}`}>
                    {STATUS_ICON[a.kind]}
                  </span>
                  <div>
                    <p className="attention-title">{a.title}</p>
                    <p className="attention-meta">{a.meta}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
