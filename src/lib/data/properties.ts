import { supabase } from "../supabase/client";
import type { ComparisonRow } from "../../components/ui/ComparisonList";
import type { ComparisonScope, ConfidenceLevel } from "../formatters";
import { confidenceFor } from "../formatters";
import type { LandLineageEntry, LandLot } from "../subdivisionTypes";
import { fetchLineageForPin } from "../supabase/subdivisionQueries";
import { getLandmarkFactForPin, type HistoricalFact } from "./historicalFacts";

export type AssessmentPoint = { year: number; value: number };

export type ParcelProperties = {
  [key: string]: unknown;
  address?: string | null;
  year_built?: number | null;
  pin_normalized?: string | null;
  pin_original?: string | null;
  pin_township?: string | null;
  pin_section?: string | null;
  pin_block?: string | null;
  pin_parcel?: string | null;
  pin_unit?: string | null;
  building_sqft?: number | null;
  land_sqft?: number | null;
  latest_assessed_total?: number | null;
  latest_assessed_year?: number | null;
  first_assessed_total?: number | null;
  first_assessed_year?: number | null;
  assessed_value_timeline?: AssessmentPoint[] | string | null;
  appeal_count?: number | null;
  latest_appeal_year?: number | null;
  total_assessment_reduction?: number | null;
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
  official_planning_neighborhood_id?: string | null;
  official_planning_neighborhood_label?: string | null;
  official_planning_neighborhood_slug?: string | null;
  business_district_id?: string | null;
  business_district_label?: string | null;
  business_district_slug?: string | null;
  local_neighborhood_id?: string | null;
  local_neighborhood_label?: string | null;
  local_neighborhood_slug?: string | null;
  street_name_normalized?: string | null;
  lat?: number | null;
  lng?: number | null;
  decade_built?: string | null;
  deed_notes?: string | null;
  is_teardown_rebuild?: boolean | null;
  teardown_confidence?: string | null;
};

export type PropertyPageData = {
  address?: string | null;
  lat?: number;
  lng?: number;
  yearBuilt?: number | null;
  buildingSqft?: number | null;
  landSqft?: number | null;
  latestAssessedTotal?: number | null;
  latestSaleYear?: number | null;
  latestSalePrice?: number | null;
  isTeardownRebuild?: boolean | null;
  teardownConfidence?: string | null;
  confidence?: ConfidenceLevel;
  neighborhoodLabel?: string | null;
  neighborhoodSlug?: string | null;
  officialPlanningNeighborhoodLabel?: string | null;
  officialPlanningNeighborhoodSlug?: string | null;
  businessDistrictLabel?: string | null;
  businessDistrictSlug?: string | null;
  localNeighborhoodLabel?: string | null;
  localNeighborhoodSlug?: string | null;
  streetName?: string | null;
  pinNormalized?: string | null;
  subdivision?: { id: string; name: string } | null;
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

export type LandAncestryData = {
  lot_id: string;
  lot_number: string | null;
  block_number: string | null;
  subdivision_name: string | null;
  normalized_subdivision_name: string | null;
  subdivision_id: string | null;
  relationship_type: string | null;
  match_confidence: string | null;
  overlap_pct_of_parcel: number | null;
  overlap_pct_of_lot: number | null;
  source_name: string | null;
};

export type PropertyDataQuality = {
  hasLegalDescription: boolean;
  hasSubdivisionLink: boolean;
  hasLandLineage: boolean;
  hasConstructionYear: boolean;
  citationCoverageScore: number;
};

export type PropertyNote = {
  id: string;
  event_type: string;
  event_year: number | null;
  title: string;
  description: string | null;
  source_name: string | null;
  source_url: string | null;
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
  landLineage?: LandLineageEntry[];
  landAncestry?: LandAncestryData | null;
  comparisons?: ComparisonRow[];
  sales?: PropertySale[];
  permits?: PropertyPermit[];
  hargisRecords?: HargisRecord[];
  appealYears?: number[];
  propertyNotes?: PropertyNote[];
  dataQuality?: PropertyDataQuality | null;
  landmarkFact?: HistoricalFact | null;
};

export type { LandLineageEntry, LandLot };

export async function fetchPropertyBbox(pin: string): Promise<[number, number, number, number] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc("pins_bbox", { pin_array: [pin] });
    if (error || !data) return null;
    const rows = data as Array<{ min_lng: number; min_lat: number; max_lng: number; max_lat: number }>;
    const row = rows?.[0];
    if (!row || row.min_lng == null) return null;
    return [row.min_lng, row.min_lat, row.max_lng, row.max_lat];
  } catch {
    return null;
  }
}

