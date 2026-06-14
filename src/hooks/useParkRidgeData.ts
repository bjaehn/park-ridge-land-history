import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase/client";
import { loadHistoricalLayerManifest } from "../lib/layerLoaders";
import { fetchJson } from "../lib/jsonData";
import type { HistoricalLayer } from "../lib/historicalLayerTypes";
import type { WardBoundaryCollection } from "../lib/areaGroups";
import type { ParcelCollection, ParcelFeature } from "../lib/parcelTypes";
import type { RoadParcelHistoryData } from "../lib/roadParcelHistory";

export type ParkRidgeDataState = {
  parcels: ParcelCollection | null;
  boundary: GeoJSON.FeatureCollection | null;
  wardBoundaries: WardBoundaryCollection | null;
  historicalLayers: HistoricalLayer[];
  roadParcelHistory: RoadParcelHistoryData | null;
};

// Columns needed for the map layer — excludes heavy JSONB arrays not used for rendering or analysis.
// The geometry column is handled by the geo+json Accept header (see fetchParcelsFromSupabase).
const MAP_COLUMNS = [
  "pin_normalized", "pin_original", "address", "municipality", "property_class",
  "year_built", "decade_built", "building_sqft", "land_sqft", "improvement_count",
  "permit_count", "latest_permit_year", "nearby_teardown_count",
  "permit_pressure_score", "permit_pressure_type", "permit_stability_type",
  "recent_permit_count", "recent_teardown_count",
  "permit_pressure_1_type", "permit_stability_1_type", "permit_pressure_1_score",
  "recent_permit_1_count", "recent_teardown_1_count",
  "permit_pressure_5_type", "permit_stability_5_type", "permit_pressure_5_score",
  "recent_permit_5_count", "recent_teardown_5_count",
  "permit_pressure_10_type", "permit_stability_10_type", "permit_pressure_10_score",
  "recent_permit_10_count", "recent_teardown_10_count",
  "permit_pressure_all_type", "permit_stability_all_type", "permit_pressure_all_score",
  "recent_permit_all_count", "recent_teardown_all_count",
  "sale_count", "latest_sale_year", "latest_sale_price", "max_sale_price",
  "assessed_year_count", "first_assessed_year", "first_assessed_total",
  "latest_assessed_year", "latest_assessed_total", "assessed_value_change_pct",
  "appeal_count", "latest_appeal_year", "open_appeal_count", "total_assessment_reduction",
  "foreclosure_count_half_mile_5yr", "foreclosure_per_1000_half_mile_5yr",
  "street_block_id", "street_block_tract", "street_block_source",
  "hargis_record_count", "hargis_arch_class", "hargis_architect", "hargis_builder",
  "hargis_photo_count", "hargis_pdf_count",
  "civic_record_count", "directory_record_count", "sanborn_snapshot_count",
  "paper_trail_record_count", "recognized_history_count", "land_family_record_count",
  "land_family_records_json",
  "primary_building_selection_method", "data_quality_flags", "source_note",
  "house_evolution_timeline",
  "centroid_in_target_boundary", "intersects_target_boundary",
  "geometry",
].join(",");

// Supabase hard-caps responses at 1000 rows regardless of Range requested.
// We page in 1000-row chunks and stop when Content-Range tells us we've
// reached the last row.
const PAGE_SIZE = 1000;

async function fetchPage(
  url: string,
  headers: Record<string, string>,
  from: number,
  to: number
): Promise<{ features: ParcelFeature[]; total: number | null }> {
  const resp = await fetch(url, {
    headers: { ...headers, Range: `${from}-${to}`, Prefer: "count=exact" },
  });
  if (!resp.ok) throw new Error(`Supabase parcels fetch failed: HTTP ${resp.status}`);
  const collection = (await resp.json()) as GeoJSON.FeatureCollection;
  const contentRange = resp.headers.get("Content-Range");
  const match = contentRange ? /(\d+)-(\d+)\/(\d+)/.exec(contentRange) : null;
  const total = match ? parseInt(match[3], 10) : null;
  return { features: collection.features as ParcelFeature[], total };
}

async function fetchParcelsFromSupabase(): Promise<ParcelCollection> {
  const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
  const url = `${supabaseUrl}/rest/v1/parcels?select=${MAP_COLUMNS}`;
  const headers: Record<string, string> = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    Accept: "application/geo+json",
    "Range-Unit": "items",
  };

  // First page tells us the total row count via Content-Range
  const first = await fetchPage(url, headers, 0, PAGE_SIZE - 1);

  if (!first.total || first.total <= PAGE_SIZE) {
    return { type: "FeatureCollection", features: first.features };
  }

  // Build all remaining page requests and fire them in parallel
  const remainingPages: Promise<{ features: ParcelFeature[]; total: number | null }>[] = [];
  for (let from = PAGE_SIZE; from < first.total; from += PAGE_SIZE) {
    remainingPages.push(fetchPage(url, headers, from, from + PAGE_SIZE - 1));
  }

  const rest = await Promise.all(remainingPages);
  const allFeatures = [first.features, ...rest.map((r) => r.features)].flat();
  return { type: "FeatureCollection", features: allFeatures };
}

function getSupabaseCredentials(): { supabaseUrl: string; supabaseKey: string } {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
  const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";
  return { supabaseUrl: url.replace(/\/$/, ""), supabaseKey: key };
}

export function useParkRidgeData(): ParkRidgeDataState {
  const [parcels, setParcels] = useState<ParcelCollection | null>(null);
  const [boundary, setBoundary] = useState<GeoJSON.FeatureCollection | null>(null);
  const [wardBoundaries, setWardBoundaries] = useState<WardBoundaryCollection | null>(null);
  const [historicalLayers, setHistoricalLayers] = useState<HistoricalLayer[]>([]);
  const [roadParcelHistory, setRoadParcelHistory] = useState<RoadParcelHistoryData | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadParcels = supabase
      ? fetchParcelsFromSupabase().catch(() =>
          fetchJson<ParcelCollection>("/data/park_ridge_parcels_map.geojson")
        )
      : fetchJson<ParcelCollection>("/data/park_ridge_parcels_map.geojson");

    loadParcels.then((data) => { if (isActive) setParcels(data); });

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

    return () => { isActive = false; };
  }, []);

  return { parcels, boundary, wardBoundaries, historicalLayers, roadParcelHistory };
}
