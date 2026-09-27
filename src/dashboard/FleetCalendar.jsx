/* Fleet calendar, which car is out when.
 *
 * Cars down the side, days across the top, each booking a bar across the days
 * it holds the car. The gaps are the point: an idle stretch is money not being
 * made, and here it's visible at a glance instead of being worked out from a
 * list of dates.
 *
 * Booking state is carried by the bar's fill *style* (outline, tint, solid,
 * grey) and spelled out in the legend and each bar's tooltip, so it never
 * rests on colour alone. Two bookings that overlap on one car (a double
 * booking) are stacked in separate lanes rather than drawn on top of each
 * other, which makes the clash obvious instead of hiding it.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageLoader from "../components/PageLoader";
import RefreshButton from "../components/RefreshButton";
import { fetchFleetCalendar } from "../lib/api";
import { toast } from "./toastStore";
import usePageTitle from "../hooks/usePageTitle";
import "./overview.css";
import "./fleet.css";
import "./billing.css";
import "./calendar.css";

const WINDOWS = [
  { key: 14, label: "2 weeks" },
  { key: 30, label: "30 days" },
];

const STATUS_LABEL = {
  Pending: "Pending",
  Confirmed: "Confirmed",
  Active: "On the road",
  Completed: "Completed",
};

const DAY = 86_400_000;

const isoLocal = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const parse = (iso) => new Date(`${iso}T00:00:00`);

const dayIndex = (start, iso) => Math.round((parse(iso) - start) / DAY);

const fmtRangeLabel = (a, b) => {
  const opts = { day: "numeric", month: "short" };
  return `${a.toLocaleDateString("en-KE", opts)} to ${b.toLocaleDateString("en-KE", { ...opts, year: "numeric" })}`;
};

/* Greedy lane assignment: each bar takes the first lane whose last bar ended
   before it starts. One lane in the normal case; more only on a clash. */
function laneUp(bars) {
  const ends = [];
  return bars.map((b) => {
    let lane = ends.findIndex((end) => end < b.from);
    if (lane === -1) lane = ends.length;
    ends[lane] = b.to;
    return { ...b, lane };
  });
}

