import { useMemo, useState } from "react";

/* Bookings taken per week, derived from the live store (by pickup date),
   last 8 weeks with activity. Single-series bars in the brand hue. */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Monday of the week that contains this ISO date
function weekStart(iso) {
  const d = new Date(`${iso}T00:00:00`);
  const dow = (d.getDay() + 6) % 7; // Mon = 0
  d.setDate(d.getDate() - dow);
  d.setHours(0, 0, 0, 0);
  return d;
}

const W = 540;
const H = 250;
const TOP = 30;
const BOTTOM = 34;
const LEFT = 34;
const RIGHT = 16;
const BAR_W = 30;

const plotW = W - LEFT - RIGHT;
const plotH = H - TOP - BOTTOM;

export default function BookingsTrend({ bookings }) {
  const [tip, setTip] = useState(null);

  const { data, max, ticks } = useMemo(() => {
    const buckets = new Map();
    for (const b of bookings) {
      const ws = weekStart(b.pickup);
      const key = ws.getTime();
      const cur = buckets.get(key) || { time: key, date: ws, count: 0 };
      cur.count += 1;
      buckets.set(key, cur);
    }
    const sorted = [...buckets.values()].sort((a, b) => a.time - b.time).slice(-8);
    const rows = sorted.map((w) => ({
      count: w.count,
      label: `${w.date.getDate()} ${MONTHS[w.date.getMonth()]}`,
    }));
    const peak = rows.reduce((m, r) => Math.max(m, r.count), 0);
    const niceMax = Math.max(4, Math.ceil(peak / 2) * 2);
    return {
      data: rows,
      max: niceMax,
      ticks: [0, niceMax / 2, niceMax],
    };
  }, [bookings]);

  const slotX = (i) => LEFT + ((i + 0.5) * plotW) / Math.max(1, data.length);
  const y = (v) => TOP + plotH - (v / max) * plotH;
  const last = data.length - 1;

  function show(e, d) {
    const card = e.currentTarget.closest(".chart-card").getBoundingClientRect();
    setTip({
      x: e.clientX - card.left,
      y: e.clientY - card.top - 12,
      week: `Week of ${d.label}`,
      value: `${d.count} booking${d.count === 1 ? "" : "s"}`,
    });
  }

  return (
    <div className="collections-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Bookings taken per week over the last 8 weeks"
      >
        {ticks.map((t) => (
          <g key={t}>
            <line className="ct-grid" x1={LEFT} y1={y(t)} x2={W - RIGHT} y2={y(t)} />
            <text className="ct-tick" x={LEFT - 8} y={y(t) + 3.5} textAnchor="end">
              {t}
            </text>
          </g>
        ))}

        {data.map((d, i) => (
          <g key={d.label + i}>
            <rect
              className="ct-bar"
              x={slotX(i) - BAR_W / 2}
              y={y(d.count)}
              width={BAR_W}
              height={TOP + plotH - y(d.count)}
            />
            {i === last && (
              <text className="ct-value" x={slotX(i)} y={y(d.count) - 8} textAnchor="middle">
                {d.count}
              </text>
            )}
            <text className="ct-tick" x={slotX(i)} y={H - 12} textAnchor="middle">
              {d.label}
            </text>
            <rect
              x={slotX(i) - plotW / Math.max(1, data.length) / 2}
              y={TOP}
              width={plotW / Math.max(1, data.length)}
              height={plotH}
              fill="transparent"
              onMouseMove={(e) => show(e, d)}
              onMouseLeave={() => setTip(null)}
            />
          </g>
        ))}
      </svg>

      {tip && (
        <div className="chart-tip" style={{ left: tip.x, top: tip.y }}>
          <strong>{tip.value}</strong>
          <span>{tip.week}</span>
        </div>
      )}
    </div>
  );
}
