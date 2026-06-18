import { supabase } from "./client";

export type BlockParcel = {
  pin: string;
  address: string | null;
  yearBuilt: number | null;
  buildingSqft: number | null;
  landSqft: number | null;
  decadeBuilt: string | null;
  saleCount: number | null;
  permitCount: number | null;
};

export type BlockSalesStats = {
  totalSales: number;
  medianPrice: number | null;
  mostRecentYear: number | null;
  mostRecentPrice: number | null;
};

export type BlockPermitStats = {
  totalPermits: number;
  mostRecentYear: number | null;
};

export type BlockAssessmentStats = {
  medianAssessedValue: number | null;
  assessedYear: number | null;
};

export type SectionBlock = {
  blockId: string;
  parcelCount: number;
  oldestYear: number | null;
  newestYear: number | null;
};

// ---------------------------------------------------------------------------
// Block-level queries
// ---------------------------------------------------------------------------

export async function fetchBlockParcels(blockId: string): Promise<BlockParcel[]> {
  if (!supabase || !blockId) return [];
  const { data, error } = await supabase
    .from("parcels")
    .select("pin_normalized, address, year_built, building_sqft, land_sqft, decade_built, sale_count, permit_count")
    .eq("street_block_id", blockId)
    .order("address", { ascending: true });
  if (error || !data) return [];
  return (data as Array<Record<string, unknown>>).map((r) => ({
    pin: String(r.pin_normalized ?? ""),
    address: (r.address as string | null) ?? null,
    yearBuilt: (r.year_built as number | null) ?? null,
    buildingSqft: (r.building_sqft as number | null) ?? null,
    landSqft: (r.land_sqft as number | null) ?? null,
    decadeBuilt: (r.decade_built as string | null) ?? null,
    saleCount: (r.sale_count as number | null) ?? null,
    permitCount: (r.permit_count as number | null) ?? null,
  }));
}

export async function fetchBlockSalesStats(pins: string[]): Promise<BlockSalesStats> {
  if (!supabase || !pins.length) return { totalSales: 0, medianPrice: null, mostRecentYear: null, mostRecentPrice: null };
  const { data, error } = await supabase
    .from("sales")
    .select("sale_year, sale_price, is_market_sale")
    .in("pin", pins)
    .eq("is_market_sale", true)
    .order("sale_year", { ascending: false });
  if (error || !data || !data.length) return { totalSales: 0, medianPrice: null, mostRecentYear: null, mostRecentPrice: null };

  const rows = data as Array<{ sale_year: number | null; sale_price: number | null }>;
  const prices = rows.map((r) => r.sale_price).filter((p): p is number => p != null).sort((a, b) => a - b);
  const mid = Math.floor(prices.length / 2);
  const medianPrice = prices.length
    ? prices.length % 2 === 0 ? (prices[mid - 1] + prices[mid]) / 2 : prices[mid]
    : null;
  const mostRecent = rows[0];

  return {
    totalSales: rows.length,
    medianPrice,
    mostRecentYear: mostRecent?.sale_year ?? null,
    mostRecentPrice: mostRecent?.sale_price ?? null,
  };
}

export async function fetchBlockPermitStats(pins: string[]): Promise<BlockPermitStats> {
  if (!supabase || !pins.length) return { totalPermits: 0, mostRecentYear: null };
  const { data, error } = await supabase
    .from("permits")
    .select("date_issued")
    .in("pin", pins)
    .order("date_issued", { ascending: false });
  if (error || !data || !data.length) return { totalPermits: 0, mostRecentYear: null };

  const rows = data as Array<{ date_issued: string | null }>;
  const mostRecentYear = rows[0]?.date_issued ? new Date(rows[0].date_issued).getFullYear() : null;
  return { totalPermits: rows.length, mostRecentYear };
}

export function computeBlockAssessmentStats(parcels: BlockParcel[], rawParcels: Array<Record<string, unknown>>): BlockAssessmentStats {
  const values = rawParcels
    .map((r) => r.latest_assessed_total as number | null)
    .filter((v): v is number => v != null && v > 0)
    .sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  const medianAssessedValue = values.length
    ? values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid]
    : null;
  const assessedYears = rawParcels
    .map((r) => r.latest_assessed_year as number | null)
    .filter((v): v is number => v != null);
  const assessedYear = assessedYears.length ? Math.max(...assessedYears) : null;
  return { medianAssessedValue, assessedYear };
}

export async function fetchBlockParcelsWithAssessment(blockId: string): Promise<{
  parcels: BlockParcel[];
  assessmentStats: BlockAssessmentStats;
}> {
  if (!supabase || !blockId) return { parcels: [], assessmentStats: { medianAssessedValue: null, assessedYear: null } };
  const { data, error } = await supabase
    .from("parcels")
    .select("pin_normalized, address, year_built, building_sqft, land_sqft, decade_built, latest_assessed_total, latest_assessed_year, sale_count, permit_count")
    .eq("street_block_id", blockId)
    .order("address", { ascending: true });
  if (error || !data) return { parcels: [], assessmentStats: { medianAssessedValue: null, assessedYear: null } };

  const raw = data as Array<Record<string, unknown>>;
  const parcels: BlockParcel[] = raw.map((r) => ({
    pin: String(r.pin_normalized ?? ""),
    address: (r.address as string | null) ?? null,
    yearBuilt: (r.year_built as number | null) ?? null,
    buildingSqft: (r.building_sqft as number | null) ?? null,
    landSqft: (r.land_sqft as number | null) ?? null,
    decadeBuilt: (r.decade_built as string | null) ?? null,
    saleCount: (r.sale_count as number | null) ?? null,
    permitCount: (r.permit_count as number | null) ?? null,
  }));
  const assessmentStats = computeBlockAssessmentStats(parcels, raw);
  return { parcels, assessmentStats };
}

