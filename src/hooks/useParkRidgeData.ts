import { useEffect, useState } from "react";
import { loadHistoricalLayerManifest } from "../lib/layerLoaders";
import { fetchJson } from "../lib/jsonData";
import type { HistoricalLayer } from "../lib/historicalLayerTypes";
import type { WardBoundaryCollection } from "../lib/areaGroups";
import type { ParcelCollection } from "../lib/parcelTypes";

export type ParkRidgeDataState = {
  parcels: ParcelCollection | null;
  boundary: GeoJSON.FeatureCollection | null;
  wardBoundaries: WardBoundaryCollection | null;
  historicalLayers: HistoricalLayer[];
};

export function useParkRidgeData(): ParkRidgeDataState {
  const [parcels, setParcels] = useState<ParcelCollection | null>(null);
  const [boundary, setBoundary] = useState<GeoJSON.FeatureCollection | null>(null);
  const [wardBoundaries, setWardBoundaries] = useState<WardBoundaryCollection | null>(null);
  const [historicalLayers, setHistoricalLayers] = useState<HistoricalLayer[]>([]);

  useEffect(() => {
    let isActive = true;

    fetchJson<ParcelCollection>("/data/park_ridge_parcels_map.geojson").then((data) => {
      if (isActive) setParcels(data);
    });
    fetchJson<GeoJSON.FeatureCollection>("/data/park_ridge_boundary.geojson").then((data) => {
      if (isActive) setBoundary(data);
    });
    fetchJson<WardBoundaryCollection>("/data/park_ridge_wards.geojson").then((data) => {
      if (isActive) setWardBoundaries(data);
    });
    loadHistoricalLayerManifest().then((layers) => {
      if (isActive) setHistoricalLayers(layers);
    });

    return () => {
      isActive = false;
    };
  }, []);

  return {
    parcels,
    boundary,
    wardBoundaries,
    historicalLayers
  };
}
