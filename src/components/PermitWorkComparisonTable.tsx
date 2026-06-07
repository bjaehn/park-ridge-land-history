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
  const counts = new Map<PermitPressureType, { homes: number; latestYear: number | null }>();

  features.forEach((feature) => {
    const type = (feature.properties.permit_pressure_type ?? "none") as PermitPressureType;
    const current = counts.get(type) ?? { homes: 0, latestYear: null };
    const latestYear = feature.properties.latest_permit_year;
    current.homes += 1;
    if (typeof latestYear === "number") {
      current.latestYear = current.latestYear === null ? latestYear : Math.max(current.latestYear, latestYear);
    }
    counts.set(type, current);
  });

  return order
    .map((type) => {
      const count = counts.get(type) ?? { homes: 0, latestYear: null };
      return {
        type,
        homes: count.homes,
        percent: total ? Math.round((count.homes / total) * 100) : 0,
        latestYear: count.latestYear,
        read: workRead(type, count.homes, total)
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
