import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import PageSkeleton from "./PageSkeleton";
import BookingHeatmap from "./charts/BookingHeatmap";
import RevenueDumbbell from "./charts/RevenueDumbbell";
import UtilisationTrend from "./charts/UtilisationTrend";
import OnboardingChecklist from "./OnboardingChecklist";
import EmptyState, { EMPTY_ICONS } from "./EmptyState";
import { fetchOverview, exportReport } from "../lib/api";
import { toast } from "./toastStore";
import "./overview.css";

const fmtKES = (n) => `KES ${Number(n).toLocaleString("en-KE")}`;

const FLEET_STATUSES = ["Available", "On booking", "In maintenance"];

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

const EXPORT_TYPES = [
  { value: "bookings", label: "Bookings" },
  { value: "payments", label: "Payments" },
  { value: "clients", label: "Clients" },
];

export default function Overview() {
  const { pathname } = useLocation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null);

  const load = useCallback(async () => {
    try {
      const result = await fetchOverview();
      setData(result);
    } catch (err) {
      toast(err.message || "Failed to load overview", "danger");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleExport(type) {
    if (exporting) return;
    setExporting(type);
    try {
      await exportReport({ type });
    } catch (err) {
      toast(err.message || "Export failed", "danger");
    } finally {
      setExporting(null);
    }
  }

  const stats = data?.stats;
  const hasFleet = (stats?.fleet_size ?? 0) > 0;
  const hasBookings = (stats?.active_bookings ?? 0) > 0 || (data?.top_vehicles?.length ?? 0) > 0;

  const kpis = stats
    ? [
        {
          label: "Collected this month",
          value: fmtKES(stats.monthly_revenue),
          delta: stats.monthly_revenue ? "via Paystack" : "no payments yet",
        },
        {
          label: "Active bookings",
          value: String(stats.active_bookings),
          delta: stats.active_bookings ? "on the road" : "no rentals yet",
        },
        {
          label: "Fleet utilisation",
          value: `${stats.utilisation}%`,
          delta: hasFleet ? "of fleet on booking" : "add vehicles",
        },
        {
          label: "Fleet size",
          value: String(stats.fleet_size),
          delta: hasFleet ? "vehicles in workspace" : "add your first vehicle",
        },
      ]
    : [];

  if (loading) return <PageSkeleton path={pathname} />;

  return (
    <>
      <OnboardingChecklist />

      {/* ---- KPI row ---- */}
      <div className="stat-grid">
        {kpis.map((k) => (
          <article className="stat-card" key={k.label}>
            <p className="stat-label">{k.label}</p>
            <p className="stat-value">{k.value}</p>
            <p className="stat-note"><span className="stat-delta">{k.delta}</span></p>
          </article>
        ))}
      </div>

      {/* ---- Charts ---- */}
      <div className="chart-row">
        <section className="chart-card">
          <header className="card-head">
            <h2>Booking rhythm</h2>
            <p>When bookings are created, by day and time — last 4 weeks</p>
          </header>
          {hasBookings ? (
            <BookingHeatmap data={data.booking_heatmap} />
          ) : (
            <EmptyState
              icon={EMPTY_ICONS.chart}
              title="No booking data yet"
              message="Your busiest days and times appear here once bookings start coming in."
            />
          )}
        </section>

        <section className="chart-card">
          <header className="card-head">
            <h2>Top earning vehicles</h2>
            <p>KES by vehicle, last month vs this month</p>
          </header>
          {(data?.top_vehicles?.length ?? 0) > 0 ? (
            <RevenueDumbbell data={data.top_vehicles} />
          ) : (
            <EmptyState
              icon={EMPTY_ICONS.chart}
              title="No revenue yet"
              message="Your top earning vehicles will rank here after your first paid bookings."
            />
          )}
        </section>
      </div>

      {/* ---- Utilisation trend + side widgets ---- */}
      <div className="overview-grid">
        <section className="chart-card">
          <header className="card-head">
            <h2>Fleet utilisation</h2>
            <p>% of vehicles out on booking, weekly, last 10 weeks</p>
          </header>
          {(data?.utilisation_trend?.length ?? 0) >= 2 ? (
            <UtilisationTrend data={data.utilisation_trend} />
          ) : (
            <EmptyState
              icon={EMPTY_ICONS.chart}
              title="No utilisation yet"
              message="Track how much of your fleet is earning once vehicles start going out on bookings."
            />
          )}
        </section>

        <div className="overview-side">
          <section className="panel-card">
            <header className="card-head">
              <h2>Needs attention</h2>
              <p>Documents and checks</p>
            </header>
            {(data?.attention?.length ?? 0) > 0 ? (
              <ul className="attention-list">
                {data.attention.map((a) => (
                  <li key={a.title + a.meta}>
                    <span className={`attention-icon ${a.kind}`}>{STATUS_ICON[a.kind]}</span>
                    <div>
                      <p className="attention-title">{a.title}</p>
                      <p className="attention-meta">{a.meta}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                compact
                icon={EMPTY_ICONS.verification}
                title="Nothing needs attention"
                message="Expiring documents and failed checks will flag here."
              />
            )}
          </section>

          <section className="panel-card">
            <header className="card-head">
              <h2>Export reports</h2>
              <p>Download as CSV · always up to date</p>
            </header>
            <div className="export-list">
              {EXPORT_TYPES.map(({ value, label }) => (
                <div className="export-row" key={value}>
                  <span>{label}</span>
                  <button
                    type="button"
                    className="icon-btn prompt-green"
                    disabled={exporting === value}
                    onClick={() => handleExport(value)}
                  >
                    {exporting === value ? "Exporting…" : "Export CSV"}
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