export async function getPropertyByPin(pin: string): Promise<PropertyPageData> {
  const props = await loadPropertyProps(pin);
  if (!props) throw new Error(`Property not found: ${pin}`);

  const lat = props.lat as number | undefined;
  const lng = props.lng as number | undefined;
  // Same precedence as the property page body (local informal name over the
  // official planning district): the legacy `neighborhood_id` column is stale
  // and no longer backfilled, so it must not be read here. Both the
  // breadcrumb (this value) and the page body must derive from the same
  // typed-FK fields or they can disagree about a property's neighborhood.
  const localNeighborhoodLabel = props.local_neighborhood_label as string | undefined;
  const localNeighborhoodSlug = props.local_neighborhood_slug as string | undefined;
  const officialPlanningNeighborhoodLabel = props.official_planning_neighborhood_label as string | undefined;
  const officialPlanningNeighborhoodSlug = props.official_planning_neighborhood_slug as string | undefined;

  const subdivisionResult = await loadSubdivision(pin).catch(() => null);

  return {
    address: props.address,
    lat,
    lng,
    yearBuilt: props.year_built,
    buildingSqft: (props.building_sqft as number | undefined) ?? null,
    landSqft: (props.land_sqft as number | undefined) ?? null,
    latestAssessedTotal: (props.latest_assessed_total as number | undefined) ?? null,
    latestSaleYear: (props.latest_sale_year as number | undefined) ?? null,
    latestSalePrice: (props.latest_sale_price as number | undefined) ?? null,
    isTeardownRebuild: (props.is_teardown_rebuild as boolean | undefined) ?? null,
    teardownConfidence: (props.teardown_confidence as string | undefined) ?? null,
    confidence: confidenceFor(props),
    neighborhoodLabel: localNeighborhoodLabel ?? officialPlanningNeighborhoodLabel ?? null,
    neighborhoodSlug: localNeighborhoodSlug ?? officialPlanningNeighborhoodSlug ?? null,
    officialPlanningNeighborhoodLabel: officialPlanningNeighborhoodLabel ?? null,
    officialPlanningNeighborhoodSlug: officialPlanningNeighborhoodSlug ?? null,
    businessDistrictLabel: (props.business_district_label as string | undefined) ?? null,
    businessDistrictSlug: (props.business_district_slug as string | undefined) ?? null,
    localNeighborhoodLabel: localNeighborhoodLabel ?? null,
    localNeighborhoodSlug: localNeighborhoodSlug ?? null,
    streetName: (props.street_name_normalized as string | undefined) ?? null,
    pinNormalized: (props.pin_normalized as string | undefined) ?? null,
    subdivision: subdivisionResult ? { id: subdivisionResult.id, name: subdivisionResult.name } : null,
  };
}

export async function getPropertyDetail(pin: string): Promise<PropertyDetailData | null> {
  const props = await loadPropertyProps(pin);
  if (!props) return null;

  // All supplemental queries run in parallel
  const [
    subdivisionResult,
    landLineageResult,
    comparisonsResult,
    salesResult,
    permitsResult,
    hargisResult,
    appealYearsResult,
    landAncestryResult,
    propertyNotesResult,
    dataQualityResult,
    landmarkFactResult,
  ] = await Promise.allSettled([
    loadSubdivision(pin),
    loadLandLineage(pin),
    loadComparisons(pin, props.year_built as number | null),
    loadSales(pin),
    loadPermits(pin),
    loadHargisRecords(pin),
    loadAppealYears(pin, props.latest_appeal_year as number | null),
    loadLandAncestry(pin),
    loadPropertyNotes(pin),
    loadDataQuality(pin),
    getLandmarkFactForPin(pin),
  ]);

  return {
    properties: props,
    subdivision: subdivisionResult.status === "fulfilled" ? subdivisionResult.value : null,
    landLineage: landLineageResult.status === "fulfilled" ? landLineageResult.value : [],
    landAncestry: landAncestryResult.status === "fulfilled" ? landAncestryResult.value : null,
    comparisons: comparisonsResult.status === "fulfilled" ? comparisonsResult.value : undefined,
    sales: salesResult.status === "fulfilled" ? salesResult.value : [],
    permits: permitsResult.status === "fulfilled" ? permitsResult.value : [],
    hargisRecords: hargisResult.status === "fulfilled" ? hargisResult.value : [],
    appealYears: appealYearsResult.status === "fulfilled" ? appealYearsResult.value : [],
    propertyNotes: propertyNotesResult.status === "fulfilled" ? propertyNotesResult.value : [],
    dataQuality: dataQualityResult.status === "fulfilled" ? dataQualityResult.value : null,
    landmarkFact: landmarkFactResult.status === "fulfilled" ? landmarkFactResult.value : null,
  };
}

