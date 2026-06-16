import { supabase } from "../supabase/client";
import type { ComparisonRow } from "../../components/ui/ComparisonList";
import type { ComparisonScope } from "../formatters";

export type ParcelProperties = {
  [key: string]: unknown;
  address?: string | null;
  year_built?: number | null;
  pin_normalized?: string | null;
  pin_original?: string | null;
  building_sqft?: number | null;
  land_sqft?: number | null;
  latest_assessed_total?: number | null;
  permit_count?: number | null;
  sale_count?: number | null;
  recent_permit_count?: number | null;
  nearby_teardown_count?: number | null;
  improvement_count?: number | null;
  data_quality_flags?: string[] | null;
  source_note?: string | null;
  municipality?: string | null;
  property_class?: string | null;
  neighborhood_id?: string | null;
  neighborhood_label?: string | null;
  street_name_normalized?: string | null;
  lat?: number | null;
  lng?: number | null;
  decade_built?: string | null;
};

export type PropertyPageData = {
  address?: string | null;
  lat?: number;
  lng?: number;
  yearBuilt?: number | null;
  neighborhoodLabel?: string | null;
  neighborhoodSlug?: string | null;
  streetName?: string | null;
};

export type PropertySale = {
  id: string;
  sale_date: string | null;
  sale_year: number | null;
  sale_price: number | null;
  deed_type: string | null;
  is_market_sale: boolean | null;
  document_number: string | null;
};

export type PropertyPermit = {
  id: string;
  permit_number: string | null;
  local_permit_number: string | null;
  permit_type: string | null;
  description: string | null;
  status: string | null;
  date_issued: string | null;
  amount: number | null;
};

export type HargisRecord = {
  id: string;
  refnum: string | null;
  record_name: string | null;
  location_text: string | null;
  nr_evaluation: string | null;
  arch_class: string | null;
  architect: string | null;
  builder: string | null;
  begin_year: number | null;
  survey_date: string | null;
  match_method: string | null;
  photo_url: string | null;
  pdf_url: string | null;
};

export type PropertyDetailData = {
  properties: ParcelProperties;
  subdivision?: {
    id: string;
    name: string;
    recorded_year?: number | null;
    original_owner?: string | null;
    source_reference?: string | null;
  } | null;
  comparisons?: ComparisonRow[];
  relatedHomes?: Array<{ pin: string; address?: string | null; yearBuilt?: number | null }>;
  sales?: PropertySale[];
  permits?: PropertyPermit[];
  hargisRecords?: HargisRecord[];
};

export async function getPropertyByPin(pin: string): Promise<PropertyPageData> {
  const props = await loadPropertyProps(pin);
  if (!props) throw new Error(`Property not found: ${pin}`);

  const lat = props.lat as number | undefined;
  const lng = props.lng as number | undefined;
  const neighborhoodId = props.neighborhood_id as string | undefined;

  return {
    address: props.address,
    lat,
    lng,
    yearBuilt: props.year_built,
    neighborhoodLabel: (props.neighborhood_label as string | undefined) ?? null,
    neighborhoodSlug: neighborhoodId?.replace("neighborhood:", "") ?? null,
    streetName: (props.street_name_normalized as string | undefined) ?? null,
  };
}

export async function getPropertyDetail(pin: string): Promise<PropertyDetailData | null> {
  const props = await loadPropertyProps(pin);
  if (!props) return null;

  // All supplemental queries run in parallel
  const [
    subdivisionResult,
    comparisonsResult,
    relatedHomesResult,
    salesResult,
    permitsResult,
    hargisResult,
  ] = await Promise.allSettled([
    loadSubdivision(pin),
    loadComparisons(pin, props.year_built as number | null),
    loadRelatedHomes(pin, props.street_name_normalized as string | undefined),
    loadSales(pin),
    loadPermits(pin),
    loadHargisRecords(pin),
  ]);

  return {
    properties: props,
    subdivision: subdivisionResult.status === "fulfilled" ? subdivisionResult.value : null,
    comparisons: comparisonsResult.status === "fulfilled" ? comparisonsResult.value : undefined,
    relatedHomes: relatedHomesResult.status === "fulfilled" ? relatedHomesResult.value : [],
    sales: salesResult.status === "fulfilled" ? salesResult.value : [],
    permits: permitsResult.status === "fulfilled" ? permitsResult.value : [],
    hargisRecords: hargisResult.status === "fulfilled" ? hargisResult.value : [],
  };
}

