"use server";

import { adminSupabase } from "@/lib/supabase/adminClient";

export async function fetchPinsForSubdivision(subdivisionId: string): Promise<string[]> {
  const { data, error } = await adminSupabase
    .from("property_subdivision_links")
    .select("pin")
    .eq("subdivision_id", subdivisionId)
    .limit(1000);

  if (error || !data) return [];
  return (data as Array<{ pin: string }>).map((r) => r.pin);
}
