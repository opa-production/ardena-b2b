import Dropdown from "./Dropdown";
import "./filterdropdown.css";

/* A toolbar filter: the custom dropdown, sized for a toolbar, with the filter's
   name shown inside the trigger ("Status · Active"). Replaces the rows of
   segmented buttons that ran every option along one line.

   `options`: strings or { value, label }. */
export default function FilterDropdown({ label, value, onChange, options, id }) {
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <div className="filter-dd">
      <Dropdown
        id={id}
        value={value}
        onChange={onChange}
        ariaLabel={`Filter by ${label.toLowerCase()}`}
        options={opts}
        formatValue={(o) => `${label} · ${o.label}`}
      />
    </div>
  );
}
