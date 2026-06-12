import { useEffect, useState } from "react";
import { loadHistoricalLayerManifest } from "../lib/layerLoaders";
import { fetchJson } from "../lib/jsonData";
import type { HistoricalLayer } from "../lib/historicalLayerTypes";
import type { WardBoundaryCollection } from "../lib/areaGroups";
import type { ParcelCollection } from "../lib/parcelTypes";
import type { RoadParcelHistoryData } from "../lib/roadParcelHistory";

export type ParkRidgeDataState = {
  parcels: ParcelCollection | null;
  boundary: GeoJSON.FeatureCollection | null;
  wardBoundaries: WardBoundaryCollection | null;
  historicalLayers: HistoricalLayer[];
  roadParcelHistory: RoadParcelHistoryData | null;
};

export function useParkRidgeData(): ParkRidgeDataState {
  const [parcels, setParcels] = useState<ParcelCollection | null>(null);
  const [boundary, setBoundary] = useState<GeoJSON.FeatureCollection | null>(null);
  const [wardBoundaries, setWardBoundaries] = useState<WardBoundaryCollection | null>(null);
  const [historicalLayers, setHistoricalLayers] = useState<HistoricalLayer[]>([]);
  const [roadParcelHistory, setRoadParcelHistory] = useState<RoadParcelHistoryData | null>(null);

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
    fetchJson<RoadParcelHistoryData>("/data/historical/road_parcel_history_sample.json").then((data) => {
      if (isActive) setRoadParcelHistory(data);
    });

    return () => {
      isActive = false;
    };
  }, []);

  return {
    parcels,
    boundary,
    wardBoundaries,
    historicalLayers,
    roadParcelHistory
  };
}
