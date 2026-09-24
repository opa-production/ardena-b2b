/* Tap-to-pick features and rules for the marketplace listing.

   Typing a comma-separated list was slow and every business spelled the same
   feature differently. The common ones are now tiles and chips; anything else
   still goes in free text, so nothing a business already wrote is lost — on
   load, stored values that don't match a preset land in the free-text box. */

const I = (d) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);

export const FEATURE_OPTIONS = [
  { label: "Air conditioning", icon: I(<path d="M12 2v20M4.9 4.9l14.2 14.2M2 12h20M4.9 19.1L19.1 4.9M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5" />) },
  { label: "Bluetooth", icon: I(<path d="M7 7l10 10-5 5V2l5 5L7 17" />) },
  { label: "GPS navigation", icon: I(<><path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>) },
  { label: "Reverse camera", icon: I(<><path d="M3 8h4l2-3h6l2 3h4v12H3z" /><circle cx="12" cy="13.5" r="3.5" /></>) },
  { label: "Parking sensors", icon: I(<><rect x="4" y="4" width="16" height="16" /><path d="M10 17V8h3a2.5 2.5 0 010 5h-3" /></>) },
  { label: "USB charging", icon: I(<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />) },
  { label: "Apple CarPlay / Android Auto", icon: I(<><rect x="7" y="2" width="10" height="20" /><path d="M11 18h2" /></>) },
  { label: "Cruise control", icon: I(<><path d="M4 17a8 8 0 1116 0" /><path d="M12 17l4-5" /></>) },
  { label: "Sunroof", icon: I(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>) },
  { label: "Child seat", icon: I(<><circle cx="12" cy="7" r="4" /><path d="M5 21a7 7 0 0114 0" /></>) },
  { label: "Roof rack", icon: I(<path d="M3 18h18M5 18l2-6h10l2 6M4 7h16M8 7v5M16 7v5" />) },
  { label: "4x4 / AWD", icon: I(<path d="M2 20l6-11 4 6 3-4 7 9z" />) },
  { label: "Keyless entry", icon: I(<><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M17 6l3 3M14.5 8.5l2 2" /></>) },
  { label: "Leather seats", icon: I(<><path d="M8 3h6a2 2 0 012 2v9H8z" /><path d="M5 14h14v4H5zM7 18v3M17 18v3" /></>) },
];

const OTHER_ICON = I(<path d="M12 5v14M5 12h14" />);

export const RULE_OPTIONS = [
  "No smoking inside the vehicle",
  "No pets",
  "No off-road driving",
  "Return with the same fuel level",
  "Valid driving licence required at pickup",
  "National ID or passport required",
  "Only the named driver may drive",
  "No ride-hailing (Uber, Bolt) use",
  "No driving outside Kenya without approval",
  "Late returns are charged per hour",
  "Return the car clean, or a cleaning fee applies",
  "Report any accident or damage immediately",
];

const norm = (s) => s.trim().toLowerCase();

/* Stored features array → { picked: preset labels, other: "a, b" }. */
export function splitFeatures(list) {
  const presets = new Map(FEATURE_OPTIONS.map((f) => [norm(f.label), f.label]));
  const picked = [];
  const other = [];
  for (const f of list || []) {
    const hit = presets.get(norm(f));
    if (hit) picked.push(hit);
    else if (f.trim()) other.push(f.trim());
  }
  return { picked, other: other.join(", ") };
}

/* Stored rules text → { picked: preset rules, custom: remaining lines }. */
export function splitRules(text) {
  const presets = new Map(RULE_OPTIONS.map((r) => [norm(r), r]));
  const picked = [];
  const custom = [];
  for (const raw of (text || "").split("\n")) {
    const line = raw.replace(/^[•\-*]\s*/, "").trim();
    if (!line) continue;
    const hit = presets.get(norm(line));
    if (hit) picked.push(hit);
    else custom.push(line);
  }
  return { picked, custom: custom.join("\n") };
}

/* One rule per line: readable in the app and splittable back on load. */
export function joinRules(picked, custom) {
  const ordered = RULE_OPTIONS.filter((r) => picked.includes(r));
  const extra = (custom || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const all = [...ordered, ...extra];
  return all.length ? all.join("\n") : "";
}

function toggle(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function FeaturePicker({ picked, onPicked, other, onOther, otherOpen, onOtherOpen, total, max }) {
  const full = total >= max;
  return (
    <div className="feat-picker">
      <div className="feat-grid" role="group" aria-label="Features">
        {FEATURE_OPTIONS.map((f) => {
          const on = picked.includes(f.label);
          return (
            <button
              key={f.label}
              type="button"
              className={`feat-tile${on ? " is-on" : ""}`}
              aria-pressed={on}
              disabled={!on && full}
              onClick={() => onPicked(toggle(picked, f.label))}
            >
              <span className="feat-check" aria-hidden="true" />
              <span className="feat-icon">{f.icon}</span>
              <span className="feat-label">{f.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          className={`feat-tile feat-other${otherOpen ? " is-on" : ""}`}
          aria-pressed={otherOpen}
          aria-controls="mkt-features-other"
          onClick={() => onOtherOpen(!otherOpen)}
        >
          <span className="feat-check" aria-hidden="true" />
          <span className="feat-icon">{OTHER_ICON}</span>
          <span className="feat-label">Other</span>
        </button>
      </div>
      {otherOpen && (
        <input
          id="mkt-features-other"
          className="feat-other-input"
          type="text"
          autoFocus
          placeholder="Anything else, separated by commas: Dashcam, Tinted windows"
          value={other}
          onChange={(e) => onOther(e.target.value)}
          aria-label="Other features"
        />
      )}
    </div>
  );
}

export function RulePicker({ picked, onPicked }) {
  return (
    <div className="rule-chips" role="group" aria-label="Common rental rules">
      {RULE_OPTIONS.map((r) => {
        const on = picked.includes(r);
        return (
          <button
            key={r}
            type="button"
            className={`rule-chip${on ? " is-on" : ""}`}
            aria-pressed={on}
            onClick={() => onPicked(toggle(picked, r))}
          >
            <span className="rule-mark" aria-hidden="true">{on ? "✓" : "+"}</span>
            {r}
          </button>
        );
      })}
    </div>
  );
}
