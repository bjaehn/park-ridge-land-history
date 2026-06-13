import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchJson } from "../lib/jsonData";
import { loadHistoricalLayerManifest } from "../lib/layerLoaders";
import type { HistoricalLayer } from "../lib/historicalLayerTypes";
import type { WardBoundaryCollection } from "../lib/areaGroups";
import type { ParcelCollection, ParcelFeature } from "../lib/parcelTypes";

export type ParkRidgeDataContextValue = {
  parcels: ParcelCollection | null;
  boundary: GeoJSON.FeatureCollection | null;
  wardBoundaries: WardBoundaryCollection | null;
  historicalLayers: HistoricalLayer[];
  isLoading: boolean;
  parcelCount: number;
  parcelsByPin: Map<string, ParcelFeature>;
  searchParcels: (query: string) => ParcelFeature[];
};

const ParkRidgeDataContext = createContext<ParkRidgeDataContextValue>({
  parcels: null,
  boundary: null,
  wardBoundaries: null,
  historicalLayers: [],
  isLoading: true,
  parcelCount: 0,
  parcelsByPin: new Map(),
  searchParcels: () => [],
});

export function ParkRidgeDataProvider({ children }: { children: ReactNode }) {
  const [parcels, setParcels] = useState<ParcelCollection | null>(null);
  const [boundary, setBoundary] = useState<GeoJSON.FeatureCollection | null>(null);
  const [wardBoundaries, setWardBoundaries] = useState<WardBoundaryCollection | null>(null);
  const [historicalLayers, setHistoricalLayers] = useState<HistoricalLayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchJson<ParcelCollection>("/data/park_ridge_parcels_map.geojson"),
      fetchJson<GeoJSON.FeatureCollection>("/data/park_ridge_boundary.geojson"),
      fetchJson<WardBoundaryCollection>("/data/park_ridge_wards.geojson"),
      loadHistoricalLayerManifest(),
    ]).then(([p, b, w, layers]) => {
      if (!active) return;
      if (p) setParcels(p);
      if (b) setBoundary(b);
      if (w) setWardBoundaries(w);
      setHistoricalLayers(layers);
      setIsLoading(false);
    });
    return () => { active = false; };
  }, []);

  const parcelsByPin = useMemo(() => {
    const map = new Map<string, ParcelFeature>();
    for (const f of parcels?.features ?? []) {
      const pin = f.properties.pin_normalized || f.properties.pin_original;
      if (pin) map.set(pin, f);
    }
    return map;
  }, [parcels]);

  const searchParcels = useMemo(() => {
    return (query: string): ParcelFeature[] => {
      if (!parcels || !query.trim()) return [];
      const q = query.trim().toLowerCase();
      const digits = q.replace(/\D/g, "");
      const results: ParcelFeature[] = [];
      for (const f of parcels.features) {
        const pin = (f.properties.pin_normalized || f.properties.pin_original || "").toLowerCase();
        const addr = (f.properties.address || "").toLowerCase();
        const pinDigits = pin.replace(/\D/g, "");
        if (
          addr.includes(q) ||
          pin.includes(q) ||
          (digits.length >= 4 && pinDigits.includes(digits))
        ) {
          results.push(f);
          if (results.length >= 50) break;
        }
      }
      return results;
    };
  }, [parcels]);

  const value: ParkRidgeDataContextValue = {
    parcels,
    boundary,
    wardBoundaries,
    historicalLayers,
    isLoading,
    parcelCount: parcels?.features.length ?? 0,
    parcelsByPin,
    searchParcels,
  };

  return (
    <ParkRidgeDataContext.Provider value={value}>
      {children}
    </ParkRidgeDataContext.Provider>
  );
}

export function useParkRidgeContext(): ParkRidgeDataContextValue {
  return useContext(ParkRidgeDataContext);
}
