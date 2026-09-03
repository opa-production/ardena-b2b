import { useEffect, useRef, useState } from "react";
import "./dropdown.css";

/* Custom select: inset trigger like the other inputs, floating option
   panel with a check on the selected row. A hidden input carries the
   value so FormData-based forms keep working.

   `ariaLabel` is for the places where the visible label is a plain <span>
   rather than a <label> — a <label> cannot name a button, so the trigger has
   to carry the name itself. */
export default function Dropdown({
  id,
  name,
  value,
  onChange,
  options,
  placeholder = "Select",
  ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const opts = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o
  );
  const selected = opts.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (!ref.current?.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={"dd" + (open ? " open" : "")} ref={ref}>
      {name && <input type="hidden" name={name} value={value ?? ""} />}
      <button
        type="button"
        id={id}
        className="dd-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {selected ? (
          <span className="dd-value">{selected.label}</span>
        ) : (
          <span className="dd-placeholder">{placeholder}</span>
        )}
        <svg className="dd-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="dd-panel" role="listbox" aria-labelledby={id}>
          {opts.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              className={"dd-option" + (o.value === value ? " selected" : "")}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              <span>{o.label}</span>
              {o.value === value && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
