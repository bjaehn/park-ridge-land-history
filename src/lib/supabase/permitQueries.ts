import { supabase } from "./client";

export type PermitListRow = {
  id: string;
  pin: string;
  permit_number: string | null;
  local_permit_number: string | null;
  permit_type: string | null;
  description: string | null;
  status: string | null;
  date_issued: string | null;
  amount: number | null;
  address: string | null;
  category: string;
};

export type PermitCategoryMeta = {
  key: string;
  label: string;
  description: string;
};

export const PERMIT_CATEGORIES: PermitCategoryMeta[] = [
  { key: "teardown",        label: "Teardown / Demolition", description: "Deconstruction or demolition of existing structures" },
  { key: "new-construction", label: "New Construction",     description: "New single-family homes and major new builds" },
  { key: "addition",        label: "Addition",              description: "Additions and expansions to existing buildings" },
  { key: "roofing",         label: "Roofing",               description: "Roof replacements and repairs" },
  { key: "garage",          label: "Garage",                description: "Garage construction and modifications" },
  { key: "mechanical",      label: "Mechanical / HVAC",     description: "Heating, cooling, and mechanical system work" },
  { key: "fencing",         label: "Fencing",               description: "Fence installation and replacement" },
  { key: "other",           label: "Other",                 description: "Miscellaneous permit work" },
];

export function categorizePermit(description: string | null): string {
  if (!description) return "other";
  const d = description.toLowerCase();
  if (d.includes("deconstruction") || d.includes("demolition")) return "teardown";
  if (
    (d.includes("new") && d.includes("single family")) ||
    d.includes("new construction")
  ) return "new-construction";
  if (d.includes("addition")) return "addition";
  if (d.includes("roof")) return "roofing";
  if (d.includes("garage")) return "garage";
  if (d.includes("hvac") || d.includes("mechanical") || d.includes("furnace") || d.includes("boiler")) return "mechanical";
  if (d.includes("fence") || d.includes("fencing")) return "fencing";
  return "other";
}

export async function fetchPermitList(): Promise<PermitListRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("permit_list");
  if (error || !data) return [];
  return (data as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    pin: String(row.pin ?? ""),
    permit_number: (row.permit_number as string | null) ?? null,
    local_permit_number: (row.local_permit_number as string | null) ?? null,
    permit_type: (row.permit_type as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    status: (row.status as string | null) ?? null,
    date_issued: (row.date_issued as string | null) ?? null,
    amount: row.amount != null ? Number(row.amount) : null,
    address: (row.address as string | null) ?? null,
    category: categorizePermit((row.description as string | null) ?? null),
  }));
}
