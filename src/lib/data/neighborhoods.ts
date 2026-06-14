/**
 * Data access layer — neighborhoods.
 *
 * Neighborhoods are groupings of parcels based on common local area names
 * (Uptown, South Park, etc.). Boundaries are approximate and based on
 * parcel centroid location, not official city boundaries.
 *
 * This module wraps buildAreaSummaries() from areaGroups.ts to provide
 * a stable data-access API that routes and pages can depend on.
 *
 * TODO: Consider materializing neighborhood aggregations in Supabase
 * to avoid recomputing them on every page load.
 */

import { buildAreaSummaries } from "../areaGroups";
import type { AreaSummaryCollection, AreaSummaryFeature } from "../areaGroups";
import type { ParcelCollection, ParcelFeature } from "../parcelTypes";

const emptyHotspots: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: []
};

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Build neighborhood summaries from the full parcel collection.
 * Returns an AreaSummaryCollection with one feature per neighborhood.
 *
 * Neighborhood IDs are in the format "neighborhood:slug" (e.g. "neighborhood:uptown").
 * Use neighborhoodSlugFromId() in routeConfig.ts to get the URL slug.
 */
export function getNeighborhoodSummaries(parcels: ParcelCollection | null): AreaSummaryCollection {
  if (!parcels) {
    return { type: "FeatureCollection", features: [] };
  }
  return buildAreaSummaries(parcels, "neighborhoods", emptyHotspots as never);
}

/**
 * Find a single neighborhood by its full area ID (e.g. "neighborhood:uptown").
 * Returns null if not found.
 */
export function getNeighborhoodById(
  summaries: AreaSummaryCollection,
  areaId: string
): AreaSummaryFeature | null {
  return summaries.features.find((n) => n.properties.id === areaId) ?? null;
}

/**
 * Get all parcels belonging to a neighborhood by area summary.
 */
export function getNeighborhoodParcels(
  allParcels: ParcelFeature[],
  neighborhood: AreaSummaryFeature
): ParcelFeature[] {
  const pins = new Set(neighborhood.properties.parcelPins);
  return allParcels.filter((f) => {
    const pin = f.properties.pin_normalized ?? f.properties.pin_original;
    return Boolean(pin && pins.has(pin));
  });
}

/**
 * List only the "named" neighborhood summaries (those with IDs starting
 * with "neighborhood:"). Excludes wards and change zones.
 */
export function getNamedNeighborhoods(
  summaries: AreaSummaryCollection
): AreaSummaryFeature[] {
  return summaries.features
    .filter((n) => n.properties.id.startsWith("neighborhood:"))
    .sort((a, b) => a.properties.label.localeCompare(b.properties.label));
}
