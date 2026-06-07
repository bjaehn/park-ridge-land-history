import type { ParcelCollection, ParcelFeature } from "./parcelTypes";

type Bounds = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
  centerLat: number;
};

type BlockEntry = {
  feature: ParcelFeature;
  bounds: Bounds;
};

export type PhysicalBlock = {
  anchor: ParcelFeature;
  allParcels: ParcelFeature[];
  contextParcels: ParcelFeature[];
  method: string;
  isStreetBounded: boolean;
  capped: boolean;
};

const maxBlockParcels = 120;
const parcelFabricGapFeet = 14;

export function buildPhysicalBlock(anchor: ParcelFeature, parcels: ParcelCollection | null): PhysicalBlock | null {
  if (!parcels) return null;
  const anchorKey = parcelKey(anchor);
  const anchorStreetBlockId = cleanBlockId(anchor.properties.street_block_id);
  if (anchorStreetBlockId) {
    const allParcels = parcels.features.filter(
      (feature) => cleanBlockId(feature.properties.street_block_id) === anchorStreetBlockId
    );
    return {
      anchor,
      allParcels,
      contextParcels: allParcels.filter((feature) => parcelKey(feature) !== anchorKey),
      method: "Street-bounded block from U.S. Census TIGER/Line tabulation block geography.",
      isStreetBounded: true,
      capped: false
    };
  }

  const entries = parcels.features
    .map((feature) => {
      const bounds = boundsForFeature(feature);
      return bounds ? { feature, bounds } : null;
    })
    .filter((entry): entry is BlockEntry => Boolean(entry));

  const anchorIndex = entries.findIndex((entry) => parcelKey(entry.feature) === anchorKey);
  if (anchorIndex < 0) return null;

  const selectedIndexes = new Set<number>([anchorIndex]);
  const queue = [anchorIndex];
  let capped = false;

  while (queue.length > 0) {
    const currentIndex = queue.shift();
    if (currentIndex === undefined) break;
    const current = entries[currentIndex];

    for (let candidateIndex = 0; candidateIndex < entries.length; candidateIndex += 1) {
      if (selectedIndexes.has(candidateIndex)) continue;
      const candidate = entries[candidateIndex];
      if (boundsGapFeet(current.bounds, candidate.bounds) > parcelFabricGapFeet) continue;

      selectedIndexes.add(candidateIndex);
      queue.push(candidateIndex);
      if (selectedIndexes.size >= maxBlockParcels) {
        capped = true;
        queue.length = 0;
        break;
      }
    }
  }

  const allParcels = Array.from(selectedIndexes).map((index) => entries[index].feature);
  const contextParcels = allParcels.filter((feature) => parcelKey(feature) !== anchorKey);

  return {
    anchor,
    allParcels,
    contextParcels,
    method: "Physical block estimated from parcel adjacency. Street gaps stop the block.",
    isStreetBounded: false,
    capped
  };
}

export function parcelCollectionFromFeatures(features: ParcelFeature[]): ParcelCollection {
  return {
    type: "FeatureCollection",
    features
  };
}

function parcelKey(feature: ParcelFeature): string {
  return feature.properties.pin_normalized || feature.properties.pin_original || feature.properties.address || "";
}

function cleanBlockId(value?: string | null): string | null {
  if (!value) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function boundsForFeature(feature: ParcelFeature): Bounds | null {
  const coordinates = flattenCoordinates(feature.geometry.coordinates);
  if (coordinates.length === 0) return null;

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  coordinates.forEach(([lng, lat]) => {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  });

  if (!Number.isFinite(minLng) || !Number.isFinite(minLat) || !Number.isFinite(maxLng) || !Number.isFinite(maxLat)) {
    return null;
  }

  return {
    minLng,
    minLat,
    maxLng,
    maxLat,
    centerLat: (minLat + maxLat) / 2
  };
}

function flattenCoordinates(
  coordinates: GeoJSON.Polygon["coordinates"] | GeoJSON.MultiPolygon["coordinates"]
): GeoJSON.Position[] {
  if (!Array.isArray(coordinates[0][0][0])) {
    return (coordinates as GeoJSON.Polygon["coordinates"]).flat();
  }
  return (coordinates as GeoJSON.MultiPolygon["coordinates"]).flat(2);
}

function boundsGapFeet(a: Bounds, b: Bounds): number {
  const latScale = 364000;
  const lngScale = Math.cos(((a.centerLat + b.centerLat) / 2) * (Math.PI / 180)) * latScale;
  const lngGap = axisGap(a.minLng, a.maxLng, b.minLng, b.maxLng) * lngScale;
  const latGap = axisGap(a.minLat, a.maxLat, b.minLat, b.maxLat) * latScale;
  return Math.sqrt(lngGap * lngGap + latGap * latGap);
}

function axisGap(aMin: number, aMax: number, bMin: number, bMax: number): number {
  if (aMax < bMin) return bMin - aMax;
  if (bMax < aMin) return aMin - bMax;
  return 0;
}
