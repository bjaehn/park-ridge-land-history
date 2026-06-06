import { featureCenter } from "./nearbyActivity";
import type { HotspotCollection, HotspotFeature } from "./hotspots";
import type { ParcelCollection, ParcelFeature } from "./parcelTypes";

export type AreaGroupingId = "neighborhoods" | "wards" | "change_zones";

export type AreaSignal = "quiet" | "watch" | "active" | "teardown_pressure" | "older_homes";

export type AreaSummaryProperties = {
  id: string;
  grouping: AreaGroupingId;
  label: string;
  description: string;
  sourceLabel: string;
  parcelCount: number;
  olderHomeCount: number;
  remodelCount: number;
  newConstructionCount: number;
  teardownPressureCount: number;
  changingCount: number;
  signal: AreaSignal;
  signalLabel: string;
  hotspotId?: string | null;
};

export type AreaSummaryGeometry = GeoJSON.Polygon | GeoJSON.MultiPolygon | GeoJSON.Point;
export type AreaSummaryFeature = GeoJSON.Feature<AreaSummaryGeometry, AreaSummaryProperties>;
export type AreaSummaryCollection = GeoJSON.FeatureCollection<AreaSummaryGeometry, AreaSummaryProperties>;
export type WardBoundaryCollection = GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon, Record<string, unknown>>;

export type AreaGroupingDefinition = {
  id: AreaGroupingId;
  label: string;
  shortLabel: string;
  description: string;
};

export const areaGroupingDefinitions: AreaGroupingDefinition[] = [
  {
    id: "neighborhoods",
    label: "Common local areas",
    shortLabel: "Neighborhoods",
    description: "Uptown, South Park, and other familiar Park Ridge areas. Boundaries are approximate."
  },
  {
    id: "wards",
    label: "Election wards",
    shortLabel: "Election wards",
    description: "Official Park Ridge ward boundaries used for city elections."
  },
  {
    id: "change_zones",
    label: "Change zones",
    shortLabel: "Change zones",
    description: "Data-made zones where nearby parcels share a signal like remodeling, older homes, or teardown pressure."
  }
];

const neighborhoodRules = [
  {
    id: "uptown",
    label: "Uptown",
    description: "The walkable center around the Metra station, library, shops, and civic core.",
    match: (lng: number, lat: number) => lng > -87.855 && lng < -87.831 && lat > 42.003 && lat < 42.025
  },
  {
    id: "south_park",
    label: "South Park",
    description: "The south side of Park Ridge below the central Touhy corridor.",
    match: (_lng: number, lat: number) => lat < 42.0005
  },
  {
    id: "northwest_park",
    label: "Northwest Park",
    description: "Northwest Park Ridge near Dee Road, Dee Park, and the western edge of town.",
    match: (lng: number, lat: number) => lng < -87.855 && lat >= 42.02
  },
  {
    id: "northeast_park",
    label: "Northeast Park",
    description: "The northeastern side near Greenwood, Busse, and the northern edge of Park Ridge.",
    match: (lng: number, lat: number) => lng >= -87.845 && lat >= 42.02
  },
  {
    id: "southwest_woods",
    label: "Southwest Woods",
    description: "The southwest side near the forest preserve edge and larger residential pockets.",
    match: (lng: number, lat: number) => lng < -87.845 && lat < 42.0005
  },
  {
    id: "southeast_park",
    label: "Southeast Park",
    description: "The southeast side near Cumberland, Devon, and the Chicago edge.",
    match: (lng: number, lat: number) => lng >= -87.845 && lat < 42.0005
  }
];

export function buildAreaSummaries(
  parcels: ParcelCollection | null,
  grouping: AreaGroupingId,
  hotspots: HotspotCollection,
  wardBoundaries: WardBoundaryCollection | null = null
): AreaSummaryCollection {
  if (grouping === "change_zones") return changeZonesFromHotspots(hotspots);
  if (!parcels) return emptyAreas();
  if (grouping === "wards") return buildWardSummaries(parcels, wardBoundaries);

  const buckets = new Map<string, { label: string; description: string; sourceLabel: string; features: ParcelFeature[] }>();
  parcels.features.forEach((feature) => {
    const center = featureCenter(feature);
    if (!center) return;
    const definition = neighborhoodFor(center);
    const bucket = buckets.get(definition.id) ?? {
      label: definition.label,
      description: definition.description,
      sourceLabel: definition.sourceLabel,
      features: []
    };
    bucket.features.push(feature);
    buckets.set(definition.id, bucket);
  });

  return {
    type: "FeatureCollection",
    features: Array.from(buckets.entries())
      .map(([id, bucket]) => summaryFeature(id, grouping, bucket))
      .filter((feature): feature is AreaSummaryFeature => Boolean(feature))
      .sort((left, right) => right.properties.parcelCount - left.properties.parcelCount)
  };
}

