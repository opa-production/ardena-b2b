import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import PageSkeleton from "./PageSkeleton";
import SimpleBars from "./charts/SimpleBars";
import DayColumns from "./charts/DayColumns";
import PaymentDonut from "./charts/PaymentDonut";
import UtilisationTrend from "./charts/UtilisationTrend";
import OnboardingChecklist from "./OnboardingChecklist";
import EmptyState from "./EmptyState";
import { fetchOverview, fetchPaymentsSummary } from "../lib/api";
import { toast } from "./toastStore";
import "./payments.css";
import "./overview.css";
import RefreshButton from "../components/RefreshButton";

const fmtKES = (n) => `KES ${Number(n).toLocaleString("en-KE")}`;

const DAY_NAMES = {
  Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday",
  Fri: "Friday", Sat: "Saturday", Sun: "Sunday",
};

const busiest = (rows) =>
  rows.reduce((best, r) => (r.value > (best?.value ?? 0) ? r : best), null);

export default function Overview() {
  const { pathname } = useLocation();
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      // Roles that can't see payments get a 403 here, so the money card just
      // shows its empty state rather than failing the whole page.
      const [result, sumData] = await Promise.all([
        fetchOverview(),
        fetchPaymentsSummary().catch(() => null),
      ]);
      setData(result);
      setSummary(sumData);
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

  const heat = data?.booking_heatmap ?? [];
  const byDay = Object.entries(DAY_NAMES).map(([day, label]) => ({
    label,
    value: heat.filter((c) => c.day === day).reduce((n, c) => n + c.count, 0),
  }));
  const busiestDay = busiest(byDay);

  // Payments summary is the same source the Finances donut reads. Cash and
  // in-app collections are one "paid" slice here, the split lives on Finances.
  const sum = summary || {};
  const paid = (Number(sum.collected) || 0) + (Number(sum.cash_collected) || 0);
  const owed = Number(sum.outstanding) || 0;
  const refunded = Number(sum.refunded) || 0;
  const billed = paid + owed + refunded;
  const money = [
    { label: "Paid", value: paid, color: "#0b7a37" },
    { label: "Still owed", value: owed, color: "#d97706" },
    { label: "Refunded", value: refunded, color: "#94a3b8" },
  ];

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

      {/* ---- Charts, two by two, sized to fit one screen ---- */}
      <div className="chart-row ov-charts">
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
            <p>
              {earners.length > 0
                ? `${earners[0].label} earned the most this month`
                : "Money each vehicle made this month"}
            </p>
          </header>
          {earners.length > 0 ? (
            <SimpleBars rows={earners} format={fmtKES} />
          ) : (
            <EmptyState minimal title="No revenue yet" />
          )}
        </section>

        <section className="chart-card">
          <header className="card-head">
            <h2>Busiest days</h2>
            <p>
              {hasBookings && busiestDay
                ? `${busiestDay.label} is your busiest day · last 4 weeks`
                : "Bookings made on each day of the week, last 4 weeks"}
            </p>
          </header>
          {hasBookings && busiestDay ? (
            <DayColumns rows={byDay} />
          ) : (
            <EmptyState minimal title="No booking data yet" />
          )}
        </section>

        <section className="chart-card">
          <header className="card-head">
            <h2>Money owed to you</h2>
            <p>
              {billed === 0
                ? "Paid, still owed and refunded"
                : owed > 0
                  ? `${fmtKES(owed)} still to be collected`
                  : "Everything billed has been paid"}
            </p>
          </header>
          {billed > 0 ? (
            <PaymentDonut segments={money} />
          ) : (
            <EmptyState minimal title="Nothing billed yet" />
          )}
        </section>
      </div>
    </>
  );
}
