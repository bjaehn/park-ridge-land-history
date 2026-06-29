import { supabase } from "../supabase/client";
import type { BreadcrumbItem } from "../../components/ui/Breadcrumb";

export type PinLevel = "Township" | "Section" | "Block" | "Parcel";

export type PinGroupParcel = {
  pin: string;
  address: string | null;
  yearBuilt: number | null;
  decadeBuilt: string | null;
  buildingSqft: number | null;
  latestAssessedTotal: number | null;
  saleCount: number | null;
  permitCount: number | null;
  isTeardownRebuild: boolean | null;
  teardownConfidence: string | null;
  hasDeedNotes: boolean | null;
  streetNameNormalized: string | null;
  neighborhoodLabel: string | null;
  neighborhoodSlug: string | null;
};

export type PinGroupSummary = {
  prefix: string;
  level: PinLevel;
  levelLabel: string;
  parcelCount: number;
  breadcrumbParts: BreadcrumbItem[];
};

export type PinGroupDetail = PinGroupSummary & { parcels: PinGroupParcel[] };

const LEVEL_BY_LENGTH: Record<number, PinLevel> = {
  2: "Township",
  4: "Section",
  7: "Block",
  10: "Parcel",
};

export function levelForPrefix(prefix: string): PinLevel | null {
  return LEVEL_BY_LENGTH[prefix.length] ?? null;
}

function buildBreadcrumbs(prefix: string): BreadcrumbItem[] {
  const parts: BreadcrumbItem[] = [{ label: "Park Ridge", href: "/city" }];

  const ancestors: { levelName: string; slice: string; href: string }[] = [
    { levelName: "Township", slice: prefix.slice(0, 2),  href: `/pin/${prefix.slice(0, 2)}` },
    { levelName: "Section",  slice: prefix.slice(2, 4),  href: `/pin/${prefix.slice(0, 4)}` },
    { levelName: "Block",    slice: prefix.slice(4, 7),  href: `/pin/${prefix.slice(0, 7)}` },
    { levelName: "Parcel",   slice: prefix.slice(7, 10), href: `/pin/${prefix.slice(0, 10)}` },
  ].filter((a) => a.slice.length > 0);

  ancestors.forEach((a, i) => {
    const isLast = i === ancestors.length - 1;
    const label = `${a.levelName} ${a.slice}`;
    if (isLast) {
      parts.push({ label, current: true });
    } else {
      parts.push({ label, href: a.href });
    }
  });

  return parts;
}

export async function getPinGroupSummary(prefix: string): Promise<PinGroupSummary | null> {
  const level = levelForPrefix(prefix);
  if (!level) return null;
  if (!supabase) return null;

  const { count, error } = await supabase
    .from("parcels")
    .select("pin_normalized", { count: "exact", head: true })
    .ilike("pin_normalized", `${prefix}%`);

  if (error) return null;

  const segValue: Record<PinLevel, string> = {
    Township: prefix.slice(0, 2),
    Section:  prefix.slice(2, 4),
    Block:    prefix.slice(4, 7),
    Parcel:   prefix.slice(7, 10),
  };

  return {
    prefix,
    level,
    levelLabel: `${level} ${segValue[level]}`,
    parcelCount: count ?? 0,
    breadcrumbParts: buildBreadcrumbs(prefix),
  };
}

