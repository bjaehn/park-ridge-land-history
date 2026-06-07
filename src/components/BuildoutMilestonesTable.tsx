import { decadeOrder } from "../lib/colorScales";
import type { ParcelCollection } from "../lib/parcelTypes";

type BuildoutMilestonesTableProps = {
  parcels: ParcelCollection | null;
  title?: string;
  note?: string;
};

type MilestoneRow = {
  decade: string;
  builtInDecade: number;
  builtByThen: number;
  percentBuilt: number;
  read: string;
};

export function BuildoutMilestonesTable({
  parcels,
  title = "Build-Out Milestones",
  note = "Shows when today's Park Ridge housing stock appeared, decade by decade, as a cumulative city growth story."
}: BuildoutMilestonesTableProps) {
  const rows = buildRows(parcels);

  return (
    <section className="panel-section decade-comparison" aria-label="Park Ridge build-out milestones">
      <h2>{title}</h2>
      <p className="mode-note">{note}</p>
      <div className="comparison-table-wrap">
        <table className="comparison-table">
          <thead>
            <tr>
              <th>By decade</th>
              <th>Built then</th>
              <th>Total built</th>
              <th>City built out</th>
              <th>Read</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.decade}>
                <th scope="row">{row.decade}</th>
                <td>{row.builtInDecade.toLocaleString()}</td>
                <td>{row.builtByThen.toLocaleString()}</td>
                <td>{row.percentBuilt}%</td>
                <td>{row.read}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function buildRows(parcels: ParcelCollection | null): MilestoneRow[] {
  const counts = new Map<string, number>();
  let total = 0;
  parcels?.features.forEach((feature) => {
    if (typeof feature.properties.year_built !== "number") return;
    const decade = String(feature.properties.decade_built || "Unknown");
    counts.set(decade, (counts.get(decade) ?? 0) + 1);
    total += 1;
  });
  let cumulative = 0;

  return decadeOrder
    .filter((decade) => decade !== "Unknown" && decade !== "Suspicious")
    .map((decade) => {
      const builtInDecade = counts.get(decade) ?? 0;
      cumulative += builtInDecade;
      return {
        decade,
        builtInDecade,
        builtByThen: cumulative,
        percentBuilt: total ? Math.round((cumulative / total) * 100) : 0,
        read: buildoutRead(decade, builtInDecade, cumulative, total)
      };
    })
    .filter((row) => row.builtInDecade > 0);
}

function buildoutRead(decade: string, builtInDecade: number, cumulative: number, total: number): string {
  const share = total ? Math.round((builtInDecade / total) * 100) : 0;
  const cumulativeShare = total ? Math.round((cumulative / total) * 100) : 0;
  if (decade === "Pre-1900" || decade === "1900s" || decade === "1910s") return "Early city fabric";
  if (share >= 12) return "Major growth wave";
  if (cumulativeShare >= 80) return "Late infill";
  if (cumulativeShare >= 50) return "City taking shape";
  return "Growing base";
}
