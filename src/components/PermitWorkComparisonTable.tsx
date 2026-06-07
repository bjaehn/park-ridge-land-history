import {
  permitPressureLabel,
  permitPressureLegendOrder,
  type PermitPressureWindow
} from "../lib/permitPressure";
import type { ParcelCollection, PermitPressureType } from "../lib/parcelTypes";

type PermitWorkComparisonTableProps = {
  parcels: ParcelCollection | null;
  permitPressureWindow: PermitPressureWindow;
  title?: string;
  note?: string;
};

type PermitWorkRow = {
  type: PermitPressureType;
  homes: number;
  percent: number;
  latestYear: number | null;
  read: string;
};

export function PermitWorkComparisonTable({
  parcels,
  permitPressureWindow,
  title = "Work by Permit Type",
  note
}: PermitWorkComparisonTableProps) {
  const rows = buildRows(parcels);
  const tableNote =
    note ??
    `Groups Park Ridge homes by the strongest recent permit signal for the selected ${windowLabel(permitPressureWindow)} evidence window.`;

  return (
    <section className="panel-section neighborhood-comparison" aria-label="Permit work comparison">
      <h2>{title}</h2>
      <p className="mode-note">{tableNote}</p>
      <div className="comparison-table-wrap">
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Work signal</th>
              <th>Homes</th>
              <th>Share</th>
              <th>Latest year</th>
              <th>Read</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.type}>
                <th scope="row">{permitPressureLabel(row.type)}</th>
                <td>{row.homes.toLocaleString()}</td>
                <td>{row.percent}%</td>
                <td>{row.latestYear ?? "Unknown"}</td>
                <td>{row.read}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function buildRows(parcels: ParcelCollection | null): PermitWorkRow[] {
  const features = parcels?.features ?? [];
  const total = features.length;
  const order: PermitPressureType[] = [...permitPressureLegendOrder, "none"];

  return order
    .map((type) => {
      const matches = features.filter((feature) => (feature.properties.permit_pressure_type ?? "none") === type);
      const latestYears = matches
        .map((feature) => feature.properties.latest_permit_year)
        .filter((year): year is number => typeof year === "number");
      return {
        type,
        homes: matches.length,
        percent: total ? Math.round((matches.length / total) * 100) : 0,
        latestYear: latestYears.length ? Math.max(...latestYears) : null,
        read: workRead(type, matches.length, total)
      };
    })
    .filter((row) => row.homes > 0);
}

function workRead(type: PermitPressureType, count: number, total: number): string {
  const share = total ? Math.round((count / total) * 100) : 0;
  if (type === "none") return "No recent permit signal";
  if (type === "remodel" || type === "addition" || type === "recent_permit") return "Reinvestment";
  if (type === "new_construction" || type === "direct_teardown") return "Rebuild signal";
  if (type === "nearby_teardown") return share >= 5 ? "Nearby rebuild context" : "Localized nearby signal";
  return "Permit activity";
}

function windowLabel(window: PermitPressureWindow): string {
  return window === "all" ? "all-year" : `${window}-year`;
}
