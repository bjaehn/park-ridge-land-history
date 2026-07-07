import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const EMPTY_FC = { type: "FeatureCollection", features: [] };

export async function GET(request: NextRequest) {
  const types = request.nextUrl.searchParams.getAll("type");
  if (types.length === 0) {
    return NextResponse.json({ error: "type required" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json(EMPTY_FC);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc("get_neighborhood_type_boundaries_geojson", {
    p_types: types,
  });

  if (error) {
    return NextResponse.json(EMPTY_FC);
  }

  return NextResponse.json(data ?? EMPTY_FC, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
