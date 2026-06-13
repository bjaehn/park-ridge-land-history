import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase/client";
import { fetchJson } from "../lib/jsonData";
import type { ParcelFeature, ParcelProperties } from "../lib/parcelTypes";

type ParcelDetailChunk = {
  prefix: string;
  record_count: number;
  records: Record<string, ParcelProperties>;
};

type ParcelDetailState = {
  selectedParcel: ParcelFeature | null;
  selectedIndexParcel: ParcelFeature | null;
  isLoadingDetail: boolean;
};

const detailChunkCache = new Map<string, Promise<ParcelDetailChunk | null>>();

export function useParcelDetail(
  parcels: GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon, ParcelProperties> | null,
  selectedPin: string | null
): ParcelDetailState {
  const selectedIndexParcel = useMemo(() => {
    if (!parcels || !selectedPin) return null;
    return (
      parcels.features.find((feature) => {
        const pin = feature.properties.pin_normalized || feature.properties.pin_original;
        return pin === selectedPin;
      }) ?? null
    );
  }, [parcels, selectedPin]);

  const [detailProperties, setDetailProperties] = useState<ParcelProperties | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  useEffect(() => {
    let isActive = true;
    setDetailProperties(null);

    if (!selectedPin) {
      setIsLoadingDetail(false);
      return;
    }

    setIsLoadingDetail(true);

    const load = supabase
      ? loadDetailFromSupabase(selectedPin).catch(() => loadDetailFromChunk(selectedPin))
      : loadDetailFromChunk(selectedPin);

    load.then((properties) => {
      if (!isActive) return;
      setDetailProperties(properties);
      setIsLoadingDetail(false);
    });

    return () => { isActive = false; };
  }, [selectedPin]);

  const selectedParcel = useMemo(() => {
    if (!selectedIndexParcel) return null;
    if (!detailProperties) return selectedIndexParcel;
    return {
      ...selectedIndexParcel,
      properties: {
        ...selectedIndexParcel.properties,
        ...detailProperties,
      },
    };
  }, [detailProperties, selectedIndexParcel]);

  return { selectedParcel, selectedIndexParcel, isLoadingDetail };
}

async function loadDetailFromSupabase(pin: string): Promise<ParcelProperties | null> {
  const { data, error } = await supabase!
    .from("parcels")
    .select("*")
    .eq("pin_normalized", pin)
    .single();

  if (error || !data) return null;

  // Strip database-only columns that are not part of ParcelProperties
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { geometry, imported_at, ...properties } = data as Record<string, unknown>;
  return properties as ParcelProperties;
}

async function loadDetailFromChunk(pin: string): Promise<ParcelProperties | null> {
  const prefix = detailPrefix(pin);
  const chunk = await loadDetailChunk(prefix);
  return chunk?.records[pin] ?? null;
}

function loadDetailChunk(prefix: string): Promise<ParcelDetailChunk | null> {
  const existing = detailChunkCache.get(prefix);
  if (existing) return existing;
  const request = fetchJson<ParcelDetailChunk>(`/data/parcel_details/${prefix}.json`);
  detailChunkCache.set(prefix, request);
  return request;
}

function detailPrefix(pin: string): string {
  const normalized = pin.replace(/\D/g, "");
  return normalized.length >= 4 ? normalized.slice(0, 4) : "unknown";
}
