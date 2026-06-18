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

function buildBreadcrumbs(prefix: string, level: PinLevel): BreadcrumbItem[] {
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

  void level;
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
    breadcrumbParts: buildBreadcrumbs(prefix, level),
  };
}

export async function getPinGroupDetail(prefix: string): Promise<PinGroupDetail | null> {
  const summary = await getPinGroupSummary(prefix);
  if (!summary || !supabase) return null;

  const PAGE_SIZE = 1000;
  const totalCount = summary.parcelCount;
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const db = supabase;
  const select = "pin_normalized, pin_original, address, year_built, decade_built, building_sqft, latest_assessed_total, sale_count, permit_count";

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
  }));

  return { ...summary, parcels };
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
