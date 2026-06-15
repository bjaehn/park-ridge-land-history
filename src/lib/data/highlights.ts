import { supabase } from "../supabase/client";

export type HighlightParcel = {
  pin: string;
  address: string;
  yearBuilt: number | null;
  permitCount: number | null;
  latestSaleYear: number | null;
};

export type HighlightCategory = "oldest" | "most_active" | "newest" | "most_recent_sale";
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
    return (data as Array<Record<string, unknown>>).map((r) => ({
      pin: String(r.pin ?? ""),
      address: String(r.address ?? ""),
      yearBuilt: r.year_built != null ? Number(r.year_built) : null,
      permitCount: r.permit_count != null ? Number(r.permit_count) : null,
      latestSaleYear: r.latest_sale_year != null ? Number(r.latest_sale_year) : null,
    }));
  } catch {
    return [];
  }
}
