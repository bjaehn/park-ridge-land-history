"use server";

import { adminSupabase } from "@/lib/supabase/adminClient";

/**
 * Every PIN linked to this subdivision by any method -- deed text, the
 * legacy direct FK, or GIS-lot spatial match -- not just deed-verified
 * links. Uses the same union as subdivisions.linked_parcel_count
 * (get_linked_pins_for_subdivision RPC) so the map's highlighted parcels
 * and the count shown next to each subdivision's name can't drift apart.
 */
export async function fetchPinsForSubdivision(subdivisionId: string): Promise<string[]> {
  const { data, error } = await adminSupabase.rpc("get_linked_pins_for_subdivision", {
    p_subdivision_id: subdivisionId,
  });

  if (error || !data) return [];
  return (data as Array<{ pin: string }>).map((r) => r.pin);
}
