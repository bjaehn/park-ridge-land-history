import { supabase } from "../supabase/client";

export type HighlightParcel = {
  pin: string;
  address: string;
  yearBuilt: number | null;
  buildingSqft: number | null;
  saleCount: number | null;
  permitCount: number | null;
};

export type HighlightCategory = "oldest" | "most_active" | "newest" | "most_recent_sale" | "largest";
export type HighlightScope = "city" | "neighborhood" | "street" | "subdivision";

export async function fetchHighlights(
  scope: HighlightScope,
  scopeId: string,
  category: HighlightCategory,
  limit = 5
): Promise<HighlightParcel[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.rpc("highlight_parcels", {
      p_scope: scope,
      p_scope_id: scopeId,
      p_category: category,
      p_limit: limit,
    });
    if (error || !data) return [];

    const rpcRows = data as Array<Record<string, unknown>>;
    const pins = rpcRows.map((r) => String(r.pin ?? "")).filter(Boolean);

    const parcelMap = new Map<string, { building_sqft: number | null; sale_count: number | null }>();
    if (pins.length) {
      const { data: parcels } = await supabase
        .from("parcels")
        .select("pin_normalized, building_sqft, sale_count")
        .in("pin_normalized", pins);
      (parcels as Array<Record<string, unknown>> | null)?.forEach((p) => {
        parcelMap.set(String(p.pin_normalized ?? ""), {
          building_sqft: p.building_sqft != null ? Number(p.building_sqft) : null,
          sale_count: p.sale_count != null ? Number(p.sale_count) : null,
        });
      });
    }

    return rpcRows.map((r) => {
      const pin = String(r.pin ?? "");
      const extra = parcelMap.get(pin);
      return {
        pin,
        address: String(r.address ?? ""),
        yearBuilt: r.year_built != null ? Number(r.year_built) : null,
        buildingSqft: extra?.building_sqft ?? null,
        saleCount: extra?.sale_count ?? null,
        permitCount: r.permit_count != null ? Number(r.permit_count) : null,
      };
    });
  } catch {
    return [];
  }
}
