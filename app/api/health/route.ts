import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const BUILD_SHA =
  process.env.RAILWAY_GIT_COMMIT_SHA ??
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.GIT_COMMIT_SHA ??
  null;

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let dbReachable = false;
  let dbError: string | null = null;

  if (url && key) {
    try {
      const supabase = createClient(url, key, { auth: { persistSession: false } });
      const { error } = await supabase.from("parcels").select("pin_normalized", { head: true, count: "exact" }).limit(1);
      dbReachable = !error;
      dbError = error?.message ?? null;
    } catch (err) {
      dbError = err instanceof Error ? err.message : "Unknown error";
    }
  } else {
    dbError = "Missing Supabase environment variables";
  }

  const status = dbReachable ? 200 : 503;

  return NextResponse.json(
    {
      ok: dbReachable,
      buildSha: BUILD_SHA,
      timestamp: new Date().toISOString(),
      database: dbReachable ? "reachable" : "unreachable",
      ...(dbError ? { error: dbError } : {}),
    },
    { status }
  );
}
