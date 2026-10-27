import { useEffect, useRef, useState } from "react";
import "./daterange.css";

/* Single-date picker: same look as the range picker, one month, popover.
   A hidden input carries the ISO value for FormData forms. */

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const pad = (n) => String(n).padStart(2, "0");
const toISO = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

const fmt = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export default function DatePicker({
  id,
  name,
  value,
  onChange,
  minDate,
  placeholder = "Pick a date",
  isDisabled = () => false,
  disabled: triggerDisabled = false,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const base = value ? new Date(`${value}T00:00:00`) : new Date();
  const [view, setView] = useState({ y: base.getFullYear(), m: base.getMonth() });

  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (!ref.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function shift(delta) {
    setView(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  const lead = new Date(view.y, view.m, 1).getDay();
  const days = new Date(view.y, view.m + 1, 0).getDate();

  return (
    <div className="drp-field" ref={ref}>
      {name && <input type="hidden" name={name} value={value || ""} />}
      <button
        type="button"
        id={id}
        className={"drp-trigger" + (open ? " open" : "")}
        onClick={() => setOpen((o) => !o)}
        disabled={triggerDisabled}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M8 2v4M16 2v4M3 9h18" />
        </svg>
        {value ? fmt(value) : <span className="placeholder">{placeholder}</span>}
      </button>

      {open && (
        <div className="drp-pop dp-pop">
          <div className="drp dp-single">
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
            <div className="drp-month">
              <p className="drp-title">
                {MONTHS[view.m]} {view.y}
              </p>
              <div className="drp-grid">
                {WEEKDAYS.map((w, i) => (
                  <span className="drp-weekday" key={`${w}-${i}`}>
                    {w}
                  </span>
                ))}
                {Array.from({ length: lead }, (_, i) => (
                  <span key={`b-${i}`} />
                ))}
                {Array.from({ length: days }, (_, i) => {
                  const d = i + 1;
                  const iso = toISO(view.y, view.m, d);
                  const disabled = (minDate && iso < minDate) || isDisabled(iso);
                  return (
                    <button
                      key={iso}
                      type="button"
                      className={
                        "drp-day" +
                        (iso === value ? " start end" : "") +
                        (disabled ? " disabled" : "")
                      }
                      disabled={disabled}
                      onClick={() => {
                        onChange(iso);
                        setOpen(false);
                      }}
                    >
                      <span className="drp-num">{d}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
