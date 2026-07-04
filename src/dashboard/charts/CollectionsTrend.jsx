import { useState } from "react";

/* Collections per week, last 8 weeks — single-series bar chart in the
   brand hue. KES '000. Static mock until Daraja settlement data lands. */

const DATA = [
  { week: "11 May", value: 86 },
  { week: "18 May", value: 102 },
  { week: "25 May", value: 94 },
  { week: "1 Jun", value: 121 },
  { week: "8 Jun", value: 108 },
  { week: "15 Jun", value: 132 },
  { week: "22 Jun", value: 118 },
  { week: "29 Jun", value: 141 },
];

const W = 460;
const H = 250;
const TOP = 30;
const BOTTOM = 34;
const LEFT = 46;
const RIGHT = 16;
const MAX = 150;
const TICKS = [0, 50, 100, 150];
const BAR_W = 26;

const plotW = W - LEFT - RIGHT;
const plotH = H - TOP - BOTTOM;
const slotX = (i) => LEFT + ((i + 0.5) * plotW) / DATA.length;
const y = (v) => TOP + plotH - (v / MAX) * plotH;

export default function CollectionsTrend() {
  const [tip, setTip] = useState(null);

  function show(e, d) {
    const card = e.currentTarget.closest(".chart-card").getBoundingClientRect();
    setTip({
      x: e.clientX - card.left,
      y: e.clientY - card.top - 12,
      week: `Week of ${d.week}`,
      value: `KES ${d.value},000`,
    });
  }

  const last = DATA.length - 1;

  return (
    <div className="collections-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Collections per week over the last 8 weeks, in thousands of shillings"
      >
        {/* recessive grid + ticks */}
        {TICKS.map((t) => (
          <g key={t}>
            <line className="ct-grid" x1={LEFT} y1={y(t)} x2={W - RIGHT} y2={y(t)} />
            <text className="ct-tick" x={LEFT - 8} y={y(t) + 3.5} textAnchor="end">
              {t === 0 ? "0" : `${t}K`}
            </text>
          </g>
        ))}

        {DATA.map((d, i) => (
          <g key={d.week}>
            <rect
              className="ct-bar"
              x={slotX(i) - BAR_W / 2}
              y={y(d.value)}
              width={BAR_W}
              height={TOP + plotH - y(d.value)}
            />
            {/* direct label on the latest week only */}
            {i === last && (
              <text
                className="ct-value"
                x={slotX(i)}
                y={y(d.value) - 8}
                textAnchor="middle"
              >
                {d.value}K
              </text>
            )}
            <text className="ct-tick" x={slotX(i)} y={H - 12} textAnchor="middle">
              {d.week}
            </text>
            {/* column-wide invisible hit target */}
            <rect
              x={slotX(i) - plotW / DATA.length / 2}
              y={TOP}
              width={plotW / DATA.length}
              height={plotH}
              fill="transparent"
              onMouseMove={(e) => show(e, d)}
              onMouseLeave={() => setTip(null)}
            />
          </g>
        ))}
      </svg>

      {tip && (
        <div className="chart-tip" style={{ left: tip.x, top: tip.y }}>
          <strong>{tip.value}</strong>
          <span>{tip.week}</span>
        </div>
      )}
    </div>
  );
}