async function loadDataQuality(pin: string): Promise<PropertyDataQuality | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("property_data_quality")
    .select("has_legal_description, has_subdivision_link, has_land_lineage, has_construction_year, citation_coverage_score")
    .eq("pin_normalized", pin)
    .maybeSingle();
  if (!data) return null;
  return {
    hasLegalDescription: Boolean(data.has_legal_description),
    hasSubdivisionLink: Boolean(data.has_subdivision_link),
    hasLandLineage: Boolean(data.has_land_lineage),
    hasConstructionYear: Boolean(data.has_construction_year),
    citationCoverageScore: Number(data.citation_coverage_score ?? 0),
  };
}

/** Format a raw subdivisions row into the shape this page expects. */
function formatSubdivisionRow(sub: Record<string, unknown>): PropertyDetailData["subdivision"] {
  return {
    id: String(sub.id ?? ""),
    name: String(sub.name ?? ""),
    recorded_year: sub.recorded_year as number | null,
    original_owner: sub.original_owner as string | null,
    source_reference: sub.source_reference as string | null,
  };
}

/** Subdivision for this property, checked in the same priority order as the
 *  rest of the app's linkage union: deed research first, then the direct
 *  admin-assigned FK, then GIS-lot spatial matching. A property linked only
 *  by the latter two methods still needs to show its subdivision here.
 */
