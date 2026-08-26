import { useState } from "react";

/* Daily usage as vertical bars — one bar per day of the billing period.
 *
 * Single series, so there is no legend: the card title names it. Colour is the
 * one validated single-series fill (--usage-bar); everything else — ticks and
 * labels — wears ink tokens, never the series colour.
 *
 * There is no tooltip. Hovering a column simply flips that bar to a sharply
 * different colour (--usage-bar-hot), which is enough to pick a day out of the
 * run without a card covering the bars behind it. The exact figures are in the
 * screen-reader table at the foot, which is the honest place for them.
 *
 * Bars are anchored to the baseline with rounded tops only, separated by a 2px
 * surface gap, over recessive gridlines. Each bar carries a full-height
 * invisible hit rect so the hover target is the whole column, not the 8px of
 * bar a quiet day actually draws. */

const W = 680;
const H = 240;
const TOP = 18;
const BOTTOM = 30;
const LEFT = 46;
const RIGHT = 10;
const GAP = 2; // surface gap between adjacent bars
const RADIUS = 4; // rounded data-end

/* Round the axis ceiling up to a 1 / 2 / 5 × 10ⁿ step so the gridlines land on
   numbers a person would actually pick. */
function niceMax(v) {
  if (v <= 0) return 10;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

/* A bar with square feet on the baseline and rounded shoulders. */
function barPath(x, y, w, h) {
  const r = Math.min(RADIUS, w / 2, h);
  if (h <= 0) return "";
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
}

const fmtKES = (n) => Number(n || 0).toLocaleString("en-KE");

function fmtFull(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-KE", { dateStyle: "medium" });
}

/* `data`: [{ date: ISO day, day: number shown on the axis, value: KES, checks }] */
export default function UsageBars({ data = [], label = "Spent" }) {
  const [hover, setHover] = useState(null);

  if (data.length === 0) return null;

  const plotW = W - LEFT - RIGHT;
  const plotH = H - TOP - BOTTOM;
  const slot = plotW / data.length;
  const barW = Math.max(2, slot - GAP);

  const max = niceMax(Math.max(...data.map((d) => d.value)));
  const y = (v) => TOP + plotH - (v / max) * plotH;
  const ticks = [0, max / 4, max / 2, (max * 3) / 4, max];

  // label every 5th day, and always the first — the reference cadence
  const showDay = (i) => i === 0 || (i + 1) % 5 === 0;

  return (
    <div className="ub-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${label} per day over ${data.length} days, in shillings`}
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line className="ub-grid" x1={LEFT} y1={y(t)} x2={W - RIGHT} y2={y(t)} />
            <text className="ub-tick" x={LEFT - 10} y={y(t) + 3.5} textAnchor="end">
              {t >= 1000 ? `${t / 1000}k` : Math.round(t)}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const bx = LEFT + i * slot;
          const by = y(d.value);
          const bh = TOP + plotH - by;
          return (
            <g key={d.date}>
              {/* a day with no usage draws no bar at all, like the gaps in the
                  reference — but it keeps its hit rect below, so hovering the
                  empty column still explains that the day was zero */}
              {bh > 0 && (
                <path
                  className={"ub-bar" + (hover === i ? " is-hot" : "")}
                  d={barPath(bx, by, barW, bh)}
                />
              )}
              {/* hit target: the whole column, so a near-zero day is still hoverable */}
              <rect
                className="ub-hit"
                x={bx - GAP / 2}
                y={TOP}
                width={slot}
                height={plotH}
                onMouseEnter={() => setHover(i)}
              />
              {showDay(i) && (
                <text className="ub-tick" x={bx + barW / 2} y={H - 10} textAnchor="middle">
                  {d.day}
                </text>
              )}
            </g>
          );
        })}

        <line className="ub-axis" x1={LEFT} y1={TOP + plotH} x2={W - RIGHT} y2={TOP + plotH} />
      </svg>

      {/* The same numbers as a table — for screen readers, and the only place
          the exact figures are written out now that there is no tooltip.
          The wrapper carries .sr-only, not the table: CSS treats `height` on a
          table as a minimum, so a bare .sr-only table ignores its 1px cap,
          grows to its real height and — being absolutely positioned inside a
          visible-overflow parent — drags hundreds of pixels of empty scroll
          onto the page. A div honours the cap and clips it. */}
      <div className="sr-only">
        <table>
          <caption>{label} per day</caption>
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col">Amount (KES)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.date}>
                <th scope="row">{fmtFull(d.date)}</th>
                <td>{fmtKES(d.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
