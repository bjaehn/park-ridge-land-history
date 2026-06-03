import { decadeColors, decadeOrder } from "../lib/colorScales";
import {
  parcelChangeColors,
  parcelChangeLabels,
  parcelChangeLegendOrder,
  type ParcelChangeType
} from "../lib/parcelChangeTypes";

type LegendProps = {
  visibleDecades: Set<string>;
  showParcelChangeLegend: boolean;
  visibleChangeTypes: Set<ParcelChangeType>;
};

export function Legend({
  visibleDecades,
  showParcelChangeLegend,
  visibleChangeTypes
}: LegendProps) {
  return (
    <section className="panel-section" aria-label="Decade color legend">
      <h2>Legend</h2>
      <div className="legend-grid">
        {decadeOrder.map((bucket) => (
          <div className={`legend-item ${visibleDecades.has(bucket) ? "" : "is-muted"}`} key={bucket}>
            <span className="legend-swatch" style={{ backgroundColor: decadeColors[bucket] }} />
            <span>{bucket}</span>
          </div>
        ))}
      </div>
      {showParcelChangeLegend && (
        <div className="change-legend" aria-label="Historical change color legend">
          <h3>Historical Change</h3>
          <div className="legend-grid">
            {parcelChangeLegendOrder.map((changeType) => (
              <div
                className={`legend-item ${visibleChangeTypes.has(changeType) ? "" : "is-muted"}`}
                key={changeType}
              >
                <span className="legend-swatch" style={{ backgroundColor: parcelChangeColors[changeType] }} />
                <span>{changeLegendLabel(changeType)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function changeLegendLabel(changeType: ParcelChangeType): string {
  if (changeType === "geometry_or_area_changed") return "Area changed";
  return parcelChangeLabels[changeType];
}