export async function getPinGroupDetail(prefix: string): Promise<PinGroupDetail | null> {
  const summary = await getPinGroupSummary(prefix);
  if (!summary || !supabase) return null;

  const PAGE_SIZE = 1000;
  const totalCount = summary.parcelCount;
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const db = supabase;
  const select = "pin_normalized, pin_original, address, year_built, decade_built, building_sqft, latest_assessed_total, sale_count, permit_count, is_teardown_rebuild, teardown_confidence, has_deed_research, street_name_normalized, official_planning_neighborhood_label, official_planning_neighborhood_slug";

  const pages = await Promise.all(
    Array.from({ length: pageCount }, (_, i) =>
      db
        .from("parcels")
        .select(select)
        .ilike("pin_normalized", `${prefix}%`)
        .order("address", { ascending: true })
        .range(i * PAGE_SIZE, (i + 1) * PAGE_SIZE - 1)
    )
  );

  const allRows = pages.flatMap((p) => (p.data ?? []) as Array<Record<string, unknown>>);

  const parcels: PinGroupParcel[] = allRows.map((r) => ({
    pin: String(r.pin_normalized ?? r.pin_original ?? ""),
    address: (r.address as string | null) ?? null,
    yearBuilt: (r.year_built as number | null) ?? null,
    decadeBuilt: (r.decade_built as string | null) ?? null,
    buildingSqft: (r.building_sqft as number | null) ?? null,
    latestAssessedTotal: (r.latest_assessed_total as number | null) ?? null,
    saleCount: (r.sale_count as number | null) ?? null,
    permitCount: (r.permit_count as number | null) ?? null,
    isTeardownRebuild: (r.is_teardown_rebuild as boolean | null) ?? null,
    teardownConfidence: (r.teardown_confidence as string | null) ?? null,
    hasDeedNotes: (r.has_deed_research as boolean | null) ?? null,
    streetNameNormalized: (r.street_name_normalized as string | null) ?? null,
    neighborhoodLabel: (r.official_planning_neighborhood_label as string | null) ?? null,
    neighborhoodSlug: (r.official_planning_neighborhood_slug as string | null) ?? null,
  }));

  return { ...summary, parcels };
}

export type CitySection = {
  sectionPrefix: string;
  sectionSegment: string;
  count: number;
  oldestYear: number | null;
  newestYear: number | null;
};

export type CityTownship = {
  prefix: string;
  parcelCount: number;
  sections: CitySection[];
};

export async function getCityTownships(): Promise<CityTownship[]> {
  if (!supabase) return [];

  const PAGE_SIZE = 1000;
  const { count } = await supabase
    .from("parcels")
    .select("pin_normalized", { count: "exact", head: true });

  const totalCount = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const db = supabase;

  const pages = await Promise.all(
    Array.from({ length: pageCount }, (_, i) =>
      db
        .from("parcels")
        .select("pin_normalized, year_built")
        .order("pin_normalized", { ascending: true })
        .range(i * PAGE_SIZE, (i + 1) * PAGE_SIZE - 1)
    )
  );

  const allRows = pages.flatMap(
    (p) => (p.data ?? []) as Array<{ pin_normalized: string; year_built: number | null }>
  );

  const townshipMap = new Map<string, Map<string, { count: number; years: number[] }>>();

  for (const row of allRows) {
    const pin = row.pin_normalized;
    if (!pin || pin.length < 4) continue;
    const twpPrefix = pin.slice(0, 2);
    const secPrefix = pin.slice(0, 4);
    if (!townshipMap.has(twpPrefix)) townshipMap.set(twpPrefix, new Map());
    const secMap = townshipMap.get(twpPrefix)!;
    if (!secMap.has(secPrefix)) secMap.set(secPrefix, { count: 0, years: [] });
    const sec = secMap.get(secPrefix)!;
    sec.count++;
    if (row.year_built) sec.years.push(row.year_built);
  }

  return Array.from(townshipMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([twpPrefix, secMap]) => {
      const sections: CitySection[] = Array.from(secMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([secPrefix, { count, years }]) => ({
          sectionPrefix: secPrefix,
          sectionSegment: secPrefix.slice(2, 4),
          count,
          oldestYear: years.length ? Math.min(...years) : null,
          newestYear: years.length ? Math.max(...years) : null,
        }));
      return {
        prefix: twpPrefix,
        parcelCount: sections.reduce((sum, s) => sum + s.count, 0),
        sections,
      };
    });
}

export async function fetchPinPrefixBbox(prefix: string): Promise<[number, number, number, number] | null> {
  if (!supabase || !prefix) return null;
  try {
    const { data, error } = await supabase.rpc("pin_prefix_bbox", { p_prefix: prefix });
    if (error || !data) return null;
    const b = data as Record<string, number>;
    if (b.minLng == null) return null;
    return [b.minLng, b.minLat, b.maxLng, b.maxLat];
  } catch {
    return null;
  }
}