async function loadSubdivision(pin: string): Promise<PropertyDetailData["subdivision"]> {
  if (!supabase) return null;

  const { data: deedLink } = await supabase
    .from("property_subdivision_links")
    .select("subdivision_id, subdivisions(id, name, recorded_year, original_owner, source_reference)")
    .eq("pin", pin)
    .maybeSingle();
  if (deedLink?.subdivisions) {
    return formatSubdivisionRow(deedLink.subdivisions as unknown as Record<string, unknown>);
  }

  const { data: parcelRow } = await supabase
    .from("parcels")
    .select("subdivision_id")
    .eq("pin_normalized", pin)
    .maybeSingle();
  let subdivisionId = (parcelRow?.subdivision_id as string | null) ?? null;

  if (!subdivisionId) {
    const { data: plrRow } = await supabase
      .from("parcel_lot_relationships")
      .select("gis_lots(subdivision_id)")
      .eq("pin_normalized", pin)
      .eq("is_dominant_lot", true)
      .maybeSingle();
    subdivisionId =
      ((plrRow?.gis_lots as unknown as Record<string, unknown> | null)?.subdivision_id as
        | string
        | null) ?? null;
  }
  if (!subdivisionId) return null;

  const { data: sub } = await supabase
    .from("subdivisions")
    .select("id, name, recorded_year, original_owner, source_reference")
    .eq("id", subdivisionId)
    .maybeSingle();
  if (!sub) return null;
  return formatSubdivisionRow(sub as unknown as Record<string, unknown>);
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

async function loadAppealYears(pin: string, latestAppealYear: number | null): Promise<number[]> {
  if (!supabase) return latestAppealYear ? [latestAppealYear] : [];
  try {
    const { data } = await supabase
      .from("appeals")
      .select("appeal_year")
      .eq("pin_normalized", pin)
      .order("appeal_year");
    if (data && data.length > 0) {
      return (data as Array<{ appeal_year: number | null }>)
        .map((r) => r.appeal_year)
        .filter((y): y is number => y != null);
    }
  } catch {
    // appeals table may not be accessible via public client
  }
  return latestAppealYear ? [latestAppealYear] : [];
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

async function loadPropertyNotes(pin: string): Promise<PropertyNote[]> {
  if (!supabase) return [];
  // source_id is a plain text source_key, not a UUID FK, so PostgREST embedded
  // joins don't work. Fetch notes then look up sources separately.
  const { data: notes } = await supabase
    .from("property_events")
    .select("id, event_type, event_year, title, description, source_id")
    .eq("pin", pin)
    .order("event_year", { ascending: true, nullsFirst: false });
  if (!notes || notes.length === 0) return [];

  const sourceKeys = [...new Set(
    (notes as Array<Record<string, unknown>>)
      .map((n) => n.source_id as string | null)
      .filter((k): k is string => !!k)
  )];
  const sourceMap: Record<string, { source_name: string; source_url: string | null }> = {};
  if (sourceKeys.length > 0) {
    const { data: sources } = await supabase
      .from("source_registry")
      .select("source_key, source_name, source_url")
      .in("source_key", sourceKeys);
    for (const s of sources ?? []) {
      const row = s as { source_key: string; source_name: string; source_url: string | null };
      sourceMap[row.source_key] = { source_name: row.source_name, source_url: row.source_url };
    }
  }

  return (notes as Array<Record<string, unknown>>).map((row) => {
    const src = sourceMap[row.source_id as string] ?? null;
    return {
      id: String(row.id),
      event_type: String(row.event_type ?? "note"),
      event_year: (row.event_year as number | null) ?? null,
      title: String(row.title ?? ""),
      description: (row.description as string | null) ?? null,
      source_name: src?.source_name ?? null,
      source_url: src?.source_url ?? null,
    };
  });
}

async function loadLandLineage(pin: string): Promise<LandLineageEntry[]> {
  if (!supabase) return [];

  // All subdivision links for this PIN, with subdivision details
  const { data: links } = await supabase
    .from("property_subdivision_links")
    .select("subdivision_id, lot_number, block_number, confidence_level, year, subdivisions(id, name, entity_type, recorded_year, confidence_level, geometry_status, parent_subdivision_id)")
    .eq("pin", pin);

  if (!links?.length) return [];

  // Collect parent subdivision IDs to fetch in one query
  const parentIds = links
    .map((l) => (l.subdivisions as unknown as Record<string, unknown> | null)?.parent_subdivision_id as string | undefined)
    .filter((id): id is string => Boolean(id));

  const parentMap = new Map<string, { id: string; name: string; entity_type: string | null }>();
  if (parentIds.length > 0) {
    const { data: parents } = await supabase
      .from("subdivisions")
      .select("id, name, entity_type")
      .in("id", parentIds);
    (parents ?? []).forEach((p: Record<string, unknown>) =>
      parentMap.set(String(p.id), { id: String(p.id), name: String(p.name), entity_type: (p.entity_type as string | null) ?? null })
    );
  }

  // Historical lot rows for this PIN from subdivision_lots
  const [{ data: lots }, lineageRows] = await Promise.all([
    supabase
      .from("subdivision_lots")
      .select("id, subdivision_id, lot_number, block_number, document_date, source_type, notes, confidence_level, data_quality_flags")
      .eq("current_pin", pin),
    fetchLineageForPin(pin),
  ]);

  return links.map((link) => {
    const sub = (link.subdivisions as unknown as Record<string, unknown> | null) ?? {};
    const subId = String(sub.id ?? link.subdivision_id ?? "");
    const parentId = sub.parent_subdivision_id as string | null;

    const subLots: LandLot[] = (lots ?? [])
      .filter((l: Record<string, unknown>) => l.subdivision_id === link.subdivision_id)
      .map((l: Record<string, unknown>) => ({
        id: String(l.id),
        subdivision_id: String(l.subdivision_id),
        lot_number: (l.lot_number as string | null) ?? null,
        block_number: (l.block_number as string | null) ?? null,
        document_date: (l.document_date as string | null) ?? null,
        source_type: (l.source_type as string | null) ?? null,
        notes: (l.notes as string | null) ?? null,
        confidence_level: String(l.confidence_level ?? "unknown"),
        data_quality_flags: (l.data_quality_flags as string[] | null) ?? null,
      }));

    // Fall back to the link-level lot/block when subdivision_lots has no rows yet
    const displayLots: LandLot[] =
      subLots.length > 0
        ? subLots
        : link.lot_number
        ? [
            {
              id: `link-${link.subdivision_id}`,
              subdivision_id: String(link.subdivision_id),
              lot_number: link.lot_number as string | null,
              block_number: link.block_number as string | null,
              document_date: null,
              source_type: null,
              notes: null,
              confidence_level: String(link.confidence_level ?? "unknown"),
              data_quality_flags: null,
            },
          ]
        : [];

    return {
      subdivision: {
        id: subId,
        name: String(sub.name ?? ""),
        entity_type: (sub.entity_type as string | null) ?? null,
        recorded_year: (sub.recorded_year as number | null) ?? null,
        confidence_level: String(sub.confidence_level ?? "unknown"),
        geometry_status: (sub.geometry_status as string | null) ?? null,
      },
      parent_subdivision: parentId ? (parentMap.get(parentId) ?? null) : null,
      lots: displayLots,
      lineage_records: lineageRows.filter(
        (row) =>
          row.child_subdivision_id === subId ||
          row.child_subdivision === String(sub.name ?? "")
      ),
      year: (link.year as number | null) ?? null,
    };
  });
}

async function loadLandAncestry(pin: string): Promise<LandAncestryData | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.rpc("get_land_ancestry_for_pin", { p_pin: pin });
    if (!data || !(data as unknown[]).length) return null;
    const row = (data as Record<string, unknown>[])[0];
    return {
      lot_id: String(row.lot_id ?? ""),
      lot_number: (row.lot_number as string | null) ?? null,
      block_number: (row.block_number as string | null) ?? null,
      subdivision_name: (row.subdivision_name as string | null) ?? null,
      normalized_subdivision_name: (row.normalized_subdivision_name as string | null) ?? null,
      subdivision_id: (row.subdivision_id as string | null) ?? null,
      relationship_type: (row.relationship_type as string | null) ?? null,
      match_confidence: (row.match_confidence as string | null) ?? null,
      overlap_pct_of_parcel: row.overlap_pct_of_parcel != null ? Number(row.overlap_pct_of_parcel) : null,
      overlap_pct_of_lot: row.overlap_pct_of_lot != null ? Number(row.overlap_pct_of_lot) : null,
      source_name: (row.source_name as string | null) ?? null,
    };
  } catch {
    return null;
  }
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
    const props = rest as ParcelProperties;

    // Enrich with labels/slugs for the three typed neighborhood columns.
    const neighborhoodIds = [
      props.official_planning_neighborhood_id,
      props.business_district_id,
      props.local_neighborhood_id,
    ].filter((id): id is string => typeof id === "string");

    if (neighborhoodIds.length > 0) {
      const { data: nData } = await supabase
        .from("neighborhoods")
        .select("id, label, slug")
        .in("id", neighborhoodIds);
      const nMap = new Map(
        (nData ?? []).map((n) => [
          (n as { id: string }).id,
          n as { id: string; label: string; slug: string | null },
        ])
      );
      const opId = props.official_planning_neighborhood_id as string | undefined;
      const bdId = props.business_district_id as string | undefined;
      const lnId = props.local_neighborhood_id as string | undefined;
      if (opId) {
        const n = nMap.get(opId);
        if (n) { props.official_planning_neighborhood_label = n.label; props.official_planning_neighborhood_slug = n.slug; }
      }
      if (bdId) {
        const n = nMap.get(bdId);
        if (n) { props.business_district_label = n.label; props.business_district_slug = n.slug; }
      }
      if (lnId) {
        const n = nMap.get(lnId);
        if (n) { props.local_neighborhood_label = n.label; props.local_neighborhood_slug = n.slug; }
      }
    }

    return props;
  } catch {
    return null;
  }
}

/** All parcel PINs, paginated past PostgREST's default row cap. Used to build the sitemap. */
export async function fetchAllParcelPins(): Promise<string[]> {
  if (!supabase) return [];
  const pins: string[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("parcels")
      .select("pin_normalized")
      .not("pin_normalized", "is", null)
      .range(from, from + pageSize - 1);
    if (error || !data || data.length === 0) break;
    pins.push(...(data as Array<{ pin_normalized: string }>).map((r) => r.pin_normalized));
    if (data.length < pageSize) break;
  }
  return pins;
}
