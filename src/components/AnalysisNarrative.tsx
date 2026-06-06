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
  activePreset: VisualizationPreset;
  filteredCount: number;
  totalCount: number;
};

export function AnalysisNarrative({
  activeScale,
  selectedParcel,
  hotspots,
  selectedHotspot,
  activePreset,
  filteredCount,
  totalCount
}: AnalysisNarrativeProps) {
  const paragraphs = narrativeParagraphs({
    activeScale,
    selectedParcel,
    hotspots,
    selectedHotspot,
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
  if (props.activeScale === "block") return blockNarrative(props.selectedParcel);
  if (props.activeScale === "area") return areasNarrative(props.hotspots, props.selectedHotspot);
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

function blockNarrative(parcel: ParcelFeature | null): string[] {
  if (!parcel) {
    return [
      "Pick a property first. Block starts from one address and looks at the nearby homes around it.",
      "This is the right view for questions like: does this street feel stable, are nearby homes being remodeled, and does the immediate context match the house?"
    ];
  }

  return [
    `${parcel.properties.address || "This parcel"} is the starting point for the block view.`,
    "The block is a practical nearby group, not an official boundary. It helps explain the street context before you zoom out to larger areas."
  ];
}

function areasNarrative(
  hotspots: HotspotCollection,
  selectedHotspot: HotspotFeature | null
): string[] {
  if (selectedHotspot) {
    return [
      `${hotspotLabel(selectedHotspot.properties.hotspot_type)} is selected.`,
      `${selectedHotspot.properties.description} This is useful because nearby patterns can change how one address feels: a home may be quiet by itself but sit near remodeling, older-home concentration, or teardown pressure.`
    ];
  }

  return [
    `${hotspots.features.length.toLocaleString()} area patterns are available on the map.`,
    "Pick an area from the list or click a circle on the map. This view is for comparing groups of blocks, not judging one property."
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
