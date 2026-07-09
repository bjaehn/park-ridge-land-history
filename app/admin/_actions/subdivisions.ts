"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { adminSupabase } from "@/lib/supabase/adminClient";
import { logAdminChange } from "@/lib/adminAudit";

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  return v && typeof v === "string" && v.trim() ? v.trim() : null;
}
function num(fd: FormData, key: string): number | null {
  const v = fd.get(key);
  if (!v || typeof v !== "string" || !v.trim()) return null;
  const n = parseInt(v.trim(), 10);
  return isNaN(n) ? null : n;
}

// ─── Subdivision ──────────────────────────────────────────────────────────────

function deriveRecordedYear(formData: FormData): number | null {
  const explicit = num(formData, "recorded_year");
  if (explicit !== null) return explicit;
  const dateStr = str(formData, "recorded_date");
  if (!dateStr) return null;
  const year = parseInt(dateStr.split("-")[0], 10);
  return isNaN(year) ? null : year;
}

export async function createSubdivision(formData: FormData) {
  const alternateNames = (formData.getAll("alternate_names") as string[]).filter(Boolean);
  const { data, error } = await adminSupabase
    .from("subdivisions")
    .insert({
      name:                     str(formData, "name") ?? "",
      normalized_name:          str(formData, "normalized_name") ?? "",
      display_name:             str(formData, "display_name"),
      slug:                     str(formData, "slug"),
      alternate_names:          alternateNames.length ? alternateNames : null,
      entity_type:              str(formData, "entity_type"),
      recorded_date:            str(formData, "recorded_date"),
      recorded_year:            deriveRecordedYear(formData),
      development_era_start_year: num(formData, "development_era_start_year"),
      development_era_end_year:   num(formData, "development_era_end_year"),
      plat_book:                str(formData, "plat_book"),
      plat_page:                str(formData, "plat_page"),
      document_number:          str(formData, "document_number"),
      original_owner:           str(formData, "original_owner"),
      developer:                str(formData, "developer"),
      surveyor:                 str(formData, "surveyor"),
      confidence_level:         str(formData, "confidence_level") ?? "unknown",
      confidence_reason:        str(formData, "confidence_reason"),
      status:                   str(formData, "status"),
      geometry_status:          str(formData, "geometry_status"),
      source_name:              str(formData, "source_name"),
      source_reference:         str(formData, "source_reference"),
      source_url:               str(formData, "source_url"),
      notes:                    str(formData, "notes"),
      historical_summary:       str(formData, "historical_summary"),
      parent_subdivision_id:    str(formData, "parent_subdivision_id") || null,
    })
    .select("id")
    .single();

  revalidatePath("/admin/subdivisions");
  if (error) return { error: error.message };
  return { id: data.id };
}

