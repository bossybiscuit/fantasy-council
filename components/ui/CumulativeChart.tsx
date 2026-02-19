"use client";

type DataPoint = { episode: number; cumulative: number; label: string };

export default function CumulativeChart({ data }: { data: DataPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-text-muted text-sm">
        No episode data yet
      </div>
    );
  }

  const W = 600;
  const H = 180;
  const PAD = { top: 16, right: 24, bottom: 32, left: 44 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const maxPts = Math.max(...data.map((d) => d.cumulative), 1);
  const minEp = data[0].episode;
  const maxEp = data[data.length - 1].episode;
  const epRange = Math.max(maxEp - minEp, 1);

  const toX = (ep: number) => PAD.left + ((ep - minEp) / epRange) * chartW;
  const toY = (pts: number) => PAD.top + chartH - (pts / maxPts) * chartH;

  const points = data.map((d) => `${toX(d.episode)},${toY(d.cumulative)}`).join(" ");

  // Y-axis ticks
  const yTicks = [0, Math.round(maxPts / 2), maxPts];

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ minWidth: 280 }}
        aria-label="Cumulative fantasy points by episode"
      >
        {/* Grid lines */}
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={PAD.left + chartW}
              y1={toY(tick)}
              y2={toY(tick)}
              stroke="#333"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={toY(tick) + 4}
              textAnchor="end"
              fontSize={10}
              fill="#888"
            >
              {tick}
            </text>
          </g>
        ))}

        {/* X-axis episode labels */}
        {data.map((d) => (
          <text
            key={d.episode}
            x={toX(d.episode)}
            y={H - 8}
            textAnchor="middle"
            fontSize={10}
            fill="#888"
          >
            E{d.episode}
          </text>
        ))}

        {/* Area fill */}
        <polygon
          points={`${PAD.left},${PAD.top + chartH} ${points} ${PAD.left + chartW},${PAD.top + chartH}`}
          fill="rgba(255,106,0,0.08)"
        />

        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke="#ff6a00"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Dots */}
        {data.map((d) => (
          <circle
            key={d.episode}
            cx={toX(d.episode)}
            cy={toY(d.cumulative)}
            r={3.5}
            fill="#ff6a00"
            stroke="#0f0f0f"
            strokeWidth={1.5}
          />
        ))}
      </svg>
    </div>
  );
}
