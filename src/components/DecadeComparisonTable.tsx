import { decadeColors, decadeOrder } from "../lib/colorScales";
import { permitPressureCurrentYear } from "../lib/permitPressure";
import type { DecadeBucket, ParcelCollection, ParcelFeature } from "../lib/parcelTypes";

type DecadeComparisonTableProps = {
  parcels: ParcelCollection | null;
  title?: string;
  note?: string;
};

type DecadeRow = {
  bucket: string;
  count: number;
  olderHomeCount: number;
  olderHomePercent: number;
  remodelCount: number;
  remodelPercent: number;
  soldLastThreeYearsCount: number;
  soldLastThreeYearsPercent: number;
  rebuildSignalCount: number;
  rebuildSignalPercent: number;
  read: string;
};

export function DecadeComparisonTable({
  parcels,
  title = "Homes by Decade Built",
  note = "Groups current Park Ridge homes by build decade, then compares reinvestment, older-home share, recent sales, and rebuild signals."
}: DecadeComparisonTableProps) {
  const rows = buildRows(parcels);

  return (
    <section className="panel-section decade-comparison" aria-label="Homes by decade built">
      <h2>{title}</h2>
      <p className="mode-note">{note}</p>
      <div className="comparison-table-wrap">
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Built</th>
              <th>Homes</th>
              <th>Remodeling</th>
              <th>Older homes</th>
              <th>Sold recently</th>
              <th>Rebuild signals</th>
              <th>Read</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.bucket}>
                <th scope="row">
                  <span className="comparison-area-name">
                    <i
                      className="area-color-dot"
                      style={{ backgroundColor: decadeColors[row.bucket as DecadeBucket] ?? "#94a3b8" }}
                      aria-hidden="true"
                    />
                    {row.bucket}
                  </span>
                </th>
                <td>{row.count.toLocaleString()}</td>
                <td>{countAndPercent(row.remodelCount, row.remodelPercent)}</td>
                <td>{countAndPercent(row.olderHomeCount, row.olderHomePercent)}</td>
                <td>{countAndPercent(row.soldLastThreeYearsCount, row.soldLastThreeYearsPercent)}</td>
                <td>{countAndPercent(row.rebuildSignalCount, row.rebuildSignalPercent)}</td>
                <td>{row.read}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function buildRows(parcels: ParcelCollection | null): DecadeRow[] {
  const grouped = new Map<string, ParcelFeature[]>();
  decadeOrder.forEach((bucket) => grouped.set(bucket, []));

  parcels?.features.forEach((feature) => {
    const bucket = feature.properties.decade_built || "Unknown";
    const features = grouped.get(bucket) ?? [];
    features.push(feature);
    grouped.set(bucket, features);
  });

  return decadeOrder
    .map((bucket) => rowForBucket(bucket, grouped.get(bucket) ?? []))
    .filter((row) => row.count > 0);
}

function rowForBucket(bucket: string, features: ParcelFeature[]): DecadeRow {
  const count = features.length;
  const olderHomeCount = features.filter((feature) => {
    const year = feature.properties.year_built;
    return typeof year === "number" && year > 0 && year <= 1945;
  }).length;
  const remodelCount = features.filter((feature) =>
    ["recent_permit", "remodel", "addition"].includes(String(feature.properties.permit_pressure_type))
  ).length;
  const soldLastThreeYearsCount = features.filter((feature) => {
    const year = feature.properties.latest_sale_year;
    return typeof year === "number" && year >= permitPressureCurrentYear - 2 && year <= permitPressureCurrentYear;
  }).length;
  const rebuildSignalCount = features.filter((feature) =>
    feature.properties.permit_pressure_type === "direct_teardown" ||
    feature.properties.permit_pressure_type === "new_construction"
  ).length;

  return {
    bucket,
    count,
    olderHomeCount,
    olderHomePercent: percent(olderHomeCount, count),
    remodelCount,
    remodelPercent: percent(remodelCount, count),
    soldLastThreeYearsCount,
    soldLastThreeYearsPercent: percent(soldLastThreeYearsCount, count),
    rebuildSignalCount,
    rebuildSignalPercent: percent(rebuildSignalCount, count),
    read: decadeRead(bucket, count, remodelCount, soldLastThreeYearsCount, rebuildSignalCount)
  };
}

function decadeRead(
  bucket: string,
  count: number,
  remodelCount: number,
  soldLastThreeYearsCount: number,
  rebuildSignalCount: number
): string {
  if (bucket === "Unknown") return "Needs source cleanup";
  if (bucket === "Pre-1900" || bucket === "1900s" || bucket === "1910s" || bucket === "1920s" || bucket === "1930s") {
    return "Historic fabric";
  }
  if (bucket === "2010s" || bucket === "2020s") return "Recent growth";
  if (percent(rebuildSignalCount, count) >= 4) return "Rebuild-sensitive era";
  if (percent(remodelCount, count) >= 15) return "Active reinvestment";
  if (percent(soldLastThreeYearsCount, count) >= 8) return "High turnover";
  return "Steady stock";
}

function percent(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((count / total) * 100);
}

function countAndPercent(count: number, percentValue: number): string {
  return `${count.toLocaleString()} / ${percentValue}%`;
}
