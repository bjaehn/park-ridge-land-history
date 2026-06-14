/**
 * Data access layer — historical map layers.
 *
 * Wraps the historical layer manifest loaded by the app.
 * Historical layer data is loaded lazily via loadHistoricalLayerData()
 * in layerLoaders.ts.
 *
 * See: src/lib/historicalLayers.ts for the layer manifest.
 * See: src/lib/layerLoaders.ts for async data loading.
 */

import { loadHistoricalLayerManifest } from "../layerLoaders";
import type { HistoricalLayer } from "../historicalLayerTypes";

// ─── Public API ──────────────────────────────────────────────────────────────

/** Load the manifest of all available historical map layers. */
export async function getHistoricalMapLayers(): Promise<HistoricalLayer[]> {
  return loadHistoricalLayerManifest();
}

/**
 * Find a single layer by ID.
 * Returns null if the layer is not in the manifest.
 */
export function getLayerById(
  layers: HistoricalLayer[],
  layerId: string
): HistoricalLayer | null {
  return layers.find((l) => l.id === layerId) ?? null;
}

/**
 * Filter layers by a tag or type.
 * Example: getLayersByTag(layers, "parcel") returns all parcel-boundary layers.
 */
export function getLayersByTag(
  layers: HistoricalLayer[],
  tag: string
): HistoricalLayer[] {
  return layers.filter(
    (l) =>
      l.id.includes(tag) ||
      (l as unknown as Record<string, unknown>).type === tag
  );
}
