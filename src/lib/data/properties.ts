/**
 * Data access layer — properties.
 *
 * Single source of truth for loading individual property records.
 * Wraps both the Supabase-backed path and the flat-file fallback.
 *
 * TODO: Once Supabase coverage is complete, remove the flat-file
 * fallback (loadDetailFromChunk) and the detailChunkCache.
 */

import { supabase } from "../supabase/client";
import { fetchJson } from "../jsonData";
import type { ParcelProperties, ParcelFeature } from "../parcelTypes";

// ─── Types ───────────────────────────────────────────────────────────────────

type ParcelDetailChunk = {
  prefix: string;
  record_count: number;
  records: Record<string, ParcelProperties>;
};

// ─── Cache ───────────────────────────────────────────────────────────────────

const detailChunkCache = new Map<string, Promise<ParcelDetailChunk | null>>();

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Load full detail for a single property by PIN.
 * Prefers Supabase; falls back to local flat-file chunks if Supabase
 * is unavailable.
 *
 * Returns null when the property is not found or data is unavailable.
 *
 * TODO: Remove flat-file fallback once Supabase is the sole source.
 */
export async function getPropertyByPin(pin: string): Promise<ParcelProperties | null> {
  if (supabase) {
    try {
      const result = await loadFromSupabase(pin);
      if (result) return result;
    } catch {
      // Fall through to flat-file fallback
    }
  }
  // FALLBACK: static chunk files — temporary technical debt
  // TODO: Migrate remaining properties to Supabase and remove this path
  return loadFromChunk(pin);
}

/**
 * Merge full detail properties onto a base ParcelFeature.
 * Useful when you already have the geometry from the parcel index
 * and just need to overlay the rich detail fields.
 */
export function mergeDetailOntoParcel(
  base: ParcelFeature,
  detail: ParcelProperties
): ParcelFeature {
  return {
    ...base,
    properties: {
      ...base.properties,
      ...detail,
    },
  };
}

// ─── Internal ────────────────────────────────────────────────────────────────

async function loadFromSupabase(pin: string): Promise<ParcelProperties | null> {
  const { data, error } = await supabase!
    .from("parcels")
    .select("*")
    .eq("pin_normalized", pin)
    .single();

  if (error || !data) return null;

  const { geometry, imported_at, ...properties } = data as Record<string, unknown>;
  void geometry;
  void imported_at;
  return properties as ParcelProperties;
}

async function loadFromChunk(pin: string): Promise<ParcelProperties | null> {
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
