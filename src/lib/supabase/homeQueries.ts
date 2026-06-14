/**
 * Lightweight Supabase queries for the home page.
 *
 * Each function makes ONE targeted request. The home page calls them
 * in parallel with Promise.all so every section loads in ~200–400ms
 * instead of waiting for 13,381 full parcel rows.
 *
 * These are independent of the main parcel loader in useParkRidgeData.ts.
 */

import { supabase } from "./client";
import type { RankedItem } from "../rankedInsights";
import { formatCurrency } from "../formatters";

// ─── Types ───────────────────────────────────────────────────────────────────

export type HomeStats = {
  totalProperties: number;
  yearBuiltKnown: number;
  yearBuiltPct: number;
  uniqueBlocks: number;
  withPermits: number;
  permitsPct: number;
  withSales: number;
  salesPct: number;
  withAssessments: number;
  historicSurveys: number;
  civicRecords: number;
  sanbornSnapshots: number;
  oldestYear: number | null;
  newestYear: number | null;
  pre1945Count: number;
  pre1945Pct: number;
};

export type DecadeRow = {
  decade: string;
  count: number;
  percent: number;
  isPeak: boolean;
};

// ─── Stats ───────────────────────────────────────────────────────────────────

export async function fetchHomeStats(): Promise<HomeStats | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("home_stats");
  if (error || !data) return null;

  const d = data as Record<string, number | null>;
  const total = Number(d.total_properties ?? 0);
  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  const yearBuiltKnown = Number(d.year_built_known ?? 0);
  const withPermits    = Number(d.with_permits    ?? 0);
  const withSales      = Number(d.with_sales      ?? 0);
  const pre1945Count   = Number(d.pre_1945_count  ?? 0);

  return {
    totalProperties:  total,
    yearBuiltKnown,
    yearBuiltPct:     pct(yearBuiltKnown),
    uniqueBlocks:     Number(d.unique_blocks       ?? 0),
    withPermits,
    permitsPct:       pct(withPermits),
    withSales,
    salesPct:         pct(withSales),
    withAssessments:  Number(d.with_assessments    ?? 0),
    historicSurveys:  Number(d.historic_surveys    ?? 0),
    civicRecords:     Number(d.civic_records       ?? 0),
    sanbornSnapshots: Number(d.sanborn_snapshots   ?? 0),
    oldestYear:       d.oldest_year != null ? Number(d.oldest_year) : null,
    newestYear:       d.newest_year != null ? Number(d.newest_year) : null,
    pre1945Count,
    pre1945Pct:       pct(pre1945Count),
  };
}

// ─── Decade distribution ──────────────────────────────────────────────────────

export async function fetchDecadeDistribution(): Promise<DecadeRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("decade_distribution");
  if (error || !data) return [];

  const rows = data as Array<{ decade: string; count: number }>;
  const total = rows.reduce((s, r) => s + Number(r.count), 0);
  if (total === 0) return [];

  const mapped = rows.map((r) => ({
    decade: r.decade,
    count: Number(r.count),
    percent: Math.round((Number(r.count) / total) * 100),
    isPeak: false,
  }));

  const peak = Math.max(...mapped.map((r) => r.count));
  mapped.forEach((r) => { r.isPeak = r.count === peak; });
  return mapped;
}

// ─── Top 10 oldest properties ─────────────────────────────────────────────────

export async function fetchOldestProperties(limit = 10): Promise<RankedItem[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("parcels")
    .select("pin_normalized, pin_original, address, year_built, decade_built")
    .gte("year_built", 1800)
    .lte("year_built", 2026)
    .order("year_built", { ascending: true })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row, i) => ({
    rank: i + 1,
    pin: (row.pin_normalized ?? row.pin_original ?? "") as string,
    address: (row.address ?? "Unknown address") as string,
    primaryValue: `Built ${row.year_built}`,
    secondaryValue: row.decade_built ? `${row.decade_built}s era` : undefined,
    metric: row.year_built as number,
  }));
}

// ─── Top 10 most permitted ────────────────────────────────────────────────────

export async function fetchMostPermitted(limit = 10): Promise<RankedItem[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("parcels")
    .select("pin_normalized, pin_original, address, permit_count, latest_permit_year")
    .gt("permit_count", 0)
    .order("permit_count", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row, i) => ({
    rank: i + 1,
    pin: (row.pin_normalized ?? row.pin_original ?? "") as string,
    address: (row.address ?? "Unknown address") as string,
    primaryValue: `${Number(row.permit_count).toLocaleString()} permits`,
    secondaryValue: row.latest_permit_year
      ? `Latest: ${row.latest_permit_year}`
      : undefined,
    metric: row.permit_count as number,
  }));
}

// ─── Top 10 assessed value changes ────────────────────────────────────────────

type AssessedRow = {
  pin_normalized: string | null;
  pin_original: string | null;
  address: string | null;
  assessed_value_change_pct: number | null;
  first_assessed_year: number | null;
  latest_assessed_year: number | null;
  first_assessed_total: number | null;
  latest_assessed_total: number | null;
};

export async function fetchTopAssessedChange(limit = 10): Promise<RankedItem[]> {
  if (!supabase) return [];
  const { data, error } = await (supabase
    .from("parcels")
    .select(
      "pin_normalized, pin_original, address, assessed_value_change_pct, " +
      "first_assessed_year, latest_assessed_year, first_assessed_total, latest_assessed_total"
    )
    .gt("assessed_value_change_pct", 0)
    .not("first_assessed_total", "is", null)
    .not("latest_assessed_total", "is", null)
    .order("assessed_value_change_pct", { ascending: false })
    .limit(limit) as unknown as Promise<{ data: AssessedRow[] | null; error: unknown }>);

  if (error || !data) return [];

  return data.map((row, i) => {
    const pct = Number(row.assessed_value_change_pct ?? 0);
    let secondaryValue: string | undefined;
    if (row.first_assessed_year && row.latest_assessed_year && row.first_assessed_total && row.latest_assessed_total) {
      secondaryValue = `${formatCurrency(row.first_assessed_total)} (${row.first_assessed_year}) → ${formatCurrency(row.latest_assessed_total)} (${row.latest_assessed_year})`;
    }
    return {
      rank: i + 1,
      pin: (row.pin_normalized ?? row.pin_original ?? "") as string,
      address: (row.address ?? "Unknown address") as string,
      primaryValue: `+${Math.round(pct)}% assessed value`,
      secondaryValue,
      metric: pct,
    };
  });
}

// ─── Address search ───────────────────────────────────────────────────────────

export type SearchResult = {
  pin: string;
  address: string;
  yearBuilt: number | null;
  permitCount: number | null;
};

export async function searchParcels(query: string, limit = 8): Promise<SearchResult[]> {
  if (!supabase || query.trim().length < 2) return [];
  const q = query.trim().toLowerCase();
  const { data, error } = await supabase
    .from("parcels")
    .select("pin_normalized, pin_original, address, year_built, permit_count")
    .or(`address.ilike.%${q}%,pin_normalized.ilike.%${q}%`)
    .limit(limit);

  if (error || !data) return [];

  return data.map((row) => ({
    pin: (row.pin_normalized ?? row.pin_original ?? "") as string,
    address: (row.address ?? "Unknown address") as string,
    yearBuilt: row.year_built as number | null,
    permitCount: row.permit_count as number | null,
  }));
}
