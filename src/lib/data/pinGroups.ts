import { supabase } from "../supabase/client";
import type { BreadcrumbItem } from "../../components/ui/Breadcrumb";

export type PinLevel = "Township" | "Section" | "Block" | "Parcel";

export type PinGroupParcel = {
  pin: string;
  address: string | null;
  yearBuilt: number | null;
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

  const { data, error } = await supabase
    .from("parcels")
    .select("pin_normalized, pin_original, address, year_built")
    .ilike("pin_normalized", `${prefix}%`)
    .order("address", { ascending: true });

  if (error || !data) return { ...summary, parcels: [] };

  const parcels: PinGroupParcel[] = data.map((r) => ({
    pin: String(r.pin_normalized ?? r.pin_original ?? ""),
    address: r.address as string | null,
    yearBuilt: r.year_built as number | null,
  }));

  return { ...summary, parcels };
}
