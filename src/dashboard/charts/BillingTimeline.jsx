import { useState } from "react";

/* What you've paid each month, a calm area + line. KES. The last point is
   the current cycle. Static mock until the billing engine drives it. */

const DATA = [
  { month: "Feb", value: 2000 },
  { month: "Mar", value: 2000 },
  { month: "Apr", value: 2000 },
  { month: "May", value: 2200 },
  { month: "Jun", value: 2400 },
  { month: "Jul", value: 2400 },
];

const W = 620;
const H = 220;
const TOP = 24;
const BOTTOM = 34;
const LEFT = 52;
const RIGHT = 46;
const MAX = 3000;
const TICKS = [0, 1000, 2000, 3000];

const plotW = W - LEFT - RIGHT;
const plotH = H - TOP - BOTTOM;
const x = (i) => LEFT + (i * plotW) / (DATA.length - 1);
const y = (v) => TOP + plotH - (v / MAX) * plotH;

const linePath = DATA.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.value)}`).join(" ");
const areaPath = `${linePath} L${x(DATA.length - 1)},${TOP + plotH} L${x(0)},${TOP + plotH} Z`;

const fmtK = (v) => (v === 0 ? "0" : `${v / 1000}K`);

export default function BillingTimeline() {
  const [hover, setHover] = useState(null);

  function onMove(e) {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.max(
      0,
      Math.min(DATA.length - 1, Math.round(((px - LEFT) / plotW) * (DATA.length - 1)))
    );
    const card = svg.closest(".chart-card").getBoundingClientRect();
    const cx = (x(i) / W) * rect.width + rect.left - card.left;
    const cy = (y(DATA[i].value) / H) * rect.height + rect.top - card.top;
    setHover({ i, tipX: cx, tipY: cy - 14 });
  }

  const last = DATA.length - 1;

  return (
    <div className="ut-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Monthly bill over the last six months, in shillings"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {TICKS.map((t) => (
          <g key={t}>
            <line className="ut-grid" x1={LEFT} y1={y(t)} x2={W - RIGHT} y2={y(t)} />
            <text className="ut-tick" x={LEFT - 8} y={y(t) + 3.5} textAnchor="end">
              {fmtK(t)}
            </text>
          </g>
        ))}

        {DATA.map((d, i) => (
          <text key={d.month} className="ut-tick" x={x(i)} y={H - 10} textAnchor="middle">
            {d.month}
          </text>
        ))}

        <path className="ut-area" d={areaPath} />
        <path className="ut-line" d={linePath} />

        <circle className="ut-dot" cx={x(last)} cy={y(DATA[last].value)} r="4.5" />
        <text className="ut-value" x={x(last) + 10} y={y(DATA[last].value) + 4}>
          {(DATA[last].value / 1000).toFixed(1)}K
        </text>

        {hover && (
          <>
            <line className="ut-cross" x1={x(hover.i)} y1={TOP} x2={x(hover.i)} y2={TOP + plotH} />
            <circle className="ut-dot" cx={x(hover.i)} cy={y(DATA[hover.i].value)} r="5.5" />
          </>
        )}
      </svg>

      {hover && (
        <div className="chart-tip" style={{ left: hover.tipX, top: hover.tipY }}>
          <strong>KES {DATA[hover.i].value.toLocaleString("en-KE")}</strong>
          <span>{DATA[hover.i].month} 2026</span>
        </div>
      )}
    </div>
  );
}
