/* Reports — what the bookings say about the business.
 *
 * Four questions, in the order an owner asks them:
 *   1. Are my cars working?          utilisation per car
 *   2. Who owes me money?            money owed by age, deposits to return,
 *                                    cash collected per staff member
 *   3. Who are my customers?         top clients, repeat rate, lapsed clients
 *   4. When do people rent?          pickups by weekday and month, rental
 *                                    length, how far ahead they book
 *
 * Money owed and deposits are "right now"; everything else follows the period
 * switch. Every chart here is one series in one hue, with the numbers printed
 * beside it, so nothing rests on colour alone.
 */
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import PageSkeleton from "./PageSkeleton";
import RefreshButton from "../components/RefreshButton";
import { fetchReportInsights } from "../lib/api";
import { fmtAmount } from "./billingFormat";
import { toast } from "./toastStore";
import usePageTitle from "../hooks/usePageTitle";
import "./overview.css";
import "./fleet.css";
import "./bookings.css";
import "./billing.css";
import "./verification.css";
import "./reports.css";

const RANGES = [
  { key: 30, label: "30 days" },
  { key: 90, label: "90 days" },
  { key: 365, label: "12 months" },
];

const isoLocal = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const fmtDay = (iso) =>
  iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-KE", { day: "numeric", month: "short" })
    : "-";

const fmtMonth = (key) =>
  new Date(`${key}-01T00:00:00`).toLocaleDateString("en-KE", { month: "short" });

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/* A single-hue meter. The number is printed next to it, so the bar is a
   reading aid, not the only carrier of the value. */
function Meter({ value, label }) {
  return (
    <span className="rp-meter" role="img" aria-label={label}>
      <span className="rp-meter-fill" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </span>
  );
}

/* Vertical bars, one series. `title` gives the hover readout; the count is
   also printed on top of every bar (there are at most 12). */
function Bars({ rows, valueOf, labelOf, titleOf }) {
  const max = Math.max(1, ...rows.map(valueOf));
  return (
    <div className="rp-bars" style={{ gridTemplateColumns: `repeat(${rows.length}, 1fr)` }}>
      {rows.map((r) => {
        const v = valueOf(r);
        return (
          <div className="rp-bar-col" key={labelOf(r)} title={titleOf(r)}>
            <span className="rp-bar-value">{v || ""}</span>
            <span className="rp-bar-track">
              <span className="rp-bar" style={{ height: `${(v / max) * 100}%` }} />
            </span>
            <span className="rp-bar-label">{labelOf(r)}</span>
          </div>
        );
      })}
    </div>
  );
}

