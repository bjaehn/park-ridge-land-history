"use client";

import type { AssessmentPoint } from "@/lib/data/properties";

function niceMax(value: number): number {
  const mag = Math.pow(10, Math.floor(Math.log10(value)));
  return Math.ceil(value / mag) * mag;
}

function formatShort(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}k`;
  return `$${value}`;
}

type Props = {
  timeline: AssessmentPoint[];
  appealYears: number[];
  totalReduction: number | null;
};

export function AssessmentChart({ timeline, appealYears, totalReduction }: Props) {
  const points = [...timeline].sort((a, b) => a.year - b.year);
  if (points.length < 2) return null;

  const W = 600;
  const H = 160;
  const PAD = { top: 16, right: 16, bottom: 32, left: 8 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const years = points.map((p) => p.year);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const yearRange = maxYear - minYear || 1;

  const maxValue = niceMax(Math.max(...points.map((p) => p.value)));
  const gridValues = [maxValue * 0.5, maxValue];

  const xOf = (year: number) => PAD.left + ((year - minYear) / yearRange) * innerW;
  const yOf = (value: number) => PAD.top + innerH - (value / maxValue) * innerH;

  const polyPts = points.map((p) => `${xOf(p.year)},${yOf(p.value)}`).join(" ");

  // Show year labels only for first, last, and every ~5th point to avoid crowding
  const labelIndices = new Set<number>([0, points.length - 1]);
  if (points.length > 4) {
    const step = Math.max(1, Math.floor(points.length / 5));
    for (let i = step; i < points.length - 1; i += step) labelIndices.add(i);
  }

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: 160 }}
        aria-label="Assessed value history chart"
      >
        {/* Grid lines */}
        {gridValues.map((v) => (
          <line
            key={v}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={yOf(v)}
            y2={yOf(v)}
            stroke="currentColor"
            strokeOpacity={0.08}
            strokeWidth={1}
            strokeDasharray="4 4"
            className="text-text-muted"
          />
        ))}

        {/* Grid labels */}
        {gridValues.map((v) => (
          <text
            key={`lbl-${v}`}
            x={W - PAD.right - 2}
            y={yOf(v) - 3}
            textAnchor="end"
            fontSize={9}
            style={{ fill: "var(--color-text-muted, #6b7280)" }}
          >
            {formatShort(v)}
          </text>
        ))}

        {/* Appeal year vertical markers */}
        {appealYears.map((yr) => {
          if (yr < minYear || yr > maxYear) return null;
          const cx = xOf(yr);
          return (
            <g key={`appeal-${yr}`}>
              <line
                x1={cx}
                x2={cx}
                y1={PAD.top}
                y2={PAD.top + innerH}
                stroke="#d97706"
                strokeWidth={1}
                strokeOpacity={0.7}
                strokeDasharray="3 3"
              />
              <text
                x={cx + 2}
                y={PAD.top + 8}
                fontSize={8}
                fontWeight="600"
                style={{ fill: "#d97706" }}
              >
                Appeal
              </text>
            </g>
          );
        })}

        {/* Value polyline */}
        <polyline
          points={polyPts}
          fill="none"
          stroke="#7c3aed"
          strokeWidth={1.5}
          strokeOpacity={0.8}
        />

        {/* Dots */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={xOf(p.year)}
            cy={yOf(p.value)}
            r={3}
            fill="#7c3aed"
            fillOpacity={0.9}
          />
        ))}

        {/* Year labels */}
        {points.map((p, i) =>
          labelIndices.has(i) ? (
            <text
              key={`yr-${i}`}
              x={xOf(p.year)}
              y={H - 4}
              textAnchor="middle"
              fontSize={9}
              style={{ fill: "var(--color-text-muted, #6b7280)" }}
            >
              {p.year}
            </text>
          ) : null
        )}
      </svg>

      {totalReduction != null && totalReduction > 0 && (
        <p className="text-xs text-amber-400/80 mt-1">
          Total reduction granted through appeals: {formatShort(totalReduction)}
        </p>
      )}
    </div>
  );
}
