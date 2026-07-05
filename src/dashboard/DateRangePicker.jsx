import { useState } from "react";
import "./daterange.css";

/* Airbnb-style dual-month range picker: circled endpoints, shaded span,
   hover preview, disabled (booked/past) dates struck through. */

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const pad = (n) => String(n).padStart(2, "0");
const toISO = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

function monthCells(year, month) {
  const lead = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d++) cells.push(d);
  return cells;
}

export default function DateRangePicker({
  start,
  end,
  onChange,
  minDate,
  isDisabled = () => false,
}) {
  const today = new Date();
  const [view, setView] = useState({
    y: today.getFullYear(),
    m: today.getMonth(),
  });
  const [hover, setHover] = useState(null);

  // while picking the end date, shade up to the hovered day
  const previewEnd = end || (hover && start && hover > start ? hover : null);

  function blocked(iso) {
    return (minDate && iso < minDate) || isDisabled(iso);
  }

  function rangeHasBlocked(a, b) {
    const cur = new Date(`${a}T00:00:00`);
    const stop = new Date(`${b}T00:00:00`);
    while (cur <= stop) {
      const iso = toISO(cur.getFullYear(), cur.getMonth(), cur.getDate());
      if (blocked(iso)) return true;
      cur.setDate(cur.getDate() + 1);
    }
    return false;
  }

  function pick(iso) {
    if (blocked(iso)) return;
    if (!start || end || iso < start) {
      onChange({ start: iso, end: null });
    } else if (iso === start) {
      onChange({ start: null, end: null });
    } else if (rangeHasBlocked(start, iso)) {
      // a booked day sits inside the span; restart from the clicked day
      onChange({ start: iso, end: null });
    } else {
      onChange({ start, end: iso });
    }
  }

  function shift(delta) {
    setView(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  function Month({ y, m }) {
    return (
      <div className="drp-month">
        <p className="drp-title">
          {MONTHS[m]} {y}
        </p>
        <div className="drp-grid">
          {WEEKDAYS.map((w, i) => (
            <span className="drp-weekday" key={`${w}-${i}`}>
              {w}
            </span>
          ))}
          {monthCells(y, m).map((d, i) => {
            if (!d) return <span key={`b-${i}`} />;
            const iso = toISO(y, m, d);
            const isStart = iso === start;
            const isEnd = iso === (end || previewEnd);
            const inRange =
              start && previewEnd && iso > start && iso < previewEnd;
            const cls = [
              "drp-day",
              isStart && "start",
              isEnd && "end",
              isStart && previewEnd && "ranged",
              inRange && "in-range",
              blocked(iso) && "disabled",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <button
                key={iso}
                type="button"
                className={cls}
                disabled={blocked(iso)}
                onClick={() => pick(iso)}
                onMouseEnter={() => setHover(iso)}
                onMouseLeave={() => setHover(null)}
                aria-label={iso}
              >
                <span className="drp-num">{d}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const next = new Date(view.y, view.m + 1, 1);

  return (
    <div className="drp">
      <button type="button" className="drp-nav prev" onClick={() => shift(-1)} aria-label="Previous month">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <button type="button" className="drp-nav next" onClick={() => shift(1)} aria-label="Next month">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
      <div className="drp-months">
        <Month y={view.y} m={view.m} />
        <Month y={next.getFullYear()} m={next.getMonth()} />
      </div>
      <p className="drp-hint">
        {!start
          ? "Pick the pickup date"
          : !end
            ? "Now pick the return date"
            : "Booked and past dates are crossed out"}
      </p>
    </div>
  );
}
