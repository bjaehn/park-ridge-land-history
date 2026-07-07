"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { adminSupabase } from "@/lib/supabase/adminClient";
import type { BulkLinkResult } from "@/lib/platMappingMessages";

export type { BulkLinkResult };

// ─── AI suggestion types ──────────────────────────────────────────────────────

export type PlatMatchSuggestion = {
  subdivisionId: string;
  name: string;
  confidence: "high" | "medium" | "low";
  reason: string;
};

type SubdivisionForMatching = {
  id: string;
  name: string;
  normalized_name: string;
  alternate_names: string[];
};

// ─── AI match suggestion ──────────────────────────────────────────────────────

export async function suggestPlatMatch(
  shortName: string,
  fullName: string,
  sectionRef: string,
  subdivisions: SubdivisionForMatching[]
): Promise<{ suggestions?: PlatMatchSuggestion[]; error?: string }> {
  const client = new Anthropic();

  const subdivisionList = subdivisions
    .map((s, i) => {
      const alts = s.alternate_names.length > 0 ? ` (also known as: ${s.alternate_names.join(", ")})` : "";
      return `${i + 1}. ${s.id} | ${s.name}${alts}`;
    })
    .join("\n");

  const systemPrompt = `You are matching Cook County Recorder plat name entries to subdivision database records for Park Ridge, IL (Township 40N, Range 12E). The recorder uses abbreviated uppercase names; subdivision records use full mixed-case names.

Return ONLY valid JSON — no prose, no markdown fences:
{"matches":[{"subdivision_id":"uuid-here","name":"Full Name","confidence":"high","reason":"one sentence"}]}

Return up to 3 matches ordered from most to least confident. If nothing is a reasonable match, return {"matches":[]}.
Confidence rules: "high" = clear name match or well-known abbreviation; "medium" = plausible but uncertain; "low" = weak signal only.`;

  const userPrompt = `Recorder entry to match:
  Short name: ${shortName}
  Full name: ${fullName}
  Section: ${sectionRef}

Known subdivisions (uuid | name | alternate names):
${subdivisionList || "  (none loaded)"}`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const rawText = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON object found in response");
    const parsed = JSON.parse(jsonMatch[0]) as { matches: Array<{ subdivision_id: string; name: string; confidence: string; reason: string }> };

    const suggestions: PlatMatchSuggestion[] = parsed.matches.map((m) => ({
      subdivisionId: m.subdivision_id,
      name: m.name,
      confidence: (["high", "medium", "low"].includes(m.confidence) ? m.confidence : "low") as PlatMatchSuggestion["confidence"],
      reason: m.reason,
    }));

    return { suggestions };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Reverse suggestion: subdivision → plat entries ──────────────────────────

export type PlatEntrySuggestion = {
  entryId: string;
  shortName: string;
  fullName: string;
  sectionRef: string;
  hasGisCodes: boolean;
  confidence: "high" | "medium" | "low";
  reason: string;
};

const PR_SECTIONS = ["01-40-12", "02-40-12", "11-40-12", "12-40-12"];

export async function suggestPlatEntriesForSubdivision(
  subdivisionId: string,
  subdivisionName: string,
  alternateNames: string[]
): Promise<{ suggestions?: PlatEntrySuggestion[]; error?: string }> {
  const { data: entries, error: dbError } = await adminSupabase
    .from("recorder_plat_index")
    .select("id, short_name, full_name, section_ref, gis_page_codes")
    .is("subdivision_id", null)
    .in("section_ref", PR_SECTIONS)
    .order("full_name");

  if (dbError) return { error: dbError.message };
  if (!entries?.length) return { suggestions: [] };

  const client = new Anthropic();

  const altStr = alternateNames.length > 0 ? ` (also known as: ${alternateNames.join(", ")})` : "";
  const entryList = entries
    .map(
      (e, i) =>
        `${i + 1}. ${e.id} | ${e.short_name} | ${e.full_name} | section: ${e.section_ref} | has GIS codes: ${e.gis_page_codes?.length ? "yes" : "no"}`
    )
    .join("\n");

  const systemPrompt = `You are finding Cook County Recorder of Deeds plat entries that correspond to a given Park Ridge, IL subdivision. The recorder uses abbreviated uppercase names; subdivision records use full names.

Return ONLY valid JSON — no prose, no markdown fences:
{"matches":[{"entry_id":"uuid-here","short_name":"...","full_name":"...","confidence":"high","reason":"one sentence"}]}

Return up to 3 matches ordered most to least confident. If nothing matches well, return {"matches":[]}.
Confidence: "high" = clear name match; "medium" = plausible; "low" = weak signal only.`;

  const userPrompt = `Find recorder plat entries for this subdivision:
  Name: ${subdivisionName}${altStr}

Unlinked recorder plat entries (uuid | short_name | full_name | section | has GIS codes):
${entryList}`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const rawText = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    const parsed = JSON.parse(jsonMatch[0]) as {
      matches: Array<{ entry_id: string; short_name: string; full_name: string; confidence: string; reason: string }>;
    };

    const entryMap = new Map(entries.map((e) => [e.id, e]));
    const suggestions: PlatEntrySuggestion[] = parsed.matches
      .map((m) => {
        const entry = entryMap.get(m.entry_id);
        if (!entry) return null;
        return {
          entryId: m.entry_id,
          shortName: entry.short_name,
          fullName: entry.full_name,
          sectionRef: entry.section_ref,
          hasGisCodes: !!(entry.gis_page_codes?.length),
          confidence: (["high", "medium", "low"].includes(m.confidence)
            ? m.confidence
            : "low") as PlatEntrySuggestion["confidence"],
          reason: m.reason,
        };
      })
      .filter((s): s is PlatEntrySuggestion => s !== null);

    return { suggestions };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Mark entry as having no match ───────────────────────────────────────────

export async function markNoMatch(id: string): Promise<{ error?: string }> {
  const { error } = await adminSupabase
    .from("recorder_plat_index")
    .update({ notes: "no_match_found" })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/plat-mapping");
  return {};
}

export async function linkPlatIndexEntry(id: string, subdivisionId: string | null) {
  const { error } = await adminSupabase
    .from("recorder_plat_index")
    .update({ subdivision_id: subdivisionId || null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/plat-mapping");
  if (subdivisionId) revalidatePath(`/admin/subdivisions/${subdivisionId}`);
}

export async function savePlatIndexNotes(id: string, notes: string) {
  const { error } = await adminSupabase
    .from("recorder_plat_index")
    .update({ notes: notes.trim() || null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/plat-mapping");
}

export async function savePlatIndexGisCodes(id: string, codes: string[]) {
  const { error } = await adminSupabase
    .from("recorder_plat_index")
    .update({ gis_page_codes: codes.length > 0 ? codes : null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/plat-mapping");
}

// ─── Map view: pins for a set of GIS page codes ──────────────────────────────

export async function fetchPinsForGisPageCodes(codes: string[]): Promise<string[]> {
  if (!codes.length) return [];
  const { data, error } = await adminSupabase.rpc("get_pins_for_gis_page_codes", {
    p_codes: codes,
  });
  if (error || !data) return [];
  return (data as Array<{ pin: string }>).map((r) => r.pin);
}

// ─── Map view: spatial/evidence-based GIS code suggestions ───────────────────

export type GisCodeSuggestion = {
  code: string;
  cnt: number;
  matchType: "direct_evidence" | "spatial_nearby";
  evidenceCount: number;
  evidenceTotal: number;
  distanceM: number | null;
};

export async function fetchGisCodeSuggestionsForSubdivision(
  subdivisionId: string
): Promise<GisCodeSuggestion[]> {
  const { data, error } = await adminSupabase.rpc("suggest_gis_page_codes_for_subdivision", {
    p_subdivision_id: subdivisionId,
  });
  if (error || !data) return [];
  return (
    data as Array<{
      code: string;
      cnt: number;
      match_type: "direct_evidence" | "spatial_nearby";
      evidence_count: number;
      evidence_total: number;
      distance_m: number | null;
    }>
  ).map((r) => ({
    code: r.code,
    cnt: Number(r.cnt),
    matchType: r.match_type,
    evidenceCount: Number(r.evidence_count),
    evidenceTotal: Number(r.evidence_total),
    distanceM: r.distance_m === null ? null : Number(r.distance_m),
  }));
}

// ─── Bulk link / unlink / reassign by GIS page code ──────────────────────────
//
// "Linking a GIS code" bulk-sets parcels.subdivision_id (+ match_method,
// confidence, source) for every parcel whose subdivision_name matches
// 'Assessor subdivision area {CODE}'. subdivision_match_method = 'gis_page_code'
// is written by this code path ONLY (verified: the historical ingestion
// script writes deed-derived match_method values, and manual admin edits go
// through property_subdivision_links and never touch this column at all) --
// so it's a safe, exclusive discriminator for undoing exactly what this tool
// did, without ever touching deed-verified, manually-confirmed, or GIS-lot
// spatial-matched links.

function pageCodesToSubdivisionNames(gisPageCodes: string[]): string[] {
  return gisPageCodes.map((c) => `Assessor subdivision area ${c}`);
}

async function classifyMatchingParcels(
  subdivisionId: string,
  subdivisionNames: string[]
): Promise<Omit<BulkLinkResult, "linkedCount">> {
  // parcels.subdivision_id has no formal foreign key constraint to
  // subdivisions.id (confirmed against the live schema), so PostgREST's
  // embedded-resource syntax (`subdivisions(name)`) can't resolve here --
  // it returns a 400 "could not find a relationship" for every call. Look
  // up subdivision_id values first, then names in a separate query.
  const { data, error } = await adminSupabase
    .from("parcels")
    .select("subdivision_id")
    .eq("municipality", "CITY OF PARK RIDGE")
    .in("subdivision_name", subdivisionNames);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<{ subdivision_id: string | null }>;

  let alreadyLinkedSameCount = 0;
  let alreadyLinkedOtherCount = 0;
  const otherSubdivisionIds = new Set<string>();

  for (const r of rows) {
    if (!r.subdivision_id) continue;
    if (r.subdivision_id === subdivisionId) {
      alreadyLinkedSameCount++;
      continue;
    }
    alreadyLinkedOtherCount++;
    otherSubdivisionIds.add(r.subdivision_id);
  }

  const conflictingNames = new Set<string>();
  if (otherSubdivisionIds.size > 0) {
    const { data: subs } = await adminSupabase
      .from("subdivisions")
      .select("name")
      .in("id", Array.from(otherSubdivisionIds));
    for (const s of (subs ?? []) as Array<{ name: string }>) {
      conflictingNames.add(s.name);
    }
  }

  return {
    totalMatchingCount: rows.length,
    alreadyLinkedSameCount,
    alreadyLinkedOtherCount,
    conflictingSubdivisionNames: Array.from(conflictingNames).slice(0, 5),
  };
}

export async function bulkLinkParcelsByPageCodes(
  subdivisionId: string,
  gisPageCodes: string[]
): Promise<BulkLinkResult> {
  if (!gisPageCodes.length) {
    return {
      linkedCount: 0,
      totalMatchingCount: 0,
      alreadyLinkedSameCount: 0,
      alreadyLinkedOtherCount: 0,
      conflictingSubdivisionNames: [],
    };
  }
  const subdivisionNames = pageCodesToSubdivisionNames(gisPageCodes);
  const classification = await classifyMatchingParcels(subdivisionId, subdivisionNames);

  const { data, error } = await adminSupabase
    .from("parcels")
    .update({
      subdivision_id: subdivisionId,
      subdivision_match_method: "gis_page_code",
      subdivision_confidence: "high",
      subdivision_source: `Cook County Assessor GIS plat page${gisPageCodes.length > 1 ? "s" : ""} ${gisPageCodes.join(", ")}`,
    })
    .eq("municipality", "CITY OF PARK RIDGE")
    .in("subdivision_name", subdivisionNames)
    .is("subdivision_id", null)
    .select("pin_normalized");

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/subdivisions/${subdivisionId}`);
  revalidatePath("/subdivisions");
  revalidatePath("/admin/plat-mapping");
  return { linkedCount: data?.length ?? 0, ...classification };
}

export async function unlinkParcelsByPageCodes(
  subdivisionId: string,
  gisPageCodes: string[]
): Promise<number> {
  if (!gisPageCodes.length) return 0;
  const subdivisionNames = pageCodesToSubdivisionNames(gisPageCodes);

  const { data, error } = await adminSupabase
    .from("parcels")
    .update({
      subdivision_id: null,
      subdivision_match_method: null,
      subdivision_confidence: null,
      subdivision_source: null,
    })
    .eq("municipality", "CITY OF PARK RIDGE")
    .eq("subdivision_id", subdivisionId)
    .eq("subdivision_match_method", "gis_page_code")
    .in("subdivision_name", subdivisionNames)
    .select("pin_normalized");

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/subdivisions/${subdivisionId}`);
  revalidatePath("/subdivisions");
  revalidatePath("/admin/plat-mapping");
  return data?.length ?? 0;
}

export async function reassignParcelsByPageCodes(
  fromSubdivisionId: string,
  toSubdivisionId: string,
  gisPageCodes: string[]
): Promise<number> {
  if (!gisPageCodes.length) return 0;
  await unlinkParcelsByPageCodes(fromSubdivisionId, gisPageCodes);
  const result = await bulkLinkParcelsByPageCodes(toSubdivisionId, gisPageCodes);
  revalidatePath(`/admin/subdivisions/${fromSubdivisionId}`);
  revalidatePath(`/admin/subdivisions/${toSubdivisionId}`);
  revalidatePath("/subdivisions");
  revalidatePath("/admin/plat-mapping");
  return result.linkedCount;
}

// ─── Preview: which parcels a given code+subdivision unlink would affect ─────

export async function fetchLinkedParcelsForPageCodes(
  subdivisionId: string,
  gisPageCodes: string[]
): Promise<Array<{ pin_normalized: string; address: string | null }>> {
  if (!gisPageCodes.length) return [];
  const subdivisionNames = pageCodesToSubdivisionNames(gisPageCodes);

  const { data, error } = await adminSupabase
    .from("parcels")
    .select("pin_normalized, address")
    .eq("municipality", "CITY OF PARK RIDGE")
    .eq("subdivision_id", subdivisionId)
    .eq("subdivision_match_method", "gis_page_code")
    .in("subdivision_name", subdivisionNames)
    .order("address")
    .limit(25);

  if (error) return [];
  return (data ?? []) as Array<{ pin_normalized: string; address: string | null }>;
}

// ─── Split-across-subdivisions drill-down ────────────────────────────────────

export type GisPageCodeSubdivisionBreakdown = {
  subdivisionId: string | null;
  subdivisionName: string | null;
  cnt: number;
};

export async function fetchGisPageCodeSubdivisionBreakdown(
  code: string
): Promise<GisPageCodeSubdivisionBreakdown[]> {
  const { data, error } = await adminSupabase.rpc("get_gis_page_code_subdivision_breakdown", {
    p_code: code,
  });
  if (error || !data) return [];
  return (
    data as Array<{ subdivision_id: string | null; subdivision_name: string | null; cnt: number }>
  ).map((r) => ({
    subdivisionId: r.subdivision_id,
    subdivisionName: r.subdivision_name,
    cnt: Number(r.cnt),
  }));
}