export default function FleetCalendar() {
  usePageTitle("Calendar");
  const [start, setStart] = useState(() => isoLocal(new Date()));
  const [days, setDays] = useState(14);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setData(await fetchFleetCalendar({ start, days }));
    } catch (err) {
      toast(err.message || "Failed to load the calendar", "danger");
    } finally {
      setLoading(false);
    }
  }, [start, days]);

  useEffect(() => {
    load();
  }, [load]);

  function shift(by) {
    const d = parse(start);
    d.setDate(d.getDate() + by);
    setStart(isoLocal(d));
  }

  const startDate = parse(start);
  const todayIso = isoLocal(new Date());
  const todayIdx = dayIndex(startDate, todayIso);

  const dates = useMemo(
    () => Array.from({ length: days }, (_, i) => new Date(parse(start).getTime() + i * DAY)),
    [start, days]
  );

  const rows = useMemo(() => {
    if (!data) return [];
    const startDate = parse(start);
    const byPlate = {};
    for (const b of data.bookings) {
      const from = Math.max(0, dayIndex(startDate, b.start));
      const to = Math.min(days - 1, dayIndex(startDate, b.end));
      if (from > to) continue;
      (byPlate[b.plate] ||= []).push({
        ...b,
        from,
        to,
        cutLeft: dayIndex(startDate, b.start) < 0,
        cutRight: dayIndex(startDate, b.end) > days - 1,
      });
    }
    return data.cars.map((car) => {
      const bars = laneUp((byPlate[car.plate] || []).sort((a, b) => a.from - b.from));
      const outToday = bars.some((b) => b.from <= todayIdx && b.to >= todayIdx && b.status !== "Pending");
      return { car, bars, lanes: Math.max(1, ...bars.map((b) => b.lane + 1)), outToday };
    });
  }, [data, start, days, todayIdx]);

  const inWindow = todayIdx >= 0 && todayIdx < days;
  const freeToday = rows.filter((r) => !r.outToday && r.car.status !== "Maintenance" && r.car.status !== "In maintenance").length;

  return (
    <>
      <h1 className="sr-only">Fleet calendar</h1>

      <section className="panel-card">
        <div className="fc-toolbar">
          <div>
            <p className="fc-range">{fmtRangeLabel(dates[0], dates[dates.length - 1])}</p>
            {data && inWindow && (
              <p className="cell-sub">
                {freeToday} of {rows.length} car{rows.length === 1 ? "" : "s"} free today
              </p>
            )}
          </div>
          <div className="fc-controls">
            <div className="usage-ranges" role="group" aria-label="Move">
              <button type="button" className="usage-range" onClick={() => shift(-7)} aria-label="Earlier by a week">
                ← Earlier
              </button>
              <button type="button" className="usage-range" onClick={() => setStart(todayIso)}>
                Today
              </button>
              <button type="button" className="usage-range" onClick={() => shift(7)} aria-label="Later by a week">
                Later →
              </button>
            </div>
            <div className="usage-ranges" role="group" aria-label="Window">
              {WINDOWS.map((w) => (
                <button
                  type="button"
                  key={w.key}
                  className={"usage-range" + (days === w.key ? " is-on" : "")}
                  aria-pressed={days === w.key}
                  onClick={() => setDays(w.key)}
                >
                  {w.label}
                </button>
              ))}
            </div>
            <RefreshButton onRefresh={load} />
          </div>
        </div>

        <ul className="fc-legend" aria-label="Booking states">
          {["Pending", "Confirmed", "Active", "Completed"].map((s) => (
            <li key={s}>
              <i className={`fc-swatch is-${s.toLowerCase()}`} aria-hidden="true" />
              {STATUS_LABEL[s]}
            </li>
          ))}
        </ul>

        {loading && !data ? (
          <PageLoader compact message="Loading the calendar…" />
        ) : rows.length === 0 ? (
          <p className="field-note">Add cars to your fleet to see them here.</p>
        ) : (
          <div className="fc-scroll">
            <div className="fc" style={{ "--fc-days": days }}>
              <div className="fc-row fc-head">
                <div className="fc-car">Car</div>
                <div className="fc-lane">
                  {dates.map((d, i) => (
                    <div
                      key={i}
                      className={"fc-day" + (i === todayIdx ? " is-today" : "") + (d.getDay() % 6 === 0 ? " is-weekend" : "")}
                      style={{ gridColumn: i + 1 }}
                    >
                      <span>{d.toLocaleDateString("en-KE", { weekday: "narrow" })}</span>
                      <span className="strong">{d.getDate()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {rows.map(({ car, bars, lanes }) => (
                <div className="fc-row" key={car.plate}>
                  <div className="fc-car">
                    <Link className="strong spec-link" to={`/dashboard/fleet/${encodeURIComponent(car.plate)}`}>
                      {car.name}
                    </Link>
                    <span className="cell-sub">
                      {car.plate}
                      {/maint/i.test(car.status) ? " · In maintenance" : ""}
                    </span>
                  </div>
                  <div className="fc-lane" style={{ gridTemplateRows: `repeat(${lanes}, 30px)` }}>
                    {dates.map((d, i) => (
                      <div
                        key={i}
                        aria-hidden="true"
                        className={"fc-cell" + (i === todayIdx ? " is-today" : "") + (d.getDay() % 6 === 0 ? " is-weekend" : "")}
                        style={{ gridColumn: i + 1, gridRow: "1 / -1" }}
                      />
                    ))}
                    {bars.map((b) => (
                      <Link
                        key={b.ref}
                        to={`/dashboard/bookings/${encodeURIComponent(b.ref)}`}
                        className={
                          `fc-bar is-${b.status.toLowerCase()}` +
                          (b.cutLeft ? " cut-left" : "") +
                          (b.cutRight ? " cut-right" : "")
                        }
                        style={{ gridColumn: `${b.from + 1} / ${b.to + 2}`, gridRow: b.lane + 1 }}
                        title={`${b.customer} · ${b.ref} · ${STATUS_LABEL[b.status] || b.status}${
                          b.source === "marketplace" ? " · Ardena app" : ""
                        } · ${b.start} to ${b.end}`}
                      >
                        {b.customer}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
