"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { adminSupabase } from "@/lib/supabase/adminClient";

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

export async function bulkLinkParcelsByPageCodes(
  subdivisionId: string,
  gisPageCodes: string[]
): Promise<number> {
  if (!gisPageCodes.length) return 0;
  const subdivisionNames = gisPageCodes.map((c) => `Assessor subdivision area ${c}`);

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
  return data?.length ?? 0;
}
