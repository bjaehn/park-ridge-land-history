import { formatNumber, formatYear } from "../lib/formatters";
import { areaGroupingDefinitions, type AreaGroupingId, type AreaSummaryFeature } from "../lib/areaGroups";
import { classifyParcelChangeStory } from "../lib/changeStory";
import { hotspotLabel, type HotspotCollection, type HotspotFeature } from "../lib/hotspots";
import type { ParcelFeature } from "../lib/parcelTypes";
import type { VisualizationPreset } from "./VisualizationPanel";
import type { AnalysisScale } from "./AnalysisTabs";

type AnalysisNarrativeProps = {
  activeScale: AnalysisScale;
  selectedParcel: ParcelFeature | null;
  hotspots: HotspotCollection;
  selectedHotspot: HotspotFeature | null;
  areaGrouping: AreaGroupingId;
  selectedArea: AreaSummaryFeature | null;
  activePreset: VisualizationPreset;
  totalCount: number;
};

export function AnalysisNarrative({
  activeScale,
  selectedParcel,
  hotspots,
  selectedHotspot,
  areaGrouping,
  selectedArea,
  activePreset,
  totalCount
}: AnalysisNarrativeProps) {
  if (activeScale === "home" && !selectedParcel) {
    return <HomeWelcomeCard />;
  }

  const paragraphs = narrativeParagraphs({
    activeScale,
    selectedParcel,
    hotspots,
    selectedHotspot,
    areaGrouping,
    selectedArea,
    activePreset,
    totalCount
  });

  return (
    <section className="analysis-narrative" aria-label="Current view summary">
      {paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </section>
  );
}

function HomeWelcomeCard() {
  return (
    <div className="home-welcome-card" aria-label="Property search welcome">
      <div className="home-welcome-glyph" aria-hidden="true">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5z" />
          <polyline points="9 21 9 12 15 12 15 21" />
        </svg>
      </div>
      <div className="home-welcome-text">
        <h2 className="home-welcome-headline">Find any Park Ridge home</h2>
        <p className="home-welcome-sub">Search an address or PIN to see the full ancestry — build year, ownership history, permits, assessed value, historic artifacts, and nearby context.</p>
      </div>
      <div className="home-welcome-facts" aria-hidden="true">
        <span>🏗 Build year</span>
        <span>💰 Sales history</span>
        <span>🔨 Permits</span>
        <span>📋 Assessments</span>
        <span>📸 Artifacts</span>
      </div>
    </div>
  );
}

function narrativeParagraphs(props: AnalysisNarrativeProps): string[] {
  if (props.activeScale === "home") return homeNarrative(props.selectedParcel);
  if (props.activeScale === "block") return blockNarrative(props.selectedParcel);
  if (props.activeScale === "area") return areasNarrative(props.hotspots, props.selectedHotspot, props.areaGrouping, props.selectedArea);
  return cityNarrative(props.activePreset, props.totalCount);
}

function homeNarrative(parcel: ParcelFeature | null): string[] {
  if (!parcel) {
    return [
      "Start with a property when you want the ancestry of one home.",
      "Search an address or PIN, then read the build year, ownership history, permits, value records, historic artifacts, and nearby context in one place."
    ];
  }

  const properties = parcel.properties;
  const address = properties.address || "This parcel";
  const year = formatYear(properties.year_built);
  const sales = formatNumber(properties.sale_count);
  const permits = formatNumber(properties.permit_count);
  const changeStory = classifyParcelChangeStory(properties);

  return [
    `${address} is selected. The assessor build year is ${year}, with ${sales} sales found and ${permits} permit records in the timeline.`,
    `${changeStory.label}: ${changeStory.title} The map anchors the parcel; the timeline and home signals explain how the house has changed over time.`
  ];
}

function blockNarrative(parcel: ParcelFeature | null): string[] {
  if (!parcel) {
    return [
      "Block starts from one selected property and reads the homes immediately around it.",
      "Use this view to understand the street: age mix, recent sales, remodeling, and whether the nearby context feels stable or active."
    ];
  }

  return [
    `${parcel.properties.address || "This parcel"} is the starting point for the block view.`,
    "The block is a practical nearby group, not an official boundary. It helps explain the street before you zoom out to areas or all of Park Ridge."
  ];
}

function areasNarrative(
  hotspots: HotspotCollection,
  selectedHotspot: HotspotFeature | null,
  areaGrouping: AreaGroupingId,
  selectedArea: AreaSummaryFeature | null
): string[] {
  const definition = areaGroupingDefinitions.find((candidate) => candidate.id === areaGrouping) ?? areaGroupingDefinitions[0];
  if (selectedArea) {
    return [
      `${selectedArea.properties.label} is selected.`,
      `${selectedArea.properties.changeStoryLabel} is the current change story. Compare its remodeling, older-home share, recent sales, and rebuild signals before zooming into a block or property.`
    ];
  }
  if (selectedHotspot) {
    return [
      `${hotspotLabel(selectedHotspot.properties.hotspot_type)} is selected.`,
      `${selectedHotspot.properties.description} Nearby patterns can change how one address feels: a home may be quiet by itself but sit near remodeling, older-home concentration, or rebuild activity.`
    ];
  }

  return [
    `${definition.shortLabel} is selected as the Park Ridge area view.`,
    areaGrouping === "change_zones"
      ? `${hotspots.features.length.toLocaleString()} change zones are available. Pick one to see where remodeling, older homes, or rebuild activity clusters.`
      : "Pick an area from the list or click one on the map. This view compares groups of blocks, not one property."
  ];
}

function cityNarrative(activePreset: VisualizationPreset, totalCount: number): string[] {
  const countLabel = `${totalCount.toLocaleString()} homes`;
  const presetText: Record<VisualizationPreset, string[]> = {
    age: [
      `This view reads home age across Park Ridge for ${countLabel}.`,
      "Use the decade table to see which eras make up today's housing stock and which eras show more remodeling, sales, or rebuild signals."
    ],
    buildout: [
      `This view explains how Park Ridge filled in over time for ${countLabel}.`,
      "Use the build-out milestones and time controls to see when the city took shape."
    ],
    stability: [
      `This view compares where Park Ridge appears more active or quieter for ${countLabel}.`,
      "Use the neighborhood comparison to see which areas read as preservation, careful reinvestment, turnover, expansion, dormant, or rebuild pressure."
    ],
    activity: [
      `This view separates the kind of recent work found across Park Ridge for ${countLabel}.`,
      "Use the permit work table to distinguish ordinary remodeling from additions, new construction, and full-demolition signals."
    ]
  };
  return presetText[activePreset];
}
