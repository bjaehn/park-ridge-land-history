import { supabase } from "./client";

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

export type SearchResult = {
  pin: string;
  address: string;
  yearBuilt: number | null;
  permitCount: number | null;
};

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
