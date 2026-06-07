import { featureCenter } from "./nearbyActivity";
import { aggregateChangeStory, type ChangeStoryType } from "./changeStory";
import { getHouseEvolutionTimeline } from "./houseEvolution";
import {
  isFullDemolitionPermitEvent,
  isFullNewConstructionPermitEvent,
  permitPressureCurrentYear
} from "./permitPressure";
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
  olderHomePercent: number;
  remodelCount: number;
  remodelPercent: number;
  newConstructionCount: number;
  teardownPressureCount: number;
  teardownPressurePercent: number;
  soldLastThreeYearsCount: number;
  soldLastThreeYearsPercent: number;
  changingCount: number;
  signal: AreaSignal;
  signalLabel: string;
  healthLabel: string;
  evaluation: string;
  changeStoryType: ChangeStoryType;
  changeStoryLabel: string;
  changeStoryRead: string;
  parcelPins: string[];
  displayColor?: string | null;
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

type AreaStatsBase = {
  parcelCount: number;
  olderHomeCount: number;
  olderHomePercent: number;
  remodelCount: number;
  remodelPercent: number;
  newConstructionCount: number;
  fullDemolitionCount: number;
  teardownPressureCount: number;
  teardownPressurePercent: number;
  soldLastThreeYearsCount: number;
  soldLastThreeYearsPercent: number;
  changingCount: number;
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
    color: "#2563eb",
    match: (lng: number, lat: number) => lng > -87.855 && lng < -87.831 && lat > 42.003 && lat < 42.025
  },
  {
    id: "south_park",
    label: "South Park",
    description: "The south side of Park Ridge below the central Touhy corridor.",
    color: "#0f766e",
    match: (_lng: number, lat: number) => lat < 42.0005
  },
  {
    id: "northwest_park",
    label: "Northwest Park",
    description: "Northwest Park Ridge near Dee Road, Dee Park, and the western edge of town.",
    color: "#7c3aed",
    match: (lng: number, lat: number) => lng < -87.855 && lat >= 42.02
  },
  {
    id: "northeast_park",
    label: "Northeast Park",
    description: "The northeastern side near Greenwood, Busse, and the northern edge of Park Ridge.",
    color: "#d97706",
    match: (lng: number, lat: number) => lng >= -87.845 && lat >= 42.02
  },
  {
    id: "southwest_woods",
    label: "Southwest Woods",
    description: "The southwest side near the forest preserve edge and larger residential pockets.",
    color: "#15803d",
    match: (lng: number, lat: number) => lng < -87.845 && lat < 42.0005
  },
  {
    id: "southeast_park",
    label: "Southeast Park",
    description: "The southeast side near Cumberland, Devon, and the Chicago edge.",
    color: "#be123c",
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

  const buckets = new Map<string, { label: string; description: string; sourceLabel: string; displayColor?: string | null; features: ParcelFeature[] }>();
  parcels.features.forEach((feature) => {
    const center = featureCenter(feature);
    if (!center) return;
    const definition = neighborhoodFor(center);
    const bucket = buckets.get(definition.id) ?? {
      label: definition.label,
      description: definition.description,
      sourceLabel: definition.sourceLabel,
      displayColor: definition.displayColor,
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
      displayColor: match.color,
      sourceLabel: "Common Park Ridge area name; approximate boundary"
    };
  }
  return {
    id: "neighborhood:central_residential",
    label: "Central Residential",
    description: "The residential middle of Park Ridge outside Uptown and the outer directional areas.",
    displayColor: "#0891b2",
    sourceLabel: "Common local area; approximate boundary"
  };
}

function summaryFeature(
  id: string,
  grouping: AreaGroupingId,
  bucket: { label: string; description: string; sourceLabel: string; displayColor?: string | null; features: ParcelFeature[] }
): AreaSummaryFeature | null {
  const geometry = bboxPolygon(bucket.features);
  if (!geometry) return null;
  const stats = areaStats(bucket.features);
  const changeStory = aggregateChangeStory(bucket.features, "area");
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
      signalLabel: areaSignalLabel(areaSignal(stats)),
      changeStoryType: changeStory.type,
      changeStoryLabel: changeStory.label,
      changeStoryRead: changeStory.title,
      parcelPins: parcelPins(bucket.features),
      displayColor: bucket.displayColor ?? null
    },
    geometry
  };
}

