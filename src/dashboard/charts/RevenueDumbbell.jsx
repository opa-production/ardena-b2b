import { useState } from "react";

/* Revenue by vehicle class, last month → this month, dumbbell chart:
   one hue, two shades (light = last month, solid = this month). KES '000. */

const DATA = [
  { name: "SUV", prev: 142, curr: 196 },
  { name: "Saloon", prev: 94, curr: 85 },
  { name: "Van", prev: 70, curr: 64 },
  { name: "Pickup", prev: 48, curr: 44 },
  { name: "Hatchback", prev: 26, curr: 31 },
];

const W = 460;
const H = 250;
const TOP = 38;
const BOTTOM = 30;
const LEFT = 84;
const RIGHT = 84;
const MAX = 210;
const TICKS = [0, 50, 100, 150, 200];

const x = (v) => LEFT + (v / MAX) * (W - LEFT - RIGHT);
const rowY = (i) => TOP + ((i + 0.5) * (H - TOP - BOTTOM)) / DATA.length;
const fmt = (v) => `${v}K`;

export default function RevenueDumbbell() {
  const [tip, setTip] = useState(null);

  function show(e, d) {
    const card = e.currentTarget.closest(".chart-card").getBoundingClientRect();
    setTip({
      x: e.clientX - card.left,
      y: e.clientY - card.top - 12,
      name: d.name,
      value: `${fmt(d.prev)} → ${fmt(d.curr)}`,
    });
  }

  return (
    <div className="dumbbell">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Revenue by vehicle class, last month versus this month, in thousands of shillings"
      >
        {/* legend */}
        <g className="db-legend">
          <circle cx={W - 168} cy={16} r="4.5" className="db-dot prev" />
          <text x={W - 158} y={20}>Last month</text>
          <circle cx={W - 78} cy={16} r="4.5" className="db-dot curr" />
          <text x={W - 68} y={20}>This month</text>
        </g>

        {/* recessive grid + ticks */}
        {TICKS.map((t) => (
          <g key={t}>
            <line
              className="db-grid"
              x1={x(t)}
              y1={TOP}
              x2={x(t)}
              y2={H - BOTTOM}
            />
            <text className="db-tick" x={x(t)} y={H - 10} textAnchor="middle">
              {t === 0 ? "0" : `${t}K`}
            </text>
          </g>
        ))}

        {DATA.map((d, i) => {
          const y = rowY(i);
          const pct = Math.round(((d.curr - d.prev) / d.prev) * 100);
          const up = pct >= 0;
          return (
            <g key={d.name}>
              <text className="db-label" x={LEFT - 14} y={y + 4} textAnchor="end">
                {d.name}
              </text>

              <line
                className="db-track"
                x1={x(d.prev)}
                y1={y}
                x2={x(d.curr)}
                y2={y}
              />
              <circle className="db-dot prev" cx={x(d.prev)} cy={y} r="5" />
              <circle className="db-dot curr" cx={x(d.curr)} cy={y} r="5.5" />

              <text className="db-value" x={W - RIGHT + 16} y={y + 4}>
                {fmt(d.curr)}
                <tspan className={up ? "db-delta up" : "db-delta down"}>
                  {"  "}
                  {up ? "▲" : "▼"}{Math.abs(pct)}%
                </tspan>
              </text>

              {/* row-wide invisible hit target */}
              <rect
                x={LEFT}
                y={y - 14}
                width={W - LEFT - RIGHT}
                height="28"
                fill="transparent"
                onMouseMove={(e) => show(e, d)}
                onMouseLeave={() => setTip(null)}
              />
            </g>
          );
        })}
      </svg>

      {tip && (
        <div className="chart-tip" style={{ left: tip.x, top: tip.y }}>
          <strong>{tip.value}</strong>
          <span>{tip.name}</span>
        </div>
      )}
    </div>
  );
}