export async function updateSubdivision(id: string, formData: FormData) {
  const alternateNames = (formData.getAll("alternate_names") as string[]).filter(Boolean);
  const { error } = await adminSupabase
    .from("subdivisions")
    .update({
      name:                     str(formData, "name") ?? "",
      normalized_name:          str(formData, "normalized_name") ?? "",
      display_name:             str(formData, "display_name"),
      slug:                     str(formData, "slug"),
      alternate_names:          alternateNames.length ? alternateNames : null,
      entity_type:              str(formData, "entity_type"),
      recorded_date:            str(formData, "recorded_date"),
      recorded_year:            deriveRecordedYear(formData),
      development_era_start_year: num(formData, "development_era_start_year"),
      development_era_end_year:   num(formData, "development_era_end_year"),
      plat_book:                str(formData, "plat_book"),
      plat_page:                str(formData, "plat_page"),
      document_number:          str(formData, "document_number"),
      original_owner:           str(formData, "original_owner"),
      developer:                str(formData, "developer"),
      surveyor:                 str(formData, "surveyor"),
      confidence_level:         str(formData, "confidence_level") ?? "unknown",
      confidence_reason:        str(formData, "confidence_reason"),
      status:                   str(formData, "status"),
      geometry_status:          str(formData, "geometry_status"),
      source_name:              str(formData, "source_name"),
      source_reference:         str(formData, "source_reference"),
      source_url:               str(formData, "source_url"),
      notes:                    str(formData, "notes"),
      historical_summary:       str(formData, "historical_summary"),
      parent_subdivision_id:    str(formData, "parent_subdivision_id") || null,
      updated_at:               new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath("/admin/subdivisions");
  revalidatePath(`/admin/subdivisions/${id}`);
  if (error) return { error: error.message };
  return {};
}

export async function deleteSubdivision(id: string) {
  const { error } = await adminSupabase.from("subdivisions").delete().eq("id", id);
  revalidatePath("/admin/subdivisions");
  if (error) return { error: error.message };
  return {};
}

// ─── Timeline Events ─────────────────────────────────────────────────────────

export async function upsertTimelineEvent(
  subdivisionId: string,
  eventId: string | null,
  formData: FormData
) {
  const payload = {
    subdivision_id:  subdivisionId,
    event_year:      num(formData, "event_year"),
    event_date:      str(formData, "event_date"),
    event_type:      str(formData, "event_type") ?? "other",
    title:           str(formData, "title") ?? "",
    description:     str(formData, "description"),
    source_name:     str(formData, "source_name"),
    source_reference: str(formData, "source_reference"),
    confidence_level: str(formData, "confidence_level") ?? "unknown",
  };

  const { error } = eventId
    ? await adminSupabase.from("subdivision_timeline_events").update(payload).eq("id", eventId)
    : await adminSupabase.from("subdivision_timeline_events").insert(payload);

  revalidatePath(`/admin/subdivisions/${subdivisionId}`);
  if (error) return { error: error.message };
  return {};
}

export async function deleteTimelineEvent(eventId: string, subdivisionId: string) {
  const { error } = await adminSupabase
    .from("subdivision_timeline_events")
    .delete()
    .eq("id", eventId);
  revalidatePath(`/admin/subdivisions/${subdivisionId}`);
  if (error) return { error: error.message };
  return {};
}

// ─── Sources ─────────────────────────────────────────────────────────────────

export async function upsertSource(
  subdivisionId: string,
  sourceId: string | null,
  formData: FormData
) {
  const payload = {
    subdivision_id:   subdivisionId,
    source_type:      str(formData, "source_type"),
    source_name:      str(formData, "source_name") ?? "",
    source_reference: str(formData, "source_reference"),
    source_url:       str(formData, "source_url"),
    retrieved_at:     str(formData, "retrieved_at"),
    notes:            str(formData, "notes"),
  };

  const { error } = sourceId
    ? await adminSupabase.from("subdivision_sources").update(payload).eq("id", sourceId)
    : await adminSupabase.from("subdivision_sources").insert(payload);

  revalidatePath(`/admin/subdivisions/${subdivisionId}`);
  if (error) return { error: error.message };
  return {};
}

export async function deleteSource(sourceId: string, subdivisionId: string) {
  const { error } = await adminSupabase.from("subdivision_sources").delete().eq("id", sourceId);
  revalidatePath(`/admin/subdivisions/${subdivisionId}`);
  if (error) return { error: error.message };
  return {};
}

// ─── Aliases ─────────────────────────────────────────────────────────────────

export async function upsertAlias(
  subdivisionId: string,
  aliasId: string | null,
  formData: FormData
) {
  const payload = {
    subdivision_id: subdivisionId,
    alias:          str(formData, "alias") ?? "",
    alias_type:     str(formData, "alias_type"),
    confidence:     str(formData, "confidence") ?? "unknown",
  };

  const { error } = aliasId
    ? await adminSupabase.from("subdivision_aliases").update(payload).eq("id", aliasId)
    : await adminSupabase.from("subdivision_aliases").insert(payload);

  revalidatePath(`/admin/subdivisions/${subdivisionId}`);
  if (error) return { error: error.message };
  return {};
}

export async function deleteAlias(aliasId: string, subdivisionId: string) {
  const { error } = await adminSupabase.from("subdivision_aliases").delete().eq("id", aliasId);
  revalidatePath(`/admin/subdivisions/${subdivisionId}`);
  if (error) return { error: error.message };
  return {};
}

// ─── Lots ────────────────────────────────────────────────────────────────────

export async function upsertLot(
  subdivisionId: string,
  lotId: string | null,
  formData: FormData
) {
  const payload = {
    subdivision_id:  subdivisionId,
    lot_number:      str(formData, "lot_number"),
    block_number:    str(formData, "block_number"),
    current_pin:     str(formData, "current_pin"),
    current_address: str(formData, "current_address"),
    lot_status:      str(formData, "lot_status"),
    match_method:    str(formData, "match_method"),
    confidence_level: str(formData, "confidence_level") ?? "unknown",
    notes:           str(formData, "notes"),
  };

  const { error } = lotId
    ? await adminSupabase.from("subdivision_lots").update(payload).eq("id", lotId)
    : await adminSupabase.from("subdivision_lots").insert(payload);

  revalidatePath(`/admin/subdivisions/${subdivisionId}`);
  if (error) return { error: error.message };
  return {};
}

export async function deleteLot(lotId: string, subdivisionId: string) {
  const { error } = await adminSupabase.from("subdivision_lots").delete().eq("id", lotId);
  revalidatePath(`/admin/subdivisions/${subdivisionId}`);
  if (error) return { error: error.message };
  return {};
}

// ─── Duplicate detection & merge ───────────────────────────────────────────────

export async function findDuplicateCandidates(threshold = 0.45) {
  const { data, error } = await adminSupabase.rpc("find_subdivision_duplicate_candidates", {
    similarity_threshold: threshold,
  });
  if (error) return { error: error.message, candidates: [] as never[] };
  return { candidates: data ?? [] };
}

/** Reassigns all references from loserId to winnerId, then marks loserId deprecated. Never deletes. */
export async function mergeSubdivisions(winnerId: string, loserId: string) {
  const { error } = await adminSupabase.rpc("merge_subdivisions", {
    winner_id: winnerId,
    loser_id: loserId,
  });
  revalidatePath("/admin/subdivisions");
  revalidatePath("/admin/subdivisions/duplicates");
  revalidatePath(`/admin/subdivisions/${winnerId}`);
  revalidatePath(`/admin/subdivisions/${loserId}`);
  if (error) return { error: error.message };
  await logAdminChange([
    {
      tableName: "subdivisions",
      rowId: loserId,
      fieldName: "merged_into",
      oldValue: loserId,
      newValue: winnerId,
      action: "merge",
    },
  ], { changeGroup: crypto.randomUUID() });
  return {};
}

// ─── AI-assisted subdivision analysis ──────────────────────────────────────────
//
// The trigram similarity check above (find_subdivision_duplicate_candidates)
// is a mechanical name/alias match -- it flags pairs but can't tell you
// *why*, or whether the right move is a merge, a parent/child link, or
// leaving them alone. This reads the actual record content (aliases,
// summaries, developer names, linked deed excerpts) for each candidate pair
// and asks the model to reason about it, the same way a person cross-
// referencing deed language by hand would.

export type SubdivisionAIVerdict = "likely_same" | "parent_child" | "likely_different" | "unclear";

export type SubdivisionAISuggestion = {
  subdivision_a_id: string;
  subdivision_a_name: string;
  subdivision_b_id: string;
  subdivision_b_name: string;
  similarity_score: number;
  verdict: SubdivisionAIVerdict;
  reasoning: string;
  recommended_action: string;
};

type SubRow = {
  id: string;
  name: string;
  normalized_name: string;
  alternate_names: string[] | null;
  recorded_year: number | null;
  entity_type: string | null;
  historical_summary: string | null;
  original_owner: string | null;
  developer: string | null;
  parent_subdivision_id: string | null;
};

/**
 * Analyzes ONE batch of candidate pairs at a time. The full candidate list
 * routinely runs into the hundreds (249 at the default threshold as of this
 * writing) -- sending all of them in one prompt overflows the AI's output
 * token limit and truncates the JSON response mid-array. Batching keeps
 * each call small and lets the UI show incremental progress with a stop
 * button, the same pattern as the deed-parse batch runner.
 */
export async function analyzeSubdivisionDuplicatesWithAI(
  threshold = 0.4,
  offset = 0,
  batchSize = 8
): Promise<{
  suggestions?: SubdivisionAISuggestion[];
  total?: number;
  nextOffset?: number;
  hasMore?: boolean;
  error?: string;
}> {
  const { data: allCandidates, error: candErr } = await adminSupabase.rpc(
    "find_subdivision_duplicate_candidates",
    { similarity_threshold: threshold }
  );
  if (candErr) return { error: candErr.message };
  if (!allCandidates || allCandidates.length === 0) return { suggestions: [], total: 0, hasMore: false };

  const total = allCandidates.length;
  const candidates = allCandidates.slice(offset, offset + batchSize);
  if (candidates.length === 0) return { suggestions: [], total, hasMore: false };

  const ids = [...new Set(candidates.flatMap((c: { subdivision_a_id: string; subdivision_b_id: string }) => [c.subdivision_a_id, c.subdivision_b_id]))];

  const [{ data: subsRaw }, { data: countsRaw }, { data: aliasesRaw }, { data: lineageAsChild }, { data: lineageAsParent }] = await Promise.all([
    adminSupabase
      .from("subdivisions")
      .select("id, name, normalized_name, alternate_names, recorded_year, entity_type, historical_summary, original_owner, developer, parent_subdivision_id")
      .in("id", ids),
    adminSupabase.from("subdivision_property_counts").select("subdivision_id, total_properties, deeded_properties").in("subdivision_id", ids),
    adminSupabase.from("subdivision_aliases").select("subdivision_id, alias").in("subdivision_id", ids),
    adminSupabase.from("historical_subdivision_lineage").select("child_subdivision_id, source_text").in("child_subdivision_id", ids).limit(200),
    adminSupabase.from("historical_subdivision_lineage").select("parent_subdivision_id, source_text").in("parent_subdivision_id", ids).limit(200),
  ]);

  const subsById = new Map<string, SubRow>((subsRaw ?? []).map((s: SubRow) => [s.id, s]));
  const countsById = new Map<string, { total: number; deeded: number }>(
    (countsRaw ?? []).map((c: { subdivision_id: string; total_properties: number; deeded_properties: number }) => [
      c.subdivision_id,
      { total: Number(c.total_properties), deeded: Number(c.deeded_properties) },
    ])
  );
  const aliasesById = new Map<string, string[]>();
  for (const a of (aliasesRaw ?? []) as { subdivision_id: string; alias: string }[]) {
    aliasesById.set(a.subdivision_id, [...(aliasesById.get(a.subdivision_id) ?? []), a.alias]);
  }
  const excerptsById = new Map<string, string[]>();
  for (const row of (lineageAsChild ?? []) as { child_subdivision_id: string; source_text: string }[]) {
    const list = excerptsById.get(row.child_subdivision_id) ?? [];
    if (list.length < 2 && row.source_text) list.push(row.source_text.slice(0, 300));
    excerptsById.set(row.child_subdivision_id, list);
  }
  for (const row of (lineageAsParent ?? []) as { parent_subdivision_id: string; source_text: string }[]) {
    const list = excerptsById.get(row.parent_subdivision_id) ?? [];
    if (list.length < 2 && row.source_text) list.push(row.source_text.slice(0, 300));
    excerptsById.set(row.parent_subdivision_id, list);
  }

  function describe(id: string): string {
    const s = subsById.get(id);
    if (!s) return `(id ${id}, record not found)`;
    const counts = countsById.get(id);
    const aliases = aliasesById.get(id) ?? [];
    const excerpts = excerptsById.get(id) ?? [];
    const lines = [
      `Name: "${s.name}" (id: ${s.id})`,
      s.alternate_names?.length ? `Alternate names on file: ${s.alternate_names.join(", ")}` : null,
      aliases.length ? `Aliases on file: ${aliases.join(", ")}` : null,
      s.entity_type ? `Entity type: ${s.entity_type}` : null,
      s.recorded_year ? `Recorded year: ${s.recorded_year}` : `Recorded year: unknown`,
      s.developer || s.original_owner ? `Developer/owner: ${s.developer ?? s.original_owner}` : null,
      s.parent_subdivision_id ? `Has a parent subdivision on file (id: ${s.parent_subdivision_id})` : null,
      counts ? `Linked properties: ${counts.total} total (${counts.deeded} deed-verified)` : `Linked properties: 0`,
      s.historical_summary ? `Historical summary: ${s.historical_summary.slice(0, 500)}` : null,
      excerpts.length ? `Deed text excerpt(s): ${excerpts.map((e) => `"${e}"`).join(" | ")}` : null,
    ].filter(Boolean);
    return lines.join("\n  ");
  }

  const pairsText = candidates
    .map(
      (c: { subdivision_a_id: string; subdivision_b_id: string; similarity_score: number; match_basis: string }, i: number) =>
        `PAIR ${i + 1} (${Math.round(c.similarity_score * 100)}% ${c.match_basis} similarity):\nA:\n  ${describe(
          c.subdivision_a_id
        )}\nB:\n  ${describe(c.subdivision_b_id)}`
    )
    .join("\n\n");

  const systemPrompt = `You are a historical land records analyst reviewing Cook County, Illinois subdivision records from a Park Ridge property history database. You are given pairs of subdivision records that a name/alias similarity check has already flagged as potentially the same real-world plat under different spellings or names.

For EACH pair, decide one of:
- "likely_same": these almost certainly describe the same recorded plat (e.g. spelling variants, one is clearly an alias of the other, deed excerpts corroborate).
- "parent_child": these are legitimately related but distinct records -- one is a resubdivision, addition, or portion of the other, and both should be kept with a parent/child link rather than merged.
- "likely_different": despite the name similarity, the evidence (different developers, different years, no corroborating deed text, generic name collision) suggests these are unrelated plats.
- "unclear": not enough evidence either way to recommend an action.

Return ONLY a single valid JSON array, no prose, no markdown fences, matching this schema exactly, one entry per pair in the same order given:
[
  {
    "verdict": "likely_same" | "parent_child" | "likely_different" | "unclear",
    "reasoning": string (1-3 sentences, cite the specific evidence you used),
    "recommended_action": string (one concrete sentence telling the admin what to click/do next, e.g. "Merge B into A, keeping A as canonical since it has more deed-verified properties." or "Keep both; set B's parent_subdivision to A." or "Keep separate -- the shared word appears to be coincidental." or "Needs manual research before acting.")
  }
]`;

  const client = new Anthropic();
  let raw: string;
  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [{ role: "user", content: pairsText }],
      system: systemPrompt,
    });
    raw = message.content.filter((b) => b.type === "text").map((b) => (b as { type: "text"; text: string }).text).join("");
  } catch (err) {
    return { error: err instanceof Error ? err.message : "AI analysis failed." };
  }

  let verdicts: { verdict: SubdivisionAIVerdict; reasoning: string; recommended_action: string }[];
  try {
    verdicts = parseJsonArray(raw);
  } catch {
    return { error: `AI response could not be parsed as JSON. First 200 chars: ${raw.slice(0, 200)}` };
  }

  const suggestions: SubdivisionAISuggestion[] = candidates.map(
    (c: { subdivision_a_id: string; subdivision_a_name: string; subdivision_b_id: string; subdivision_b_name: string; similarity_score: number }, i: number) => ({
      subdivision_a_id: c.subdivision_a_id,
      subdivision_a_name: c.subdivision_a_name,
      subdivision_b_id: c.subdivision_b_id,
      subdivision_b_name: c.subdivision_b_name,
      similarity_score: c.similarity_score,
      verdict: verdicts[i]?.verdict ?? "unclear",
      reasoning: verdicts[i]?.reasoning ?? "No reasoning returned.",
      recommended_action: verdicts[i]?.recommended_action ?? "Review manually.",
    })
  );

  const nextOffset = offset + batchSize;
  return { suggestions, total, nextOffset, hasMore: nextOffset < total };
}

/** Strips markdown fences if present, then falls back to extracting the outermost [...] span. */
function parseJsonArray(raw: string): { verdict: SubdivisionAIVerdict; reasoning: string; recommended_action: string }[] {
  const fenceStripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  try {
    return JSON.parse(fenceStripped);
  } catch {
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    if (start === -1 || end === -1 || end < start) throw new Error("No JSON array found in response.");
    return JSON.parse(raw.slice(start, end + 1));
  }
}