function wardSummaryFeature(
  id: string,
  bucket: { label: string; description: string; sourceLabel: string; features: ParcelFeature[]; geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon }
): AreaSummaryFeature | null {
  const stats = areaStats(bucket.features);
  const changeStory = aggregateChangeStory(bucket.features, "area");
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
      signalLabel: areaSignalLabel(areaSignal(stats)),
      changeStoryType: changeStory.type,
      changeStoryLabel: changeStory.label,
      changeStoryRead: changeStory.title,
      parcelPins: parcelPins(bucket.features)
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
  const remodelCount = features.filter((feature) =>
    ["recent_permit", "remodel", "addition"].includes(String(feature.properties.permit_pressure_type))
  ).length;
  const newConstructionCount = features.filter((feature) =>
    feature.properties.permit_pressure_type === "new_construction" || hasFullNewConstructionPermit(feature)
  ).length;
  const fullDemolitionCount = features.filter((feature) =>
    feature.properties.permit_pressure_type === "direct_teardown" || hasFullDemolitionPermit(feature)
  ).length;
  const teardownPressureCount = fullDemolitionCount + newConstructionCount;
  const soldLastThreeYearsCount = features.filter((feature) => {
    const year = feature.properties.latest_sale_year;
    return typeof year === "number" && year >= permitPressureCurrentYear - 2 && year <= permitPressureCurrentYear;
  }).length;
  const changingCount = features.filter((feature) =>
    ["watch", "changing", "teardown_pressure"].includes(String(feature.properties.permit_stability_type))
  ).length;
  const base = {
    parcelCount,
    olderHomeCount,
    olderHomePercent: percent(olderHomeCount, parcelCount),
    remodelCount,
    remodelPercent: percent(remodelCount, parcelCount),
    newConstructionCount,
    fullDemolitionCount,
    teardownPressureCount,
    teardownPressurePercent: percent(teardownPressureCount, parcelCount),
    soldLastThreeYearsCount,
    soldLastThreeYearsPercent: percent(soldLastThreeYearsCount, parcelCount),
    changingCount
  };
  return {
    ...base,
    healthLabel: areaHealthLabel(base),
    evaluation: areaEvaluation(base)
  };
}

function areaSignal(stats: AreaStatsBase): AreaSignal {
  if (stats.teardownPressureCount >= Math.max(3, stats.parcelCount * 0.03)) return "teardown_pressure";
  if (stats.changingCount >= Math.max(10, stats.parcelCount * 0.2)) return "active";
  if (stats.olderHomeCount >= Math.max(12, stats.parcelCount * 0.28)) return "older_homes";
  if (stats.remodelCount >= Math.max(6, stats.parcelCount * 0.12)) return "watch";
  return "quiet";
}

function areaHealthLabel(stats: AreaStatsBase): string {
  if (stats.teardownPressurePercent >= 4 || stats.teardownPressureCount >= 8) return "Rebuild pressure";
  if (stats.remodelPercent >= 18 && stats.soldLastThreeYearsPercent >= 7) return "Active and in demand";
  if (stats.remodelPercent >= 14) return "Healthy reinvestment";
  if (stats.olderHomePercent >= 30 && stats.remodelPercent < 8) return "Historically stable";
  if (stats.soldLastThreeYearsPercent >= 9) return "High turnover";
  return "Steady neighborhood";
}

