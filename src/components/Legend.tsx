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
import type { VisualizationPreset } from "./VisualizationPanel";

type LegendProps = {
  activePreset: VisualizationPreset;
  visibleDecades: Set<string>;
  showParcelChangeLegend: boolean;
  showPermitPressureLegend: boolean;
  permitPressureMapMode: PermitPressureMapMode;
  compact?: boolean;
};

export function Legend({
  activePreset,
  visibleDecades,
  showParcelChangeLegend,
  showPermitPressureLegend,
  permitPressureMapMode,
  compact = false
}: LegendProps) {
  const showPermitLegendFirst = activePreset === "stability" || activePreset === "activity";
  const showOnlyAgeLegend = activePreset === "age" || activePreset === "buildout";

  return (
    <section className={`legend-panel ${compact ? "legend-panel-compact" : "panel-section"}`} aria-label="Map color legend">
      <h2>Legend</h2>
      <p className="legend-help">Colors explain the current map. Use the tabs and data layers panel to change the view.</p>
      {showPermitLegendFirst && showPermitPressureLegend && renderPermitLegend()}
      {renderAgeLegend()}
      {!showOnlyAgeLegend && !showPermitLegendFirst && showPermitPressureLegend && renderPermitLegend()}
      {showParcelChangeLegend && (
        <div className="legend-section" aria-label="Historical change color legend">
          <h3>Lot Changes</h3>
          <p className="legend-note">Compares older parcel maps with newer ones.</p>
          <div className="legend-grid">
            {parcelChangeLegendOrder.map((changeType) => (
              <div
                className="legend-item"
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

  function renderAgeLegend() {
    return (
      <div className="legend-section">
        <h3>Home Age</h3>
        <p className="legend-note">{ageLegendNote(activePreset)}</p>
        <div className="legend-grid">
          {decadeOrder.map((bucket) => (
            <div
              className={`legend-item ${visibleDecades.has(bucket) ? "" : "is-muted"}`}
              key={bucket}
            >
              <span className="legend-swatch" style={{ backgroundColor: decadeColors[bucket] }} />
              <span>{bucket}</span>
            </div>
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
                <div
                  className="legend-item"
                  key={stabilityType}
                >
                  <span className="legend-swatch" style={{ backgroundColor: permitStabilityColors[stabilityType] }} />
                  <span>{permitStabilityLabel(stabilityType)}</span>
                </div>
              ))
            : permitPressureLegendOrder.map((pressureType) => (
                <div
                  className="legend-item"
                  key={pressureType}
                >
                  <span className="legend-swatch" style={{ backgroundColor: permitPressureColors[pressureType] }} />
                  <span>{permitPressureLabel(pressureType)}</span>
                </div>
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
  return "Stable means little recent permit activity. Changing means more permits, additions, or rebuild signals.";
}

function ageLegendNote(activePreset: VisualizationPreset): string {
  if (activePreset === "buildout") return "Color shows the decade built. The time slider controls which homes appear.";
  return "Color shows the decade the current home was built.";
}
