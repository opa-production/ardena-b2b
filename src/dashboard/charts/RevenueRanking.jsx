import { useState } from "react";

/* Top earning vehicles — ranked bars, this month, with last month marked.
 *
 * This replaced a dumbbell chart. A dumbbell is the textbook form for
 * before → after per item, but it only works for readers who already know the
 * convention: two dots and a connecting line mean nothing on their own, and
 * the thing everyone actually wants from this card — "which cars make me the
 * most money" — was encoded as dot *position*, the hardest channel to read.
 *
 * Bar length is the one encoding nobody has to be taught, so this month is the
 * bar and the ranking is the sort. Last month stays on the same row as a thin
 * marker, so the before → after comparison survives: marker behind the bar end
 * means growth, marker ahead of it means the vehicle fell. The percentage is
 * spelled out either way, with an arrow, so the direction never rests on colour
 * alone.
 *
 * Colours are validated (see the dataviz palette checks): one hue for the bars,
 * and a green/orange status pair that clears CVD separation — a red/green pair
 * does not.
 */

const fmtK = (v) =>
  v >= 1000 ? `${Math.round(v / 1000)}K` : String(Math.round(v));

const fmtFull = (v) => v.toLocaleString("en-KE");

export default function RevenueRanking({ data = [] }) {
  const [tip, setTip] = useState(null);

  // One shared scale so bar lengths are comparable down the column. The
  // marker can sit past the bar when a vehicle declined, so it counts too.
  const max = Math.max(...data.flatMap((d) => [d.prev, d.curr]), 1);
  const pct = (v) => `${(v / max) * 100}%`;

  function show(e, d) {
    const card = e.currentTarget.closest(".chart-card")?.getBoundingClientRect();
    if (!card) return;
    setTip({
      x: e.clientX - card.left,
      y: e.clientY - card.top - 12,
      name: d.name,
      plate: d.plate,
      prev: d.prev,
      curr: d.curr,
    });
  }

  return (
    <div className="rr">
      {/* Two things are plotted, so identity never rests on colour alone. */}
      <div className="rr-legend">
        <span className="rr-key">
          <i className="rr-key-bar" aria-hidden="true" />
          This month
        </span>
        <span className="rr-key">
          <i className="rr-key-mark" aria-hidden="true" />
          Last month
        </span>
      </div>

      <ol className="rr-rows">
        {data.map((d, i) => {
          const delta = d.prev > 0 ? Math.round(((d.curr - d.prev) / d.prev) * 100) : 0;
          const up = delta >= 0;
          return (
            <li
              className="rr-row"
              key={d.plate || d.name}
              onMouseMove={(e) => show(e, d)}
              onMouseLeave={() => setTip(null)}
            >
              <div className="rr-head">
                <span className="rr-rank">{String(i + 1).padStart(2, "0")}</span>
                <span className="rr-name" title={d.name}>
                  {d.name}
                </span>
                <span className="rr-value">KES {fmtK(d.curr)}</span>
                <span className={`rr-delta ${up ? "up" : "down"}`}>
                  <span aria-hidden="true">{up ? "▲" : "▼"}</span>
                  {Math.abs(delta)}%
                </span>
              </div>

              <div className="rr-track">
                <div className="rr-fill" style={{ width: pct(d.curr) }} />
                {/* last month, on the same scale — behind the bar end means
                    it grew, ahead of it means it fell */}
                <div
                  className="rr-mark"
                  style={{ left: pct(d.prev) }}
                  aria-hidden="true"
                />
              </div>

              <span className="sr-only">
                {d.name}: KES {fmtFull(d.curr)} this month, KES{" "}
                {fmtFull(d.prev)} last month, {up ? "up" : "down"}{" "}
                {Math.abs(delta)} percent.
              </span>
            </li>
          );
        })}
      </ol>

      {tip && (
        <div className="chart-tip rr-tip" style={{ left: tip.x, top: tip.y }}>
          <strong>KES {fmtFull(tip.curr)}</strong>
          <span>
            {tip.plate ? `${tip.plate} · ` : ""}was KES {fmtFull(tip.prev)}
          </span>
        </div>
      )}
    </div>
  );
}