function areaEvaluation(stats: AreaStatsBase): string {
  const parts = [
    `${stats.parcelCount.toLocaleString()} homes are in this area.`,
    `${stats.remodelCount.toLocaleString()} (${stats.remodelPercent}%) show recent remodeling or addition activity.`,
    `${stats.olderHomeCount.toLocaleString()} (${stats.olderHomePercent}%) are older homes.`,
    `${stats.soldLastThreeYearsCount.toLocaleString()} (${stats.soldLastThreeYearsPercent}%) sold in the last 3 years.`
  ];
  if (stats.teardownPressureCount > 0) {
    parts.push(
      `${stats.teardownPressureCount.toLocaleString()} (${stats.teardownPressurePercent}%) show a rebuild signal from full demolition or new construction permits.`
    );
  }
  return parts.join(" ");
}

function percent(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((count / total) * 100);
}

function hasFullDemolitionPermit(feature: ParcelFeature): boolean {
  return getHouseEvolutionTimeline(feature.properties).some((event) =>
    event.event_type === "permit" && isFullDemolitionPermitEvent(event)
  );
}

function hasFullNewConstructionPermit(feature: ParcelFeature): boolean {
  return getHouseEvolutionTimeline(feature.properties).some((event) =>
    event.event_type === "permit" && isFullNewConstructionPermitEvent(event)
  );
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
      olderHomePercent: 0,
      remodelCount: 0,
      remodelPercent: 0,
      newConstructionCount: 0,
      teardownPressureCount: hotspot.properties.hotspot_type === "teardown_cluster" ? 1 : 0,
      teardownPressurePercent: 0,
      soldLastThreeYearsCount: 0,
      soldLastThreeYearsPercent: 0,
      changingCount: hotspot.properties.hotspot_type === "changing_area" ? hotspot.properties.parcel_count : 0,
      signal,
      signalLabel: areaSignalLabel(signal),
      healthLabel: areaSignalLabel(signal),
      changeStoryType: changeStoryTypeForSignal(signal),
      changeStoryLabel: changeStoryLabelForSignal(signal),
      changeStoryRead: changeStoryReadForSignal(signal),
      parcelPins: hotspot.properties.parcelPins,
      evaluation: hotspot.properties.description,
      hotspotId: hotspot.properties.id
    },
    geometry: hotspot.geometry
  };
}

function parcelPins(features: ParcelFeature[]): string[] {
  return features
    .map((feature) => feature.properties.pin_normalized || feature.properties.pin_original)
    .filter((pin): pin is string => Boolean(pin));
}

function hotspotSignal(hotspot: HotspotFeature): AreaSignal {
  if (hotspot.properties.hotspot_type === "teardown_cluster") return "teardown_pressure";
  if (hotspot.properties.hotspot_type === "changing_area") return "active";
  if (hotspot.properties.hotspot_type === "old_home_pocket") return "older_homes";
  return "quiet";
}

function changeStoryTypeForSignal(signal: AreaSignal): ChangeStoryType {
  if (signal === "teardown_pressure") return "rebuild_pressure";
  if (signal === "active" || signal === "watch") return "careful_reinvestment";
  if (signal === "older_homes") return "preservation";
  return "dormant";
}

function changeStoryLabelForSignal(signal: AreaSignal): string {
  const labels: Record<AreaSignal, string> = {
    quiet: "Dormant",
    watch: "Careful reinvestment",
    active: "Careful reinvestment",
    teardown_pressure: "Rebuild pressure",
    older_homes: "Preservation"
  };
  return labels[signal];
}

function changeStoryReadForSignal(signal: AreaSignal): string {
  const reads: Record<AreaSignal, string> = {
    quiet: "This zone is mostly quiet.",
    watch: "This zone shows careful reinvestment.",
    active: "This zone shows active reinvestment.",
    teardown_pressure: "This zone shows rebuild pressure.",
    older_homes: "This zone carries older-home fabric."
  };
  return reads[signal];
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
