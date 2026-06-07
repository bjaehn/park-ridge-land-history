import { permitPressureCurrentYear } from "../lib/permitPressure";
import type { ParcelCollection, ParcelFeature, PermitStabilityType } from "../lib/parcelTypes";

type BlockChangeTableProps = {
  parcels: ParcelCollection | null;
};

type ChangeRow = {
  type: PermitStabilityType;
  label: string;
  homes: number;
  percent: number;
  remodeled: number;
  soldRecently: number;
  read: string;
};

const stabilityOrder: Array<{ type: PermitStabilityType; label: string }> = [
  { type: "stable", label: "Quiet homes" },
  { type: "watch", label: "Some updates" },
  { type: "changing", label: "Active change" },
  { type: "teardown_pressure", label: "Rebuild signals" }
];

export function BlockChangeTable({ parcels }: BlockChangeTableProps) {
  const rows = buildRows(parcels);

  return (
    <section className="panel-section neighborhood-comparison" aria-label="Block change comparison">
      <h2>Where Is Change Happening on This Block?</h2>
      <p className="mode-note">
        Groups the other homes on this block by whether they look quiet, recently updated, actively changing, or tied to rebuild permits.
      </p>
      <div className="comparison-table-wrap">
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Signal</th>
              <th>Homes</th>
              <th>Share</th>
              <th>Updated</th>
              <th>Sold recently</th>
              <th>Read</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.type}>
                <th scope="row">{row.label}</th>
                <td>{row.homes.toLocaleString()}</td>
                <td>{row.percent}%</td>
                <td>{row.remodeled.toLocaleString()}</td>
                <td>{row.soldRecently.toLocaleString()}</td>
                <td>{row.read}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function buildRows(parcels: ParcelCollection | null): ChangeRow[] {
  const features = parcels?.features ?? [];
  const total = features.length;

  return stabilityOrder
    .map(({ type, label }) => {
      const matches = features.filter((feature) => (feature.properties.permit_stability_type ?? "stable") === type);
      return {
        type,
        label,
        homes: matches.length,
        percent: percent(matches.length, total),
        remodeled: matches.filter(hasReinvestmentSignal).length,
        soldRecently: matches.filter(soldRecently).length,
        read: stabilityRead(type, matches.length, total)
      };
    })
    .filter((row) => row.homes > 0);
}

function hasReinvestmentSignal(feature: ParcelFeature): boolean {
  return ["recent_permit", "remodel", "addition"].includes(String(feature.properties.permit_pressure_type));
}

function soldRecently(feature: ParcelFeature): boolean {
  const year = feature.properties.latest_sale_year;
  return typeof year === "number" && year >= permitPressureCurrentYear - 2 && year <= permitPressureCurrentYear;
}

function stabilityRead(type: PermitStabilityType, count: number, total: number): string {
  const share = percent(count, total);
  if (type === "stable") return share >= 70 ? "Mostly steady block" : "Steady homes";
  if (type === "watch") return "Light reinvestment";
  if (type === "changing") return "Visible update activity";
  return "Likely rebuild pressure";
}

function percent(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((count / total) * 100);
}