export type BlockSalesByYear = {
  year2015: number | null;
  year2024: number | null;
  pctChange: number | null;
};

export async function fetchBlockSalesByYear(pins: string[]): Promise<BlockSalesByYear> {
  if (!supabase || !pins.length) return { year2015: null, year2024: null, pctChange: null };
  const { data, error } = await supabase
    .from("sales")
    .select("sale_year, sale_price")
    .in("pin", pins)
    .in("sale_year", [2015, 2024])
    .eq("is_market_sale", true);
  if (error || !data || !data.length) return { year2015: null, year2024: null, pctChange: null };

  const rows = data as Array<{ sale_year: number; sale_price: number | null }>;
  const byYear = new Map<number, number[]>();
  rows.forEach((r) => {
    if (!r.sale_price) return;
    const arr = byYear.get(r.sale_year) ?? [];
    arr.push(r.sale_price);
    byYear.set(r.sale_year, arr);
  });

  const median = (prices: number[]): number | null => {
    if (!prices.length) return null;
    const sorted = [...prices].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  };

  const year2015 = median(byYear.get(2015) ?? []);
  const year2024 = median(byYear.get(2024) ?? []);
  const pctChange =
    year2015 && year2024 ? Math.round(((year2024 - year2015) / year2015) * 100) : null;

  return { year2015, year2024, pctChange };
}

export async function fetchBlockBbox(blockId: string): Promise<[number, number, number, number] | null> {
  if (!supabase || !blockId) return null;
  try {
    const { data, error } = await supabase.rpc("block_bbox", { p_block_id: blockId });
    if (error || !data) return null;
    const b = data as Record<string, number>;
    if (b.minLng == null) return null;
    return [b.minLng, b.minLat, b.maxLng, b.maxLat];
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Section-level queries
// ---------------------------------------------------------------------------

export async function fetchSectionBlocks(sectionId: string): Promise<SectionBlock[]> {
  if (!supabase || !sectionId) return [];
  const { data, error } = await supabase
    .from("parcels")
    .select("street_block_id, year_built")
    .like("street_block_id", `${sectionId}%`)
    .not("street_block_id", "is", null);
  if (error || !data) return [];

  const byBlock: Record<string, Array<number | null>> = {};
  for (const row of data as Array<{ street_block_id: string | null; year_built: number | null }>) {
    if (!row.street_block_id) continue;
    if (!byBlock[row.street_block_id]) byBlock[row.street_block_id] = [];
    byBlock[row.street_block_id].push(row.year_built);
  }

  return Object.entries(byBlock)
    .map(([blockId, years]) => {
      const validYears = years.filter((y): y is number => y != null);
      return {
        blockId,
        parcelCount: years.length,
        oldestYear: validYears.length ? Math.min(...validYears) : null,
        newestYear: validYears.length ? Math.max(...validYears) : null,
      };
    })
    .sort((a, b) => a.blockId.localeCompare(b.blockId));
}

export async function fetchSectionParcelsWithAssessment(sectionId: string): Promise<{
  parcels: BlockParcel[];
  assessmentStats: BlockAssessmentStats;
}> {
  if (!supabase || !sectionId) return { parcels: [], assessmentStats: { medianAssessedValue: null, assessedYear: null } };
  const { data, error } = await supabase
    .from("parcels")
    .select("pin_normalized, address, year_built, building_sqft, land_sqft, decade_built, latest_assessed_total, latest_assessed_year, sale_count, permit_count")
    .like("street_block_id", `${sectionId}%`)
    .order("address", { ascending: true });
  if (error || !data) return { parcels: [], assessmentStats: { medianAssessedValue: null, assessedYear: null } };

  const raw = data as Array<Record<string, unknown>>;
  const parcels: BlockParcel[] = raw.map((r) => ({
    pin: String(r.pin_normalized ?? ""),
    address: (r.address as string | null) ?? null,
    yearBuilt: (r.year_built as number | null) ?? null,
    buildingSqft: (r.building_sqft as number | null) ?? null,
    landSqft: (r.land_sqft as number | null) ?? null,
    decadeBuilt: (r.decade_built as string | null) ?? null,
    saleCount: (r.sale_count as number | null) ?? null,
    permitCount: (r.permit_count as number | null) ?? null,
  }));
  const assessmentStats = computeBlockAssessmentStats(parcels, raw);
  return { parcels, assessmentStats };
}

export async function fetchSectionPins(sectionId: string): Promise<string[]> {
  if (!supabase || !sectionId) return [];
  const { data, error } = await supabase
    .from("parcels")
    .select("pin_normalized")
    .like("street_block_id", `${sectionId}%`);
  if (error || !data) return [];
  return (data as Array<{ pin_normalized: string | null }>)
    .map((r) => r.pin_normalized)
    .filter((p): p is string => Boolean(p));
}

export async function fetchSectionBbox(sectionId: string): Promise<[number, number, number, number] | null> {
  if (!supabase || !sectionId) return null;
  try {
    const { data, error } = await supabase.rpc("section_bbox", { p_section_id: sectionId });
    if (error || !data) return null;
    const b = data as Record<string, number>;
    if (b.minLng == null) return null;
    return [b.minLng, b.minLat, b.maxLng, b.maxLat];
  } catch {
    return null;
  }
}
