/* Plain horizontal bars, one row per item, the value written out in full next
 * to each bar. Replaced the booking heatmap and the ranked bars with a
 * last-month marker: both asked the reader to learn a convention (a colour
 * ramp, a tick behind the bar end) before the card told them anything.
 *
 * Here the answer is spelled out in a sentence above the bars, the biggest
 * row wears the brand colour and the rest recede, so the chart only has to
 * back up what the sentence already says.
 *
 * rows: [{ label, value, sub? }]
 */

export default function SimpleBars({ rows = [], format = String, takeaway }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  const top = rows.reduce((best, r) => (r.value > best ? r.value : best), 0);

  return (
    <div className="sb">
      {takeaway && <p className="sb-takeaway">{takeaway}</p>}
      <ul className="sb-rows">
        {rows.map((r) => (
          <li className="sb-row" key={r.label}>
            <span className="sb-label" title={r.label}>
              {r.label}
              {r.sub && <small>{r.sub}</small>}
            </span>
            <span className="sb-track" aria-hidden="true">
              <span
                className={"sb-fill" + (top > 0 && r.value === top ? " top" : "")}
                style={{ width: `${(r.value / max) * 100}%` }}
              />
            </span>
            <span className="sb-value">{format(r.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
