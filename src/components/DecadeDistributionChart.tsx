import { decadeColors, decadeOrder } from "../lib/colorScales";
import { formatNumber } from "../lib/formatters";
import type { DecadeBucket, ParcelCollection } from "../lib/parcelTypes";

type DecadeDistributionChartProps = {
  parcels: ParcelCollection | null;
};

export function DecadeDistributionChart({ parcels }: DecadeDistributionChartProps) {
  const counts = new Map<string, number>();
  for (const bucket of decadeOrder) counts.set(bucket, 0);

  parcels?.features.forEach((feature) => {
    const bucket = feature.properties.decade_built || "Unknown";
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  });

  const rows = decadeOrder
    .map((bucket) => ({
      bucket,
      count: counts.get(bucket) ?? 0
    }))
    .filter((row) => row.count > 0);
  const maxCount = Math.max(1, ...rows.map((row) => row.count));

  return (
    <section className="panel-section" aria-label="Park Ridge homes by decade built">
      <h2>Homes by Age</h2>
      <p className="mode-note">Shows the full Park Ridge age mix by decade built. Use the legend if you want to hide or show decades on the map.</p>
      <div className="decade-chart">
        {rows.length === 0 && <p className="quiet-note chart-empty">No homes found</p>}
        {rows.map((row) => (
          <div className="chart-row" key={row.bucket}>
            <span className="chart-label">{row.bucket}</span>
            <span className="chart-track">
              <span
                className="chart-bar"
                style={{
                  width: `${Math.max(4, (row.count / maxCount) * 100)}%`,
                  backgroundColor: decadeColors[row.bucket as DecadeBucket]
                }}
              />
            </span>
            <span className="chart-value">{formatNumber(row.count)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
