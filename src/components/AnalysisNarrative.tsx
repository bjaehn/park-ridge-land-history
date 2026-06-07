import { formatNumber, formatYear } from "../lib/formatters";
import { areaGroupingDefinitions, type AreaGroupingId, type AreaSummaryFeature } from "../lib/areaGroups";
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

  return [
    `${address} is selected. The assessor build year is ${year}, with ${sales} sales found and ${permits} permit records in the timeline.`,
    "The map anchors the parcel; the timeline and home signals explain how the house has changed over time."
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
      `${selectedArea.properties.healthLabel} is the current read. Compare its remodeling, older-home share, recent sales, and rebuild signals before zooming into a block or property.`
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
      "Use the neighborhood comparison and age distribution to see which parts of town are older, newer, or mixed."
    ],
    buildout: [
      `This view explains how Park Ridge filled in over time for ${countLabel}.`,
      "The timeline turns build years into a city growth story rather than a static map."
    ],
    stability: [
      `This view compares where Park Ridge appears more active or quieter for ${countLabel}.`,
      "Stable areas have little recent permit activity. Changing areas show more permits, additions, new construction, or other rebuild signals."
    ],
    activity: [
      `This view separates the kind of recent work found across Park Ridge for ${countLabel}.`,
      "Use it to distinguish ordinary remodeling from additions, new construction, and full-demolition signals."
    ]
  };
  return presetText[activePreset];
}
