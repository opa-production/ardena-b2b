/* Bookings per day of the week as upright columns, Monday to Sunday, the
 * count printed on top of each one. Columns read as a week the way a
 * calendar does, which keeps this card from looking like the ranked
 * vehicle bars beside it. The busiest day wears the brand colour.
 *
 * rows: [{ label: "Monday", value: 3 }]
 */

export default function DayColumns({ rows = [] }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  const top = Math.max(...rows.map((r) => r.value), 0);

  return (
    <div className="dc">
      <ol className="dc-cols">
        {rows.map((r) => (
          <li className="dc-col" key={r.label}>
            <span className="dc-count">{r.value}</span>
            <span className="dc-well" aria-hidden="true">
              <span
                className={"dc-bar" + (top > 0 && r.value === top ? " top" : "")}
                style={{ height: `${(r.value / max) * 100}%` }}
              />
            </span>
            <span className="dc-day" title={r.label}>{r.label.slice(0, 3)}</span>
            <span className="sr-only">
              {r.label}: {r.value} booking{r.value === 1 ? "" : "s"}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
