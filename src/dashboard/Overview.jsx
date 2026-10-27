import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import PageSkeleton from "./PageSkeleton";
import SimpleBars from "./charts/SimpleBars";
import UtilisationTrend from "./charts/UtilisationTrend";
import OnboardingChecklist from "./OnboardingChecklist";
import EmptyState from "./EmptyState";
import { fetchOverview } from "../lib/api";
import { toast } from "./toastStore";
import "./overview.css";
import RefreshButton from "../components/RefreshButton";

const fmtKES = (n) => `KES ${Number(n).toLocaleString("en-KE")}`;

const fmtCount = (n) => `${n} booking${n === 1 ? "" : "s"}`;

const DAY_NAMES = {
  Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday",
  Fri: "Friday", Sat: "Saturday", Sun: "Sunday",
};

// The heatmap's two-hour slots, folded into three parts of the day anyone
// can name without reading an axis.
const DAY_PARTS = [
  { label: "Morning", sub: "6am to 12pm", from: 6, to: 12 },
  { label: "Afternoon", sub: "12pm to 6pm", from: 12, to: 18 },
  { label: "Evening", sub: "6pm to 10pm", from: 18, to: 22 },
];

const busiest = (rows) =>
  rows.reduce((best, r) => (r.value > (best?.value ?? 0) ? r : best), null);

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
  const { pathname } = useLocation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const stats = data?.stats;
  const hasFleet = (stats?.fleet_size ?? 0) > 0;
  const hasBookings = (stats?.active_bookings ?? 0) > 0 || (data?.top_vehicles?.length ?? 0) > 0;

  const alerts = data?.attention ?? [];

  const heat = data?.booking_heatmap ?? [];
  const byDay = Object.entries(DAY_NAMES).map(([day, label]) => ({
    label,
    value: heat.filter((c) => c.day === day).reduce((n, c) => n + c.count, 0),
  }));
  const byTime = DAY_PARTS.map(({ label, sub, from, to }) => ({
    label,
    sub,
    value: heat.filter((c) => c.hour >= from && c.hour < to).reduce((n, c) => n + c.count, 0),
  }));
  const busiestDay = busiest(byDay);
  const busiestTime = busiest(byTime);

  const earners = (data?.top_vehicles ?? []).map((v) => ({
    label: v.name,
    sub: v.plate,
    value: v.curr,
  }));

  const kpis = stats
    ? [
        {
          label: "Collected this month",
          value: fmtKES(stats.monthly_revenue),
          // The total now spans both channels. Naming the split matters because
          // the business keeps all of a dashboard booking but pays commission on
          // an app one, a single number hid which half was growing.
          delta: stats.monthly_revenue
            ? stats.monthly_revenue_marketplace
              ? `${fmtKES(stats.monthly_revenue_marketplace)} from the Ardena app`
              : "all from dashboard bookings"
            : "no payments yet",
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
      <div className="page-refresh">
        <RefreshButton onRefresh={load} />
      </div>
      <OnboardingChecklist />

      {/* ---- Document and inspection alerts ---- */}
      {alerts.length > 0 && (
        <ul className="ov-alerts" aria-label="Alerts">
          {alerts.map((a) => (
            <li className={`ov-alert ${a.kind}`} key={a.title + a.meta}>
              <span className="ov-alert-icon">{STATUS_ICON[a.kind]}</span>
              <p>
                <strong>{a.title}</strong>
                <span>{a.meta}</span>
              </p>
            </li>
          ))}
        </ul>
      )}

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

      {/* ---- Charts, two by two ---- */}
      <div className="chart-row">
        <section className="chart-card">
          <header className="card-head">
            <h2>Fleet utilisation</h2>
            <p>% of vehicles out on booking, weekly, last 10 weeks</p>
          </header>
          {(data?.utilisation_trend?.length ?? 0) >= 2 ? (
            <UtilisationTrend data={data.utilisation_trend} />
          ) : (
            <EmptyState minimal title="No utilisation yet" />
          )}
        </section>

        <section className="chart-card">
          <header className="card-head">
            <h2>Top earning vehicles</h2>
            <p>Money each vehicle made this month</p>
          </header>
          {earners.length > 0 ? (
            <SimpleBars
              rows={earners}
              format={fmtKES}
              takeaway={`${earners[0].label} earned the most this month.`}
            />
          ) : (
            <EmptyState minimal title="No revenue yet" />
          )}
        </section>

        <section className="chart-card">
          <header className="card-head">
            <h2>Busiest days</h2>
            <p>Bookings made on each day of the week, last 4 weeks</p>
          </header>
          {hasBookings && busiestDay ? (
            <SimpleBars
              rows={byDay}
              format={fmtCount}
              takeaway={`${busiestDay.label} is your busiest day.`}
            />
          ) : (
            <EmptyState minimal title="No booking data yet" />
          )}
        </section>

        <section className="chart-card">
          <header className="card-head">
            <h2>Busiest time of day</h2>
            <p>When customers make their bookings, last 4 weeks</p>
          </header>
          {hasBookings && busiestTime ? (
            <SimpleBars
              rows={byTime}
              format={fmtCount}
              takeaway={`Most bookings come in the ${busiestTime.label.toLowerCase()}.`}
            />
          ) : (
            <EmptyState minimal title="No booking data yet" />
          )}
        </section>
      </div>
    </>
  );
}