function buildWardSummaries(parcels: ParcelCollection, wardBoundaries: WardBoundaryCollection | null): AreaSummaryCollection {
  if (!wardBoundaries?.features.length) return emptyAreas();

  const buckets = new Map<string, { label: string; description: string; sourceLabel: string; features: ParcelFeature[]; geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon }>();
  wardBoundaries.features.forEach((ward, index) => {
    const label = wardLabel(ward, index);
    buckets.set(label, {
      label,
      description: `${label} election ward.`,
      sourceLabel: "Official Park Ridge ward boundary file",
      features: [],
      geometry: ward.geometry
    });
  });

  parcels.features.forEach((feature) => {
    const center = featureCenter(feature);
    if (!center) return;
    const ward = wardBoundaries.features.find((candidate) => pointInGeometry(center, candidate.geometry));
    if (!ward) return;
    const label = wardLabel(ward, wardBoundaries.features.indexOf(ward));
    buckets.get(label)?.features.push(feature);
  });

  return {
    type: "FeatureCollection",
    features: Array.from(buckets.entries())
      .map(([id, bucket]) => wardSummaryFeature(id, bucket))
      .filter((feature): feature is AreaSummaryFeature => Boolean(feature))
      .sort((left, right) => left.properties.label.localeCompare(right.properties.label))
  };
}

function neighborhoodFor(center: [number, number]) {
  const [lng, lat] = center;
  const match = neighborhoodRules.find((rule) => rule.match(lng, lat));
  if (match) {
    return {
      id: `neighborhood:${match.id}`,
      label: match.label,
      description: match.description,
      sourceLabel: "Common Park Ridge area name; approximate boundary"
    };
  }
  return {
    id: "neighborhood:central_residential",
    label: "Central Residential",
    description: "The residential middle of Park Ridge outside Uptown and the outer directional areas.",
    sourceLabel: "Common local area; approximate boundary"
  };
}

function summaryFeature(
  id: string,
  grouping: AreaGroupingId,
  bucket: { label: string; description: string; sourceLabel: string; features: ParcelFeature[] }
): AreaSummaryFeature | null {
  const geometry = bboxPolygon(bucket.features);
  if (!geometry) return null;
  const stats = areaStats(bucket.features);
  return {
    type: "Feature",
    properties: {
      id,
      grouping,
      label: bucket.label,
      description: bucket.description,
      sourceLabel: bucket.sourceLabel,
      ...stats,
      signal: areaSignal(stats),
      signalLabel: areaSignalLabel(areaSignal(stats))
    },
    geometry
  };
}

function wardSummaryFeature(
  id: string,
  bucket: { label: string; description: string; sourceLabel: string; features: ParcelFeature[]; geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon }
): AreaSummaryFeature | null {
  const stats = areaStats(bucket.features);
  return {
    type: "Feature",
    properties: {
      id: `ward:${id.toLowerCase().replace(/\s+/g, "_")}`,
      grouping: "wards",
      label: bucket.label,
      description: bucket.description,
      sourceLabel: bucket.sourceLabel,
      ...stats,
      signal: areaSignal(stats),
      signalLabel: areaSignalLabel(areaSignal(stats))
    },
    geometry: bucket.geometry
  };
}

function areaStats(features: ParcelFeature[]) {
  const parcelCount = features.length;
  const olderHomeCount = features.filter((feature) => {
    const year = feature.properties.year_built;
    return typeof year === "number" && year > 0 && year <= 1945;
  }).length;
  const remodelCount = features.filter((feature) => (feature.properties.recent_permit_count ?? 0) > 0).length;
  const newConstructionCount = features.filter((feature) => feature.properties.permit_pressure_type === "new_construction").length;
  const teardownPressureCount = features.filter((feature) => feature.properties.permit_stability_type === "teardown_pressure").length;
  const changingCount = features.filter((feature) =>
    ["watch", "changing", "teardown_pressure"].includes(String(feature.properties.permit_stability_type))
  ).length;
  return {
    parcelCount,
    olderHomeCount,
    remodelCount,
    newConstructionCount,
    teardownPressureCount,
    changingCount
  };
}

function areaSignal(stats: ReturnType<typeof areaStats>): AreaSignal {
  if (stats.teardownPressureCount >= Math.max(3, stats.parcelCount * 0.03)) return "teardown_pressure";
  if (stats.changingCount >= Math.max(10, stats.parcelCount * 0.2)) return "active";
  if (stats.olderHomeCount >= Math.max(12, stats.parcelCount * 0.28)) return "older_homes";
  if (stats.remodelCount >= Math.max(6, stats.parcelCount * 0.12)) return "watch";
  return "quiet";
}

