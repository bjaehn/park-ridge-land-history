import { nearbyParcels, summarizeNearbyActivity } from "./nearbyActivity";
import type { PermitPressureWindow } from "./permitPressure";
import type { ParcelCollection, ParcelFeature } from "./parcelTypes";

export type BlockStory = {
  title: string;
  summary: string;
  details: string[];
  dominantDecade: string;
  sampleSize: number;
};

export function buildBlockStory(
  parcel: ParcelFeature | null,
  parcels: ParcelCollection | null,
  permitPressureWindow: PermitPressureWindow
): BlockStory | null {
  if (!parcel || !parcels) return null;
  const nearby = nearbyParcels(parcel, parcels);
  if (nearby.length === 0) return null;

  const activity = summarizeNearbyActivity(parcel, parcels, permitPressureWindow);
  const decadeCounts = countDecades(nearby);
  const dominantDecade = decadeCounts[0]?.[0] ?? "mixed-age";
  const knownDecadeCount = decadeCounts.reduce((sum, [, count]) => sum + count, 0);
  const permitParcels = nearby.filter((feature) => (feature.properties.recent_permit_count ?? 0) > 0).length;
  const teardownParcels = nearby.filter((feature) => (feature.properties.recent_teardown_count ?? 0) > 0).length;
  const changingParcels = activity?.changingParcels ?? 0;

  return {
    title: storyTitle(activity?.signal ?? "quiet"),
    summary: storySummary(dominantDecade, knownDecadeCount, nearby.length, permitParcels, teardownParcels),
    dominantDecade,
    sampleSize: nearby.length,
    details: [
      `${changingParcels} of ${nearby.length} nearby parcels show recent change signals.`,
      `${permitParcels} nearby parcels have direct permits in the selected window.`,
      teardownParcels > 0
        ? `${teardownParcels} nearby parcels carry teardown pressure.`
        : "No nearby teardown pressure in the selected window."
    ]
  };
}

function countDecades(features: ParcelFeature[]): Array<[string, number]> {
  const counts = new Map<string, number>();
  features.forEach((feature) => {
    const decade = feature.properties.decade_built;
    if (!decade || decade === "Unknown" || decade === "Suspicious") return;
    counts.set(String(decade), (counts.get(String(decade)) ?? 0) + 1);
  });
  return Array.from(counts.entries()).sort((left, right) => right[1] - left[1]);
}

function storyTitle(signal: "quiet" | "watch" | "active" | "teardown_pressure"): string {
  const titles = {
    quiet: "Stable block story",
    watch: "Watchable block story",
    active: "Changing block story",
    teardown_pressure: "Teardown pressure story"
  };
  return titles[signal];
}

function storySummary(
  dominantDecade: string,
  knownDecadeCount: number,
  nearbyCount: number,
  permitParcels: number,
  teardownParcels: number
): string {
  const agePhrase =
    knownDecadeCount > 0
      ? `This area reads mostly ${dominantDecade}, based on nearby assessor years.`
      : "This area has limited year-built coverage nearby.";
  const permitPhrase =
    permitParcels > 0
      ? `${permitParcels} of ${nearbyCount} nearby parcels have recent direct permit activity.`
      : "Recent direct permit activity is light nearby.";
  const teardownPhrase =
    teardownParcels > 0
      ? `Teardown pressure is visible on ${teardownParcels} nearby parcels.`
      : "Teardown pressure is not prominent in this window.";
  return `${agePhrase} ${permitPhrase} ${teardownPhrase}`;
}
