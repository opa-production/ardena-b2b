import { useState } from "react";

/* Wallet spend over the selected window, as one smooth line with the window
 * before it drawn behind in a dotted grey.
 *
 * This replaced a column-per-day bar chart. Bars answered "what did I spend on
 * the 14th?", which nobody asks; the shape of the run and whether it is
 * climbing is the actual question, and a line says that in one glance. The
 * comparison series is what turns the big number above the chart into a
 * judgement — 486 GB means nothing, "486 GB, up 14%" means something.
 *
 * Both series are passed already aligned: `data[i]` and `prev[i]` are the same
 * offset into their respective windows, so the dotted line sits under its own
 * counterpart day.
 *
 * `data`: [{ date: ISO day, label: axis label, value: KES, checks }]
 * `prev`: the same shape, one window earlier, or [] for no comparison.
 */

const W = 720;
const H = 260;
const TOP = 20;
const BOTTOM = 30;
const LEFT = 46;
const RIGHT = 16;

const plotW = W - LEFT - RIGHT;
const plotH = H - TOP - BOTTOM;

/* Axis ceiling rounded up to a 1 / 2 / 5 × 10ⁿ step, so the gridlines land on
   numbers a person would pick themselves. */
function niceMax(v) {
  if (v <= 0) return 10;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

const fmtTick = (v) =>
  v === 0 ? "0" : v >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v));

/* Catmull-Rom through the points, converted to cubic béziers. The reference is
   a soft curve, not a polyline, and the tension is kept low so the line never
   overshoots into a dip the data doesn't have. */
function smoothPath(pts) {
  if (pts.length === 0) return "";
  if (pts.length < 3) return pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

const fmtKES = (n) => Number(n || 0).toLocaleString("en-KE");

function fmtFull(iso) {
  const d = new Date(iso);
  return isNaN(d) ? iso : d.toLocaleDateString("en-KE", { dateStyle: "medium" });
}

export default function UsageTrend({ data = [], prev = [], label = "Wallet spend" }) {
  const [hover, setHover] = useState(null);

  if (data.length === 0) return null;

  const max = niceMax(Math.max(...data.map((d) => d.value), ...prev.map((d) => d.value), 0));
  const x = (i) => LEFT + (i * plotW) / Math.max(data.length - 1, 1);
  const y = (v) => TOP + plotH - (v / max) * plotH;
  const ticks = [0, max / 4, max / 2, (max * 3) / 4, max];

  const pts = data.map((d, i) => [x(i), y(d.value)]);
  const line = smoothPath(pts);
  const area = line
    ? `${line} L${x(data.length - 1)},${TOP + plotH} L${x(0)},${TOP + plotH} Z`
    : "";
  const prevLine = smoothPath(prev.slice(0, data.length).map((d, i) => [x(i), y(d.value)]));

  // Label at most six dates, always including the first and last, so the axis
  // stays readable whether the window is 7 days or 90.
  const step = Math.max(1, Math.ceil(data.length / 6));
  const showLabel = (i) => i === 0 || i === data.length - 1 || i % step === 0;

  function onMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.max(
      0,
      Math.min(data.length - 1, Math.round(((px - LEFT) / plotW) * (data.length - 1)))
    );
    setHover(i);
  }

  return (
    <div className="ut-chart usage-trend">
      {prev.length > 0 && (
        <div className="ut-legend">
          <span className="ut-key">This period</span>
          <span className="ut-key is-prev">Previous period</span>
        </div>
      )}

      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${label} over the last ${data.length} days, in shillings`}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line className="ut-grid" x1={LEFT} y1={y(t)} x2={W - RIGHT} y2={y(t)} />
            <text className="ut-tick" x={LEFT - 10} y={y(t) + 3.5} textAnchor="end">
              {fmtTick(t)}
            </text>
          </g>
        ))}

        {data.map((d, i) =>
          showLabel(i) ? (
            <text key={d.date} className="ut-tick" x={x(i)} y={H - 10} textAnchor="middle">
              {d.label}
            </text>
          ) : null
        )}

        {area && <path className="ut-area" d={area} />}
        {prevLine && <path className="ut-line is-prev" d={prevLine} />}
        {line && <path className="ut-line" d={line} />}

        {hover != null && (
          <>
            <line className="ut-cross" x1={x(hover)} y1={TOP} x2={x(hover)} y2={TOP + plotH} />
            {prev[hover] && (
              <circle className="ut-dot is-prev" cx={x(hover)} cy={y(prev[hover].value)} r="4" />
            )}
            <circle className="ut-dot" cx={x(hover)} cy={y(data[hover].value)} r="5" />
          </>
        )}
      </svg>

      {/* Pinned under the cursor's column rather than floating over the line:
          the reference card carries both series' figures at once, and a card
          that follows the line vertically covers the very shape being read. */}
      {hover != null && (
        <div
          className="chart-tip usage-tip"
          style={{ left: `${(x(hover) / W) * 100}%`, top: 8 }}
        >
          <strong>KES {fmtKES(data[hover].value)}</strong>
          <span>{fmtFull(data[hover].date)}</span>
          {prev[hover] && (
            <span className="usage-tip-prev">
              KES {fmtKES(prev[hover].value)} · {fmtFull(prev[hover].date)}
            </span>
          )}
        </div>
      )}

      {/* The exact figures, for screen readers. The wrapper carries .sr-only,
          not the table: CSS treats `height` on a table as a minimum, so a bare
          .sr-only table ignores its 1px cap and drags empty scroll onto the
          page. A div honours the cap and clips it. */}
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
