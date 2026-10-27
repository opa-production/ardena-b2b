/* Morning, afternoon and evening as three tiles, each with a picture of the
 * sky, the number of bookings in large type and its share of the total. No
 * axis to read: the busiest part of the day is outlined in the brand colour.
 *
 * rows: [{ label: "Morning", sub: "6am to 12pm", value: 4 }]
 */

const SKY = {
  Morning: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 18a5 5 0 00-10 0M12 2v7M4.2 10.2l1.4 1.4M1 18h2M21 18h2M18.4 11.6l1.4-1.4M23 22H1M8 6l4-4 4 4" />
    </svg>
  ),
  Afternoon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </svg>
  ),
  Evening: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
    </svg>
  ),
};

export default function DayPartTiles({ rows = [] }) {
  const total = rows.reduce((n, r) => n + r.value, 0);
  const top = Math.max(...rows.map((r) => r.value), 0);

  return (
    <ul className="dp">
      {rows.map((r) => {
        const share = total > 0 ? Math.round((r.value / total) * 100) : 0;
        return (
          <li className={"dp-tile" + (top > 0 && r.value === top ? " top" : "")} key={r.label}>
            <span className="dp-sky">{SKY[r.label]}</span>
            <span className="dp-name">{r.label}</span>
            <span className="dp-hours">{r.sub}</span>
            <span className="dp-count">{r.value}</span>
            <span className="dp-share">
              booking{r.value === 1 ? "" : "s"} · {share}%
            </span>
          </li>
        );
      })}
    </ul>
  );
}
