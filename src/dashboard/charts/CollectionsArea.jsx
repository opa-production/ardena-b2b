import { useState } from "react";

/* Cash collected per week — last 10 weeks.
   data: [{ week: "4 May", value: 78000 }]  (values in full KES) */

const W = 680;
const H = 260;
const TOP = 26;
const BOTTOM = 32;
const LEFT = 52;
const RIGHT = 44;

const plotW = W - LEFT - RIGHT;
const plotH = H - TOP - BOTTOM;

function niceMax(max) {
  if (max === 0) return 5000;
  const mag = Math.pow(10, Math.floor(Math.log10(max)));
  const norm = max / mag;
  const ceil = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return ceil * mag;
}

function niceTicks(max) {
  const step = max / 4;
  return [0, step, step * 2, step * 3, max];
}

function fmtTick(v) {
  if (v === 0) return "0";
  if (v >= 1_000_000) return `${Math.round(v / 1_000_000)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}K`;
  return String(v);
}

export default function CollectionsArea({ data = [] }) {
  const [hover, setHover] = useState(null);

  const maxVal = niceMax(Math.max(...data.map((d) => d.value), 0));
  const ticks = niceTicks(maxVal);

  const x = (i) => LEFT + (i * plotW) / Math.max(data.length - 1, 1);
  const y = (v) => TOP + plotH - (v / maxVal) * plotH;

  const linePath = data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.value)}`).join(" ");
  const areaPath = data.length
    ? `${linePath} L${x(data.length - 1)},${TOP + plotH} L${x(0)},${TOP + plotH} Z`
    : "";

  function onMove(e) {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.max(0, Math.min(data.length - 1, Math.round(((px - LEFT) / plotW) * (data.length - 1))));
    const card = svg.closest(".chart-card").getBoundingClientRect();
    const cx = (x(i) / W) * rect.width + rect.left - card.left;
    const cy = (y(data[i].value) / H) * rect.height + rect.top - card.top;
    setHover({ i, tipX: cx, tipY: cy - 14 });
  }

  const last = data.length - 1;

  return (
    <div className="ut-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Cash collected per week over the last 10 weeks"
        onMouseMove={data.length ? onMove : undefined}
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line className="ut-grid" x1={LEFT} y1={y(t)} x2={W - RIGHT} y2={y(t)} />
            <text className="ut-tick" x={LEFT - 8} y={y(t) + 3.5} textAnchor="end">
              {fmtTick(t)}
            </text>
          </g>
        ))}

        {data.map((d, i) =>
          i % 2 === 0 ? (
            <text key={d.week} className="ut-tick" x={x(i)} y={H - 10} textAnchor="middle">
              {d.week}
            </text>
          ) : null
        )}

        {areaPath && <path className="ut-area" d={areaPath} />}
        {linePath && <path className="ut-line" d={linePath} />}

        {data.length > 0 && (
          <>
            <circle className="ut-dot" cx={x(last)} cy={y(data[last].value)} r="4.5" />
            {data[last].value > 0 && (
              <text className="ut-value" x={x(last) + 10} y={y(data[last].value) + 4}>
                {fmtTick(data[last].value)}
              </text>
            )}
          </>
        )}

        {hover && (
          <>
            <line className="ut-cross" x1={x(hover.i)} y1={TOP} x2={x(hover.i)} y2={TOP + plotH} />
            <circle className="ut-dot" cx={x(hover.i)} cy={y(data[hover.i].value)} r="5.5" />
          </>
        )}
      </svg>

      {hover && (
        <div className="chart-tip" style={{ left: hover.tipX, top: hover.tipY }}>
          <strong>KES {data[hover.i].value.toLocaleString("en-KE")}</strong>
          <span>Week of {data[hover.i].week}</span>
        </div>
      )}
    </div>
  );
}
