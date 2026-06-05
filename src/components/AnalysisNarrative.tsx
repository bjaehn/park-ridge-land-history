import { formatCurrency, formatNumber, formatYear } from "../lib/formatters";
import { hotspotLabel, type HotspotCollection, type HotspotFeature } from "../lib/hotspots";
import type { ParcelFeature } from "../lib/parcelTypes";
import type { VisualizationPreset } from "./VisualizationPanel";
import type { AnalysisScale } from "./AnalysisTabs";

type AnalysisNarrativeProps = {
  activeScale: AnalysisScale;
  selectedParcel: ParcelFeature | null;
  hotspots: HotspotCollection;
  selectedHotspot: HotspotFeature | null;
  showHotspots: boolean;
  activePreset: VisualizationPreset;
  filteredCount: number;
  totalCount: number;
};

export function AnalysisNarrative({
  activeScale,
  selectedParcel,
  hotspots,
  selectedHotspot,
  showHotspots,
  activePreset,
  filteredCount,
  totalCount
}: AnalysisNarrativeProps) {
  const paragraphs = narrativeParagraphs({
    activeScale,
    selectedParcel,
    hotspots,
    selectedHotspot,
    showHotspots,
    activePreset,
    filteredCount,
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
  if (props.activeScale === "cluster") {
    return areasNarrative(props.hotspots, props.selectedHotspot, props.showHotspots);
  }
  return cityNarrative(props.activePreset, props.filteredCount, props.totalCount);
}

function homeNarrative(parcel: ParcelFeature | null): string[] {
  if (!parcel) {
    return [
      "Search for an address or PIN to focus the map on one property.",
      "Once selected, this panel shows the home age, sale history, permit timeline, assessment signals, and nearby change context."
    ];
  }

  const properties = parcel.properties;
  const address = properties.address || "This parcel";
  const year = formatYear(properties.year_built);
  const sales = formatNumber(properties.sale_count);
  const permits = formatNumber(properties.permit_count);
  const assessment = formatCurrency(properties.latest_assessed_total);

  return [
    `${address} is selected. The assessor build year is ${year}, with ${sales} sales found and ${permits} permit records in the timeline.`,
    `Use the home signals and timeline below to understand whether this looks quiet, recently active, historically interesting, or under nearby change pressure. Latest assessed value: ${assessment}.`
  ];
}

function areasNarrative(
  hotspots: HotspotCollection,
  selectedHotspot: HotspotFeature | null,
  showHotspots: boolean
): string[] {
  if (selectedHotspot) {
    return [
      `${hotspotLabel(selectedHotspot.properties.hotspot_type)} is selected.`,
      selectedHotspot.properties.description
    ];
  }

  if (!showHotspots) {
    return [
      "Turn on areas to see parts of Park Ridge that stand out.",
      "These are groups of homes with similar patterns, such as more recent work, possible teardown pressure, older homes, or low recent activity."
    ];
  }

  return [
    `${hotspots.features.length.toLocaleString()} standout areas are available on the map.`,
    "Choose one from the list or click one on the map to see why it was flagged."
  ];
}

function cityNarrative(activePreset: VisualizationPreset, filteredCount: number, totalCount: number): string[] {
  const countLabel = `${filteredCount.toLocaleString()} of ${totalCount.toLocaleString()} homes`;
  const presetText: Record<VisualizationPreset, string[]> = {
    age: [
      `The map is showing home age across Park Ridge for ${countLabel}.`,
      "Colors represent the decade each current home was built. Use the age filter to keep only the decades you care about."
    ],
    buildout: [
      `The map is showing how Park Ridge filled in over time for ${countLabel}.`,
      "Move the year slider or press Play to watch homes appear by build year."
    ],
    stability: [
      `The map is showing where change appears more active or quieter across Park Ridge for ${countLabel}.`,
      "Stable areas have little recent permit activity. Changing areas show more permits, additions, new construction, or teardown pressure."
    ],
    activity: [
      `The map is showing the kind of recent work found across Park Ridge for ${countLabel}.`,
      "Use this view to separate remodels, additions, new construction, and teardown pressure."
    ]
  };
  return presetText[activePreset];
}
