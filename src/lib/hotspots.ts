import { featureCenter } from "./nearbyActivity";
import type { ParcelCollection, ParcelFeature } from "./parcelTypes";

export type HotspotType = "teardown_cluster" | "changing_area" | "old_home_pocket" | "stable_area";

export type HotspotProperties = {
  id: string;
  title: string;
  description: string;
  hotspot_type: HotspotType;
  parcel_count: number;
  score: number;
};

export type HotspotFeature = GeoJSON.Feature<GeoJSON.Point, HotspotProperties>;
export type HotspotCollection = GeoJSON.FeatureCollection<GeoJSON.Point, HotspotProperties>;

const cellSize = 0.0042;

export function buildHotspots(parcels: ParcelCollection | null): HotspotCollection {
  if (!parcels) return emptyHotspots();

  const cells = new Map<string, ParcelFeature[]>();
  parcels.features.forEach((feature) => {
    const center = featureCenter(feature);
    if (!center) return;
    const key = `${Math.floor(center[0] / cellSize)}:${Math.floor(center[1] / cellSize)}`;
    const current = cells.get(key) ?? [];
    current.push(feature);
    cells.set(key, current);
  });

  const candidates = Array.from(cells.entries())
    .map(([key, features]) => hotspotForCell(key, features))
    .filter((feature): feature is HotspotFeature => Boolean(feature))
    .sort((left, right) => right.properties.score - left.properties.score);

  return {
    type: "FeatureCollection",
    features: candidates.slice(0, 28)
  };
}

export function hotspotLabel(type: HotspotType): string {
  const labels: Record<HotspotType, string> = {
    teardown_cluster: "Possible teardown pressure",
    changing_area: "Lots of recent work",
    old_home_pocket: "Many older homes",
    stable_area: "Mostly quiet"
  };
  return labels[type];
}

function hotspotForCell(key: string, features: ParcelFeature[]): HotspotFeature | null {
  if (features.length < 8) return null;
  const centers = features.map(featureCenter).filter((center): center is [number, number] => Boolean(center));
  if (centers.length === 0) return null;

  const directPermitCount = features.filter((feature) => (feature.properties.recent_permit_count ?? 0) > 0).length;
  const teardownCount = features.filter((feature) => (feature.properties.recent_teardown_count ?? 0) > 0).length;
  const changingCount = features.filter((feature) =>
    ["watch", "changing", "teardown_pressure"].includes(String(feature.properties.permit_stability_type))
  ).length;
  const oldHomeCount = features.filter((feature) => {
    const year = feature.properties.year_built;
    return typeof year === "number" && year > 0 && year <= 1945;
  }).length;
  const stableCount = features.filter((feature) => feature.properties.permit_stability_type === "stable").length;

  const type = chooseHotspotType(features.length, changingCount, teardownCount, oldHomeCount, stableCount);
  if (!type) return null;

  const center = centers.reduce(
    (sum, value) => {
      sum[0] += value[0];
      sum[1] += value[1];
      return sum;
    },
    [0, 0]
  );
  const point: [number, number] = [center[0] / centers.length, center[1] / centers.length];
  const score = hotspotScore(type, features.length, changingCount, teardownCount, oldHomeCount, stableCount);

  return {
    type: "Feature",
    properties: {
      id: key,
      title: hotspotLabel(type),
      description: hotspotDescription(type, features.length, directPermitCount, changingCount, teardownCount, oldHomeCount),
      hotspot_type: type,
      parcel_count: features.length,
      score
    },
    geometry: {
      type: "Point",
      coordinates: point
    }
  };
}

function chooseHotspotType(
  parcelCount: number,
  changingCount: number,
  teardownCount: number,
  oldHomeCount: number,
  stableCount: number
): HotspotType | null {
  if (teardownCount >= 3) return "teardown_cluster";
  if (changingCount / parcelCount >= 0.34 && changingCount >= 5) return "changing_area";
  if (oldHomeCount / parcelCount >= 0.42 && oldHomeCount >= 5) return "old_home_pocket";
  if (stableCount / parcelCount >= 0.78 && parcelCount >= 12) return "stable_area";
  return null;
}

function hotspotScore(
  type: HotspotType,
  parcelCount: number,
  changingCount: number,
  teardownCount: number,
  oldHomeCount: number,
  stableCount: number
): number {
  if (type === "teardown_cluster") return teardownCount * 10 + changingCount + parcelCount * 0.2;
  if (type === "changing_area") return changingCount * 4 + teardownCount * 8;
  if (type === "old_home_pocket") return oldHomeCount * 3 + stableCount;
  return stableCount * 2 + parcelCount;
}

function hotspotDescription(
  type: HotspotType,
  parcelCount: number,
  directPermitCount: number,
  changingCount: number,
  teardownCount: number,
  oldHomeCount: number
): string {
  if (type === "teardown_cluster") {
    return `${teardownCount} of ${parcelCount} nearby homes show possible teardown pressure.`;
  }
  if (type === "changing_area") {
    return `${changingCount} of ${parcelCount} nearby homes show recent change, including ${directPermitCount} with permits.`;
  }
  if (type === "old_home_pocket") {
    return `${oldHomeCount} of ${parcelCount} nearby homes were built in 1945 or earlier.`;
  }
  return `Low recent permit activity across ${parcelCount} nearby homes.`;
}

function emptyHotspots(): HotspotCollection {
  return {
    type: "FeatureCollection",
    features: []
  };
}