async function loadSubdivision(pin: string): Promise<PropertyDetailData["subdivision"]> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("property_subdivision_links")
    .select("subdivision_id, subdivisions(id, name, recorded_year, original_owner, source_reference)")
    .eq("pin", pin)
    .maybeSingle();
  if (!data?.subdivisions) return null;
  const sub = data.subdivisions as unknown as Record<string, unknown>;
  return {
    id: String(sub.id ?? ""),
    name: String(sub.name ?? ""),
    recorded_year: sub.recorded_year as number | null,
    original_owner: sub.original_owner as string | null,
    source_reference: sub.source_reference as string | null,
  };
}

async function loadComparisons(pin: string, yearBuilt: number | null): Promise<ComparisonRow[]> {
  if (!supabase || !yearBuilt) return [];
  const { data: cmpData } = await supabase.rpc("parcel_year_comparisons", { p_pin: pin });
  if (!cmpData) return [];
  const SCOPE_LABELS: Record<string, string> = {
    street: "On this street",
    neighborhood: "In this neighborhood",
    city: "Across Park Ridge",
  };
  return (cmpData as Array<Record<string, unknown>>)
    .filter((r) => r.median_year != null)
    .map((r) => ({
      scope: String(r.scope) as ComparisonScope,
      scopeLabel: SCOPE_LABELS[String(r.scope)] ?? String(r.scope),
      propertyValue: Number(r.property_year),
      referenceValue: Math.round(Number(r.median_year)),
      referenceLabel: `Median ${Math.round(Number(r.median_year))}`,
      metric: "year_built" as const,
    }));
}

async function loadRelatedHomes(
  pin: string,
  streetNorm: string | undefined
): Promise<Array<{ pin: string; address?: string | null; yearBuilt?: number | null }>> {
  if (!supabase || !streetNorm) return [];
  const { data } = await supabase
    .from("parcels")
    .select("pin_normalized, pin_original, address, year_built")
    .ilike("street_name_normalized", streetNorm)
    .neq("pin_normalized", pin)
    .limit(6);
  if (!data) return [];
  return (data as Array<Record<string, unknown>>).map((r) => ({
    pin: String(r.pin_normalized ?? r.pin_original ?? ""),
    address: r.address as string | null,
    yearBuilt: r.year_built as number | null,
  }));
}

async function loadSales(pin: string): Promise<PropertySale[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("sales")
    .select("id, sale_date, sale_year, sale_price, deed_type, is_market_sale, document_number")
    .eq("pin", pin)
    .order("sale_date", { ascending: false });
  if (!data) return [];
  return data as PropertySale[];
}

async function loadPermits(pin: string): Promise<PropertyPermit[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("permits")
    .select("id, permit_number, local_permit_number, permit_type, description, status, date_issued, raw_record")
    .eq("pin", pin)
    .order("date_issued", { ascending: false });
  if (!data) return [];
  return (data as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    permit_number: (row.permit_number as string | null) ?? null,
    local_permit_number: (row.local_permit_number as string | null) ?? null,
    permit_type: (row.permit_type as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    status: (row.status as string | null) ?? null,
    date_issued: (row.date_issued as string | null) ?? null,
    amount: row.raw_record
      ? Number((row.raw_record as Record<string, unknown>)["amount"]) || null
      : null,
  }));
}

async function loadHargisRecords(pin: string): Promise<HargisRecord[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("historic_survey_records")
    .select(
      "id, refnum, record_name, location_text, nr_evaluation, arch_class, architect, builder, begin_year, survey_date, match_method, photo_url, pdf_url"
    )
    .eq("pin", pin)
    .order("refnum");
  if (!data) return [];
  return data as HargisRecord[];
}

async function loadPropertyProps(pin: string): Promise<ParcelProperties | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("parcels")
      .select("*")
      .eq("pin_normalized", pin)
      .single();
    if (error || !data) return null;
    const { geometry: _geom, imported_at: _ts, ...rest } = data as Record<string, unknown>;
    return rest as ParcelProperties;
  } catch {
    return null;
  }
}
