import { formatNumber } from "../../lib/formatters";
import type { ParcelFeature } from "../../lib/parcelTypes";

const DECADE_ORDER = [
  "Pre-1900","1900s","1910s","1920s","1930s","1940s",
  "1950s","1960s","1970s","1980s","1990s","2000s","2010s","2020s",
];

const DECADE_COLORS: Record<string, string> = {
  "Pre-1900": "#8b7355",
  "1900s": "#b5956b", "1910s": "#c4a97a", "1920s": "#d4b88a", "1930s": "#c4a97a",
  "1940s": "#d4a017", "1950s": "#fbbf24", "1960s": "#f59e0b",
  "1970s": "#34d399", "1980s": "#10b981",
  "1990s": "#60a5fa", "2000s": "#3b82f6",
  "2010s": "#a78bfa", "2020s": "#22d3ee",
};

type Props = {
  features: ParcelFeature[];
  height?: number;
  compact?: boolean;
};

export function DecadeChart({ features, height = 140, compact = false }: Props) {
  const counts: Record<string, number> = {};
  for (const decade of DECADE_ORDER) counts[decade] = 0;

  for (const f of features) {
    const d = f.properties.decade_built;
    if (d && counts[d] !== undefined) counts[d]++;
  }

  const rows = DECADE_ORDER
    .map((decade) => ({ decade, count: counts[decade] }))
    .filter((r) => r.count > 0);

  const max = Math.max(1, ...rows.map((r) => r.count));
  const total = rows.reduce((s, r) => s + r.count, 0);

  if (rows.length === 0) {
    return (
      <div style={{ color: "rgba(255,255,255,0.28)", fontSize: "0.76rem", padding: "20px", textAlign: "center" }}>
        No construction decade data available for this area.
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: compact ? 3 : 6, height }}>
        {rows.map(({ decade, count }) => {
          const pct = (count / max) * 100;
          const color = DECADE_COLORS[decade] ?? "#22d3ee";
          return (
            <div
              key={decade}
              style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "flex-end",
                height: "100%", gap: 3,
              }}
            >
              <span style={{
                color: "rgba(255,255,255,0.45)", fontSize: compact ? "0.56rem" : "0.60rem",
                fontWeight: 600,
              }}>
                {!compact && formatNumber(count)}
              </span>
              <div style={{
                width: "100%", height: `${Math.max(pct, 2)}%`,
                borderRadius: "3px 3px 0 0",
                background: `linear-gradient(to top, ${color}99, ${color}44)`,
                transition: "height 400ms ease",
              }} />
              <span style={{
                color: "rgba(255,255,255,0.28)", fontSize: compact ? "0.52rem" : "0.56rem",
                fontWeight: 500, writingMode: "vertical-lr",
                transform: "rotate(180deg)", whiteSpace: "nowrap",
              }}>
                {decade.replace("Pre-1900", "<1900")}
              </span>
            </div>
          );
        })}
      </div>
      {!compact && total > 0 && (
        <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.25)", fontSize: "0.63rem" }}>
          {formatNumber(total)} of {formatNumber(features.length)} properties have known construction decade
        </p>
      )}
    </div>
  );
}