export function areaSignalLabel(signal: AreaSignal): string {
  const labels: Record<AreaSignal, string> = {
    quiet: "Mostly quiet",
    watch: "Some remodeling",
    active: "Active change",
    teardown_pressure: "Teardown pressure",
    older_homes: "Older-home pocket"
  };
  return labels[signal];
}

function changeZonesFromHotspots(hotspots: HotspotCollection): AreaSummaryCollection {
  return {
    type: "FeatureCollection",
    features: hotspots.features.map((hotspot) => changeZoneFeature(hotspot))
  };
}

function changeZoneFeature(hotspot: HotspotFeature): AreaSummaryFeature {
  const signal = hotspotSignal(hotspot);
  return {
    type: "Feature",
    properties: {
      id: `change:${hotspot.properties.id}`,
      grouping: "change_zones",
      label: hotspot.properties.title,
      description: hotspot.properties.description,
      sourceLabel: "Data-made change zone from nearby parcel signals",
      parcelCount: hotspot.properties.parcel_count,
      olderHomeCount: 0,
      remodelCount: 0,
      newConstructionCount: 0,
      teardownPressureCount: hotspot.properties.hotspot_type === "teardown_cluster" ? 1 : 0,
      changingCount: hotspot.properties.hotspot_type === "changing_area" ? hotspot.properties.parcel_count : 0,
      signal,
      signalLabel: areaSignalLabel(signal),
      hotspotId: hotspot.properties.id
    },
    geometry: hotspot.geometry
  };
}

function hotspotSignal(hotspot: HotspotFeature): AreaSignal {
  if (hotspot.properties.hotspot_type === "teardown_cluster") return "teardown_pressure";
  if (hotspot.properties.hotspot_type === "changing_area") return "active";
  if (hotspot.properties.hotspot_type === "old_home_pocket") return "older_homes";
  return "quiet";
}

function bboxPolygon(features: ParcelFeature[]): GeoJSON.Polygon | null {
  const coordinates = features.flatMap((feature) => flattenCoordinates(feature.geometry.coordinates));
  if (coordinates.length === 0) return null;
  const lngs = coordinates.map((coordinate) => coordinate[0]);
  const lats = coordinates.map((coordinate) => coordinate[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  return {
    type: "Polygon",
    coordinates: [[
      [minLng, minLat],
      [maxLng, minLat],
      [maxLng, maxLat],
      [minLng, maxLat],
      [minLng, minLat]
    ]]
  };
}

function flattenCoordinates(coordinates: GeoJSON.Position[][] | GeoJSON.Position[][][]): [number, number][] {
  const positions: [number, number][] = [];
  collectPositions(coordinates, positions);
  return positions;
}

function collectPositions(value: unknown, positions: [number, number][]): void {
  if (!Array.isArray(value)) return;
  if (typeof value[0] === "number" && typeof value[1] === "number") {
    positions.push([value[0], value[1]]);
    return;
  }
  value.forEach((item) => collectPositions(item, positions));
}

function emptyAreas(): AreaSummaryCollection {
  return {
    type: "FeatureCollection",
    features: []
  };
}

function wardLabel(feature: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon, Record<string, unknown>>, index: number): string {
  const value =
    feature.properties.ward ??
    feature.properties.WARD ??
    feature.properties.ward_number ??
    feature.properties.WARD_NUM ??
    feature.properties.name ??
    feature.properties.NAME ??
    feature.properties.label ??
    feature.properties.LABEL;
  const text = value == null ? "" : String(value).trim();
  if (!text) return `Ward ${index + 1}`;
  return /^ward\b/i.test(text) ? text : `Ward ${text}`;
}

function pointInGeometry(point: [number, number], geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon): boolean {
  if (geometry.type === "Polygon") return pointInPolygon(point, geometry.coordinates);
  return geometry.coordinates.some((polygon) => pointInPolygon(point, polygon));
}

function pointInPolygon(point: [number, number], rings: GeoJSON.Position[][]): boolean {
  if (rings.length === 0 || !pointInRing(point, rings[0])) return false;
  return !rings.slice(1).some((ring) => pointInRing(point, ring));
}

function pointInRing(point: [number, number], ring: GeoJSON.Position[]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = Number(ring[i][0]);
    const yi = Number(ring[i][1]);
    const xj = Number(ring[j][0]);
    const yj = Number(ring[j][1]);
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}
