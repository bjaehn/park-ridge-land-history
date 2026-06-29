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
  neighborhood_name: string | null;
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
  { key: "electrical",      label: "Electrical",            description: "Electrical panels, wiring, and service upgrades" },
  { key: "plumbing",        label: "Plumbing",              description: "Plumbing, sewer, and water service work" },
  { key: "exterior",        label: "Exterior",              description: "Windows, doors, siding, and exterior repairs" },
  { key: "interior",        label: "Interior Remodel",      description: "Interior renovations, kitchens, baths, and remodeling" },
  { key: "other",           label: "Other",                 description: "Miscellaneous permit work" },
];

export function categorizePermit(description: string | null): string {
  if (!description) return "other";
  const d = description.toLowerCase();
  if (d.includes("deconstruction") || d.includes("demolition")) return "teardown";
  if (
    (d.includes("new") && d.includes("single family")) ||
    d.includes("new construction") ||
    d.includes("new house") ||
    d.includes("new home") ||
    d.includes("new sfr")
  ) return "new-construction";
  if (d.includes("addition")) return "addition";
  if (d.includes("roof") || d.includes("shingle") || d.includes("gutter")) return "roofing";
  if (d.includes("garage")) return "garage";
  if (
    d.includes("hvac") || d.includes("mechanical") || d.includes("furnace") ||
    d.includes("boiler") || d.includes("air condition") || d.includes("heat pump") ||
    d.includes("cooling") || d.includes("heating") || d.includes("water heater") ||
    d.includes("hot water") || d.includes("air handler")
  ) return "mechanical";
  if (d.includes("fence") || d.includes("fencing")) return "fencing";
  if (
    d.includes("electrical") || d.includes("electric panel") || d.includes("wiring") ||
    d.includes("rewire") || d.includes("circuit") || d.includes("service upgrade") ||
    d.includes("generator") || d.includes("panel upgrade") || d.includes("ev charger") ||
    d.includes("solar panel") || d.includes("photovoltaic")
  ) return "electrical";
  if (
    d.includes("plumbing") || d.includes("sewer") || d.includes("water service") ||
    d.includes("water main") || d.includes("sanitary") || d.includes("drain")
  ) return "plumbing";
  if (
    d.includes("window") || d.includes("door") || d.includes("siding") ||
    d.includes("exterior") || d.includes("tuck-point") || d.includes("tuckpoint") ||
    d.includes("masonry repair")
  ) return "exterior";
  if (
    d.includes("remodel") || d.includes("renovation") || d.includes("interior") ||
    d.includes("kitchen") || d.includes("bathroom") || d.includes("basement") ||
    d.includes("drywall") || d.includes("flooring") || d.includes("insulation")
  ) return "interior";
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
    neighborhood_name: (row.neighborhood_name as string | null) ?? null,
    category: categorizePermit((row.description as string | null) ?? null),
  }));
}
