/* The "By the day / By the hour" switch and the hours stepper, shared by
   New booking and the Edit booking dialog. Styles live in bookings.css. */

const QUICK_HOURS = [4, 8, 12];
const MIN_HOURS = 1;
const MAX_HOURS = 72;

const UNITS = [
  {
    value: "day",
    label: "By the day",
    icon: (
      <>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M8 2v4M16 2v4M3 9h18" />
      </>
    ),
  },
  {
    value: "hour",
    label: "By the hour",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  },
];

export function UnitToggle({ value, onChange, disabled, labelledBy }) {
  return (
    <div className={"unit-toggle" + (value === "hour" ? " is-hour" : "")} role="group" aria-labelledby={labelledBy}>
      <span className="unit-thumb" aria-hidden="true" />
      {UNITS.map((u) => (
        <button
          type="button"
          key={u.value}
          className={value === u.value ? "active" : ""}
          aria-pressed={value === u.value}
          disabled={disabled}
          onClick={() => onChange(u.value)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {u.icon}
          </svg>
          {u.label}
        </button>
      ))}
    </div>
  );
}

export function HoursStepper({ id, value, onChange }) {
  const n = Number(value);
  const step = (d) => {
    const base = Number.isFinite(n) && n > 0 ? n : 0;
    onChange(String(Math.min(MAX_HOURS, Math.max(MIN_HOURS, base + d))));
  };

  return (
    <div className="hours-picker">
      <div className="hours-stepper">
        <button type="button" onClick={() => step(-1)} disabled={n <= MIN_HOURS} aria-label="One hour less">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M5 12h14" />
          </svg>
        </button>
        <label className="hours-value">
          <input
            id={id}
            type="number"
            inputMode="numeric"
            min={MIN_HOURS}
            max={MAX_HOURS}
            step="1"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required
          />
          <span>{n === 1 ? "hour" : "hours"}</span>
        </label>
        <button type="button" onClick={() => step(1)} disabled={n >= MAX_HOURS} aria-label="One hour more">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
      <div className="hours-chips" role="group" aria-label="Quick picks">
        {QUICK_HOURS.map((h) => (
          <button
            type="button"
            key={h}
            className={n === h ? "active" : ""}
            aria-pressed={n === h}
            onClick={() => onChange(String(h))}
          >
            {h}h
          </button>
        ))}
      </div>
    </div>
  );
}
