import { useState } from "react";

/* Booking activity by day and time. Sequential single-hue ramp from the
   brand blue; near-zero cells recede into the surface by design. */

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SLOTS = ["6a", "8a", "10a", "12p", "2p", "4p", "6p", "8p"];

// bookings per 2-hour slot over the last 4 weeks (mock)
const VALUES = [
  [1, 2, 3, 2, 2, 3, 2, 1],
  [0, 2, 2, 3, 2, 2, 3, 1],
  [1, 1, 3, 3, 2, 3, 2, 2],
  [1, 2, 4, 3, 3, 4, 5, 2],
  [2, 4, 6, 7, 5, 6, 8, 4],
  [3, 6, 9, 8, 7, 5, 4, 3],
  [2, 3, 5, 4, 3, 2, 1, 0],
];

const RAMP = ["#e4edf9", "#c2dbfa", "#8fbdf7", "#539df4", "#1a80ec", "#0060c4"];

function binColor(v) {
  if (v <= 0) return RAMP[0];
  if (v <= 1) return RAMP[1];
  if (v <= 3) return RAMP[2];
  if (v <= 5) return RAMP[3];
  if (v <= 7) return RAMP[4];
  return RAMP[5];
}

export default function BookingHeatmap() {
  const [tip, setTip] = useState(null);

  function show(e, day, slot, v) {
    const card = e.currentTarget.closest(".chart-card").getBoundingClientRect();
    const cell = e.currentTarget.getBoundingClientRect();
    setTip({
      x: cell.left - card.left + cell.width / 2,
      y: cell.top - card.top,
      text: `${day} ${slot}`,
      value: `${v} booking${v === 1 ? "" : "s"}`,
    });
  }

  return (
    <div className="heatmap">
      <div className="heatmap-grid">
        <span />
        {SLOTS.map((s) => (
          <span className="heatmap-axis" key={s}>
            {s}
          </span>
        ))}
        {DAYS.map((day, r) => (
          <div className="heatmap-row" key={day}>
            <span className="heatmap-axis heatmap-day">{day}</span>
            {VALUES[r].map((v, c) => (
              <span
                key={c}
                className="heatmap-cell"
                style={{ background: binColor(v) }}
                tabIndex={0}
                aria-label={`${day} ${SLOTS[c]}: ${v} bookings`}
                onMouseEnter={(e) => show(e, day, SLOTS[c], v)}
                onFocus={(e) => show(e, day, SLOTS[c], v)}
                onMouseLeave={() => setTip(null)}
                onBlur={() => setTip(null)}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="heatmap-scale" aria-hidden="true">
        <span>Fewer</span>
        {RAMP.map((c) => (
          <i key={c} style={{ background: c }} />
        ))}
        <span>More</span>
      </div>

      {tip && (
        <div className="chart-tip" style={{ left: tip.x, top: tip.y }}>
          <strong>{tip.value}</strong>
          <span>{tip.text}</span>
        </div>
      )}
    </div>
  );
}
