import type { AnalysisScale } from "./AnalysisTabs";
import type { VisualizationPreset } from "./VisualizationPanel";
import type { PermitPressureMapMode } from "../lib/permitPressure";

type MapCompanionProps = {
  activeScale: AnalysisScale;
  activePreset: VisualizationPreset;
  visibleCount: number;
  totalCount: number;
  selectedAddress?: string | null;
  selectedAreaLabel?: string | null;
  selectedHotspotTitle?: string | null;
  isBuildoutPlaying: boolean;
  maxBuiltYear: number;
  showPermitPressure: boolean;
  permitPressureMapMode: PermitPressureMapMode;
};

export function MapCompanion({
  activeScale,
  activePreset,
  visibleCount,
  totalCount,
  selectedAddress,
  selectedAreaLabel,
  selectedHotspotTitle,
  isBuildoutPlaying,
  maxBuiltYear,
  showPermitPressure,
  permitPressureMapMode
}: MapCompanionProps) {
  const copy = mapCompanionCopy(activeScale, selectedAddress, selectedAreaLabel, selectedHotspotTitle);
  const mode = mapModeLabel(activePreset, showPermitPressure, permitPressureMapMode, isBuildoutPlaying);

  return (
    <section className="map-companion" aria-label="Map context">
      <div className="map-companion-main">
        <span>{copy.kicker}</span>
        <h2>{copy.title}</h2>
        <p>{copy.body}</p>
      </div>
      <div className="map-companion-facts" aria-label="Map facts">
        <span>{mode}</span>
        <span>{visibleCount.toLocaleString()} of {totalCount.toLocaleString()} homes shown</span>
        {(activePreset === "buildout" || isBuildoutPlaying) && <span>Built by {maxBuiltYear}</span>}
      </div>
    </section>
  );
}

function mapCompanionCopy(
  activeScale: AnalysisScale,
  selectedAddress?: string | null,
  selectedAreaLabel?: string | null,
  selectedHotspotTitle?: string | null
) {
  if (activeScale === "home") {
    return {
      kicker: "Property map",
      title: selectedAddress || "Pick a property",
      body: selectedAddress
        ? "The map locates the house. The panel tells the home ancestry story."
        : "Search an address or click a parcel to start a home ancestry view."
    };
  }
  if (activeScale === "block") {
    return {
      kicker: "Block map",
      title: selectedAddress ? "Selected physical block" : "Start with one property",
      body: selectedAddress
        ? "The map narrows to the street-bounded block around the selected home."
        : "Choose a property first, then compare the surrounding block."
    };
  }
  if (activeScale === "area") {
    const label = selectedAreaLabel || selectedHotspotTitle;
    return {
      kicker: "Area map",
      title: label || "Choose an area",
      body: label
        ? "The map frames a group of blocks. The panel explains what is changing there."
        : "Pick a neighborhood, ward, or change zone to connect the map with the area story."
    };
  }
  return {
    kicker: "Park Ridge map",
    title: "Citywide view",
    body: "The map shows the city pattern. The panel turns that pattern into a readable story."
  };
}

function mapModeLabel(
  activePreset: VisualizationPreset,
  showPermitPressure: boolean,
  permitPressureMapMode: PermitPressureMapMode,
  isBuildoutPlaying: boolean
): string {
  if (activePreset === "buildout" || isBuildoutPlaying) return "Growth through time";
  if (!showPermitPressure || activePreset === "age") return "Home age";
  if (permitPressureMapMode === "activity") return "Permit work";
  return "Stable vs changing";
}
