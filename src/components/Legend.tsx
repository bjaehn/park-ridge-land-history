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
import type { VisualizationPreset } from "./VisualizationPanel";

type LegendProps = {
  activePreset: VisualizationPreset;
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
  activePreset,
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
  const showPermitLegendFirst = activePreset === "stability" || activePreset === "activity";
  const showOnlyAgeLegend = activePreset === "age" || activePreset === "buildout";

  return (
    <section className={`legend-panel ${compact ? "legend-panel-compact" : "panel-section"}`} aria-label="Map color legend">
      <h2>Legend</h2>
      <p className="legend-help">Colors explain what is on the map. Click any color to hide or show it.</p>
      {showPermitLegendFirst && showPermitPressureLegend && renderPermitLegend()}
      {renderAgeLegend()}
      {!showOnlyAgeLegend && !showPermitLegendFirst && showPermitPressureLegend && renderPermitLegend()}
      {showParcelChangeLegend && (
        <div className="legend-section" aria-label="Historical change color legend">
          <h3>Lot Changes</h3>
          <p className="legend-note">Compares older parcel maps with newer ones.</p>
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

  function renderAgeLegend() {
    return (
      <div className="legend-section">
        <h3>Home Age</h3>
        <p className="legend-note">{ageLegendNote(activePreset)}</p>
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
      </div>
    );
  }

  function renderPermitLegend() {
    return (
      <div className="legend-section" aria-label="Permit pressure color legend">
        <h3>{permitPressureMapMode === "stability" ? "Stable vs Changing" : "Permit Work"}</h3>
        <p className="legend-note">{permitLegendNote(permitPressureMapMode)}</p>
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
    );
  }
}

function changeLegendLabel(changeType: ParcelChangeType): string {
  if (changeType === "geometry_or_area_changed") return "Area changed";
  return parcelChangeLabels[changeType];
}

function permitLegendNote(mapMode: PermitPressureMapMode): string {
  if (mapMode === "activity") return "Color shows the kind of recent permitted work.";
  return "Stable means little recent permit activity. Changing means more permits, additions, or teardown pressure.";
}

function ageLegendNote(activePreset: VisualizationPreset): string {
  if (activePreset === "buildout") return "Color shows the decade built. The time slider controls which homes appear.";
  return "Color shows the decade the current home was built.";
}
