import type { AreaSummaryCollection } from "../lib/areaGroups";

type NeighborhoodComparisonTableProps = {
  neighborhoods: AreaSummaryCollection;
};

export function NeighborhoodComparisonTable({ neighborhoods }: NeighborhoodComparisonTableProps) {
  const rows = [...neighborhoods.features].sort((left, right) =>
    left.properties.label.localeCompare(right.properties.label)
  );

  return (
    <section className="panel-section neighborhood-comparison" aria-label="Neighborhood comparison">
      <h2>Neighborhood Comparison</h2>
      <p className="mode-note">
        A quick read on how Park Ridge areas differ by reinvestment, older homes, recent sales, and rebuild signals.
      </p>
      <div className="comparison-table-wrap">
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Area</th>
              <th>Homes</th>
              <th>Remodeling</th>
              <th>Older homes</th>
              <th>Sold recently</th>
              <th>Rebuild signals</th>
              <th>Read</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((area) => (
              <tr key={area.properties.id}>
                <th scope="row">
                  <span className="comparison-area-name">
                    {area.properties.displayColor ? (
                      <i
                        className="area-color-dot"
                        style={{ backgroundColor: area.properties.displayColor }}
                        aria-hidden="true"
                      />
                    ) : null}
                    {area.properties.label}
                  </span>
                </th>
                <td>{area.properties.parcelCount.toLocaleString()}</td>
                <td>{countAndPercent(area.properties.remodelCount, area.properties.remodelPercent)}</td>
                <td>{countAndPercent(area.properties.olderHomeCount, area.properties.olderHomePercent)}</td>
                <td>
                  {countAndPercent(
                    area.properties.soldLastThreeYearsCount,
                    area.properties.soldLastThreeYearsPercent
                  )}
                </td>
                <td>{countAndPercent(area.properties.teardownPressureCount, area.properties.teardownPressurePercent)}</td>
                <td>{area.properties.healthLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function countAndPercent(count: number, percent: number): string {
  return `${count.toLocaleString()} / ${percent}%`;
}
