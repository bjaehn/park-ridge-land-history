import { decadeColors, decadeOrder } from "../lib/colorScales";
import {
  parcelChangeColors,
  parcelChangeLabels,
  parcelChangeLegendOrder,
  type ParcelChangeType
} from "../lib/parcelChangeTypes";
import {
  permitPressureColors,
  permitPressureLabel,
  permitPressureLegendOrder,
  permitStabilityColors,
  permitStabilityLabel,
  permitStabilityLegendOrder,
  type PermitPressureMapMode
} from "../lib/permitPressure";
import type { PermitPressureType, PermitStabilityType } from "../lib/parcelTypes";

type LegendProps = {
  visibleDecades: Set<string>;
  showParcelChangeLegend: boolean;
  visibleChangeTypes: Set<ParcelChangeType>;
  showPermitPressureLegend: boolean;
  permitPressureMapMode: PermitPressureMapMode;
  visiblePermitPressureTypes: Set<PermitPressureType>;
  visiblePermitStabilityTypes: Set<PermitStabilityType>;
  onToggleDecade: (decade: string) => void;
  onToggleChangeType: (changeType: ParcelChangeType) => void;
  onTogglePermitPressureType: (pressureType: PermitPressureType) => void;
  onTogglePermitStabilityType: (stabilityType: PermitStabilityType) => void;
  compact?: boolean;
};

export function Legend({
  visibleDecades,
  showParcelChangeLegend,
  visibleChangeTypes,
  showPermitPressureLegend,
  permitPressureMapMode,
  visiblePermitPressureTypes,
  visiblePermitStabilityTypes,
  onToggleDecade,
  onToggleChangeType,
  onTogglePermitPressureType,
  onTogglePermitStabilityType,
  compact = false
}: LegendProps) {
  return (
    <section className={`legend-panel ${compact ? "legend-panel-compact" : "panel-section"}`} aria-label="Map color legend">
      <h2>Legend</h2>
      <div className="legend-grid">
        {decadeOrder.map((bucket) => (
          <button
            className={`legend-item ${visibleDecades.has(bucket) ? "" : "is-muted"}`}
            type="button"
            key={bucket}
            aria-pressed={visibleDecades.has(bucket)}
            onClick={() => onToggleDecade(bucket)}
          >
            <span className="legend-swatch" style={{ backgroundColor: decadeColors[bucket] }} />
            <span>{bucket}</span>
          </button>
        ))}
      </div>
      {showPermitPressureLegend && (
        <div className="change-legend" aria-label="Permit pressure color legend">
          <h3>{permitPressureMapMode === "stability" ? "Stable vs Changing" : "Permit Pressure"}</h3>
          <div className="legend-grid">
            {permitPressureMapMode === "stability"
              ? permitStabilityLegendOrder.map((stabilityType) => (
                  <button
                    className={`legend-item ${visiblePermitStabilityTypes.has(stabilityType) ? "" : "is-muted"}`}
                    type="button"
                    key={stabilityType}
                    aria-pressed={visiblePermitStabilityTypes.has(stabilityType)}
                    onClick={() => onTogglePermitStabilityType(stabilityType)}
                  >
                    <span className="legend-swatch" style={{ backgroundColor: permitStabilityColors[stabilityType] }} />
                    <span>{permitStabilityLabel(stabilityType)}</span>
                  </button>
                ))
              : permitPressureLegendOrder.map((pressureType) => (
                  <button
                    className={`legend-item ${visiblePermitPressureTypes.has(pressureType) ? "" : "is-muted"}`}
                    type="button"
                    key={pressureType}
                    aria-pressed={visiblePermitPressureTypes.has(pressureType)}
                    onClick={() => onTogglePermitPressureType(pressureType)}
                  >
                    <span className="legend-swatch" style={{ backgroundColor: permitPressureColors[pressureType] }} />
                    <span>{permitPressureLabel(pressureType)}</span>
                  </button>
                ))}
          </div>
        </div>
      )}
      {showParcelChangeLegend && (
        <div className="change-legend" aria-label="Historical change color legend">
          <h3>Historical Change</h3>
          <div className="legend-grid">
            {parcelChangeLegendOrder.map((changeType) => (
              <button
                className={`legend-item ${visibleChangeTypes.has(changeType) ? "" : "is-muted"}`}
                type="button"
                key={changeType}
                aria-pressed={visibleChangeTypes.has(changeType)}
                onClick={() => onToggleChangeType(changeType)}
              >
                <span className="legend-swatch" style={{ backgroundColor: parcelChangeColors[changeType] }} />
                <span>{changeLegendLabel(changeType)}</span>
              </button>
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
