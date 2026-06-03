import { defaultHistoricalLayers } from "./historicalLayers";
import type { HistoricalLayer, HistoricalLayerManifest } from "./historicalLayerTypes";

export async function loadHistoricalLayerManifest(): Promise<HistoricalLayer[]> {
  try {
    const response = await fetch("/data/historical/layer_manifest.json");
    if (!response.ok) return defaultHistoricalLayers;
    const manifest = (await response.json()) as HistoricalLayerManifest;
    return manifest.layers?.length ? manifest.layers : defaultHistoricalLayers;
  } catch {
    return defaultHistoricalLayers;
  }
}

export async function loadHistoricalLayerData(layer: HistoricalLayer): Promise<GeoJSON.FeatureCollection | null> {
  if (!layer.dataPath) return null;
  try {
    const response = await fetch(layer.dataPath);
    if (!response.ok) return null;
    return (await response.json()) as GeoJSON.FeatureCollection;
  } catch {
    return null;
  }
}