function ClientTable({ rows, empty }) {
  if (!rows.length) return <p className="field-note">{empty}</p>;
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Client</th>
          <th className="num">Trips</th>
          <th className="num">Spend</th>
          <th>Last trip</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((c) => (
          <tr key={`${c.client_id || c.phone}-${c.name}`}>
            <td>
              {c.client_id ? (
                <Link className="strong spec-link" to={`/dashboard/clients/${c.client_id}`}>
                  {c.name}
                </Link>
              ) : (
                <span className="strong">{c.name}</span>
              )}
              <span className="cell-sub">{c.phone}</span>
            </td>
            <td className="num">{c.bookings}</td>
            <td className="num">KES {fmtAmount(c.spend)}</td>
            <td>{fmtDay(c.last_trip)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Reports() {
  usePageTitle("Reports");
  const { pathname } = useLocation();
  const [range, setRange] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - (range - 1));
    try {
      setData(await fetchReportInsights({ from: isoLocal(from), to: isoLocal(to) }));
    } catch (err) {
      toast(err.message || "Failed to load reports", "danger");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) return <PageSkeleton path={pathname} />;
  if (!data) return null;

  const { utilisation: u, receivables: rec, deposits: dep, clients, demand } = data;
  const owedCount = rec.items.length;
  const dueBack = dep.items.filter((d) => d.due_for_refund).length;

  return (
    <>
      <h1 className="sr-only">Reports</h1>

      <div className="rp-bar-head">
        <p className="rp-period">
          {fmtDay(data.period.start)} – {fmtDay(data.period.end)}
          <span className="cell-sub"> · money owed and deposits are as of today</span>
        </p>
        <div className="rp-controls">
          <div className="usage-ranges" role="group" aria-label="Period">
            {RANGES.map((r) => (
              <button
                type="button"
                key={r.key}
                className={"usage-range" + (range === r.key ? " is-on" : "")}
                aria-pressed={range === r.key}
                onClick={() => setRange(r.key)}
              >
                {r.label}
              </button>
            ))}
          </div>
          <RefreshButton onRefresh={load} />
        </div>
      </div>

      <div className="stat-grid verify-stats">
        <article className="stat-card">
          <p className="stat-label">Fleet utilisation</p>
          <p className="stat-value">{u.fleet}%</p>
          <p className="stat-note">of available car-days booked</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Booked value</p>
          <p className="stat-value">KES {fmtAmount(u.booked_value)}</p>
          <p className="stat-note">trips starting in the period</p>
        </article>
        <article className={"stat-card" + (rec.total_owed ? " stat-card--cream" : "")}>
          <p className="stat-label">Money owed</p>
          <p className="stat-value">KES {fmtAmount(rec.total_owed)}</p>
          <p className="stat-note">{owedCount ? plural(owedCount, "booking") : "nothing outstanding"}</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Deposits held</p>
          <p className="stat-value">KES {fmtAmount(dep.held)}</p>
          <p className="stat-note">
            {dueBack ? `KES ${fmtAmount(dep.due_for_refund)} due back` : "none due back"}
          </p>
        </article>
      </div>

      {/* 1. Are my cars working? */}
      <section className="panel-card rp-section">
        <header className="card-head">
          <h2>Utilisation by car</h2>
          <p>Days each car was out on a booking, busiest first</p>
        </header>
        {u.cars.length === 0 ? (
          <p className="field-note">Add cars to your fleet to see how busy they are.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Car</th>
                <th className="rp-meter-col">Utilisation</th>
                <th className="num">Days out</th>
                <th className="num">Idle</th>
                <th className="num">Trips</th>
                <th className="num">Booked value</th>
              </tr>
            </thead>
            <tbody>
              {u.cars.map((c) => (
                <tr key={c.plate}>
                  <td>
                    <Link className="strong spec-link" to={`/dashboard/fleet/${encodeURIComponent(c.plate)}`}>
                      {c.name}
                    </Link>
                    <span className="cell-sub">{c.plate}</span>
                  </td>
                  <td>
                    <span className="rp-meter-row">
                      <Meter value={c.utilisation} label={`${c.utilisation}% utilised`} />
                      <span className="strong">{c.utilisation}%</span>
                    </span>
                  </td>
                  <td className="num">{c.booked_days}</td>
                  <td className="num">{c.idle_days}</td>
                  <td className="num">{c.bookings}</td>
                  <td className="num">KES {fmtAmount(c.booked_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* 2. Who owes me money? */}
      <div className="rp-grid">
        <section className="panel-card">
          <header className="card-head">
            <h2>Money owed</h2>
            <p>Unpaid trips that have started, oldest first</p>
          </header>
          <div className="rp-buckets">
            {[
              ["0-7", "Up to a week"],
              ["8-30", "8 to 30 days"],
              ["31+", "Over 30 days"],
            ].map(([key, label]) => (
              <div className={"rp-bucket" + (key === "31+" && rec.buckets[key] ? " is-late" : "")} key={key}>
                <p className="cell-sub">{label}</p>
                <p className="strong">KES {fmtAmount(rec.buckets[key])}</p>
              </div>
            ))}
          </div>
          {owedCount === 0 ? (
            <p className="field-note">Every started trip is paid.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Booking</th>
                  <th className="num">Owed</th>
                  <th className="num">Since pickup</th>
                </tr>
              </thead>
              <tbody>
                {rec.items.map((i) => (
                  <tr key={i.ref}>
                    <td>
                      <Link className="strong spec-link" to={`/dashboard/bookings/${encodeURIComponent(i.ref)}`}>
                        {i.customer}
                      </Link>
                      <span className="cell-sub">
                        {i.ref} · {i.vehicle}
                        {i.paid ? ` · KES ${fmtAmount(i.paid)} paid` : ""}
                      </span>
                    </td>
                    <td className="num strong">KES {fmtAmount(i.owed)}</td>
                    <td className="num">{plural(i.days_since_pickup, "day")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {rec.upcoming_count > 0 && (
            <p className="field-note rp-foot">
              Plus KES {fmtAmount(rec.upcoming_unpaid)} unpaid on{" "}
              {plural(rec.upcoming_count, "trip")} that {rec.upcoming_count === 1 ? "hasn't" : "haven't"} started yet.
            </p>
          )}
        </section>

        <div className="rp-stack">
          <section className="panel-card">
            <header className="card-head">
              <h2>Deposits held</h2>
              <p>Money that isn&apos;t yours yet</p>
            </header>
            {dep.items.length === 0 ? (
              <p className="field-note">No deposits held right now.</p>
            ) : (
              <table className="data-table">
                <tbody>
                  {dep.items.map((d) => (
                    <tr key={d.ref}>
                      <td>
                        <Link className="strong spec-link" to={`/dashboard/bookings/${encodeURIComponent(d.ref)}`}>
                          {d.customer}
                        </Link>
                        <span className="cell-sub">
                          {d.vehicle} · returns {fmtDay(d.dropoff)}
                        </span>
                      </td>
                      <td className="num">
                        <span className="strong">KES {fmtAmount(d.amount)}</span>
                        {d.due_for_refund && <span className="cell-sub rp-due">Due back</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="panel-card">
            <header className="card-head">
              <h2>Collected by</h2>
              <p>Payments received in the period, by who took them</p>
            </header>
            {data.collected_by_staff.length === 0 ? (
              <p className="field-note">No payments received in this period.</p>
            ) : (
              <table className="data-table">
                <tbody>
                  {data.collected_by_staff.map((s) => (
                    <tr key={s.staff}>
                      <td>
                        <span className="strong">{s.staff}</span>
                        <span className="cell-sub">{plural(s.payments, "payment")}</span>
                      </td>
                      <td className="num strong">KES {fmtAmount(s.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>

      {/* 3. Who are my customers? */}
      <div className="rp-grid">
        <section className="panel-card">
          <header className="card-head">
            <h2>Top clients</h2>
            <p>
              {clients.total
                ? `${plural(clients.total, "client")} · ${clients.repeat_rate}% came back for another trip`
                : "All time"}
            </p>
          </header>
          <ClientTable rows={clients.top} empty="No bookings yet." />
        </section>
        <section className="panel-card">
          <header className="card-head">
            <h2>Haven&apos;t rented in 90 days</h2>
            <p>Good customers worth a call or a message</p>
          </header>
          <ClientTable rows={clients.lapsed} empty="Everyone has rented recently." />
        </section>
      </div>

      {/* 4. When do people rent? */}
      <div className="rp-grid">
        <section className="panel-card">
          <header className="card-head">
            <h2>Pickups by day of the week</h2>
            <p>Trips starting in the period</p>
          </header>
          <Bars
            rows={demand.by_weekday}
            valueOf={(r) => r.bookings}
            labelOf={(r) => r.day}
            titleOf={(r) => `${r.day}: ${plural(r.bookings, "pickup")}`}
          />
          <div className="rp-facts">
            <p>
              <span className="cell-sub">Average rental</span>
              <span className="strong">
                {demand.avg_length_days != null ? plural(demand.avg_length_days, "day") : "-"}
              </span>
            </p>
            <p>
              <span className="cell-sub">Booked ahead</span>
              <span className="strong">
                {demand.avg_lead_days != null ? plural(demand.avg_lead_days, "day") : "-"}
              </span>
            </p>
          </div>
        </section>
        <section className="panel-card">
          <header className="card-head">
            <h2>Trips per month</h2>
            <p>Last 12 months, by pickup date</p>
          </header>
          <Bars
            rows={demand.by_month}
            valueOf={(r) => r.bookings}
            labelOf={(r) => fmtMonth(r.month)}
            titleOf={(r) => `${fmtMonth(r.month)}: ${plural(r.bookings, "trip")}, KES ${fmtAmount(r.value)}`}
          />
        </section>
      </div>
    </>
  );
}
