"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { adminSupabase } from "@/lib/supabase/adminClient";
import { refreshResearchQueue } from "./researchQueue";
import { upsertSubdivisionLink } from "./properties";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AIDeedSubdivisionLink = {
  subdivision_name: string;
  subdivision_id: string | null;
  lot_number: string | null;
  block_number: string | null;
  parcel_label: string | null;
  confidence: "high" | "medium" | "low" | "unknown";
  confidence_reason: string;
};

export type AIDeedLineageRecord = {
  child_subdivision: string;
  child_subdivision_id: string | null;
  child_lot: string | null;
  child_block: string | null;
  parent_subdivision: string | null;
  parent_subdivision_id: string | null;
  parent_lot: string | null;
  parent_block: string | null;
  parent_portion: string | null;
  section: string | null;
  quarter_section: string | null;
  township: string | null;
  range: string | null;
  meridian: string | null;
  county: string | null;
  state: string | null;
  relationship_type: string;
  development_chain: string[];
  plain_english_summary: string;
  development_interpretation: string;
  confidence: "high" | "medium" | "low" | "unknown";
  confidence_reason: string;
};

export type AIDeedChangeEvent = {
  event_type: string;
  event_year: number | null;
  description: string;
  related_pins: string[];
  confidence: string;
};

export type DeedAnalysisResult = {
  subdivision_links: AIDeedSubdivisionLink[];
  lineage_records: AIDeedLineageRecord[];
  change_events: AIDeedChangeEvent[];
  new_subdivision_names: string[];
};

// ─── AI analysis ─────────────────────────────────────────────────────────────

export async function analyzeDeedWithAI(
  pin: string,
  address: string | null,
  deedNotes: string,
  knownSubdivisions: { id: string; name: string }[]
): Promise<{ result?: DeedAnalysisResult; error?: string }> {
  if (!deedNotes.trim()) return { error: "No deed text to analyze." };

  const client = new Anthropic();

  const subdivisionList = knownSubdivisions
    .map((s) => `  - "${s.name}" (id: ${s.id})`)
    .join("\n");

  const systemPrompt = `You are a historical land records analyst specializing in Cook County, Illinois property deeds from the 1800s–1950s. You extract structured subdivision lineage information from deed legal descriptions.

You will receive:
1. A deed legal description text
2. A list of known subdivision names and their database IDs

Your job is to return ONLY a single valid JSON object with no prose, no markdown fences, no commentary. The JSON must exactly match this schema:

{
  "subdivision_links": [
    {
      "subdivision_name": string,
      "subdivision_id": string | null,
      "lot_number": string | null,
      "block_number": string | null,
      "parcel_label": string | null,
      "confidence": "high" | "medium" | "low" | "unknown",
      "confidence_reason": string
    }
  ],
  "lineage_records": [
    {
      "child_subdivision": string,
      "child_subdivision_id": string | null,
      "child_lot": string | null,
      "child_block": string | null,
      "parent_subdivision": string | null,
      "parent_subdivision_id": string | null,
      "parent_lot": string | null,
      "parent_block": string | null,
      "parent_portion": string | null,
      "section": string | null,
      "quarter_section": string | null,
      "township": string | null,
      "range": string | null,
      "meridian": string | null,
      "county": string | null,
      "state": string | null,
      "relationship_type": string,
      "development_chain": string[],
      "plain_english_summary": string,
      "development_interpretation": string,
      "confidence": "high" | "medium" | "low" | "unknown",
      "confidence_reason": string
    }
  ],
  "change_events": [
    {
      "event_type": string,
      "event_year": number | null,
      "description": string,
      "related_pins": string[],
      "confidence": string
    }
  ],
  "new_subdivision_names": string[]
}

Rules:
- "subdivision_links" is an ARRAY - one entry per named parcel in the deed. Most deeds have one parcel and will produce one entry. Deeds labeled "PARCEL ONE / PARCEL TWO" (or "PARCEL 1 / PARCEL 2", "TRACT A / TRACT B", etc.) are multi-parcel and must produce one entry per parcel.
- "parcel_label" is the raw label from the deed if present (e.g. "PARCEL ONE", "PARCEL TWO", "TRACT A"). Leave null for single-parcel deeds.
- Each subdivision_link entry is the innermost / most specific named plat for that parcel (e.g. "Kinsey's Park Ridge Subdivision", not the section/township description).
- "lineage_records" captures each parent-child chain. Produce one record per parent-child relationship found, across ALL parcels. If the deed shows A was carved from B which was carved from C, produce two records: A→B and B→C.
- "quarter_section" captures phrases like "the Northeast Quarter" or "NE 1/4" when the deed describes a quarter-section of the federal survey; use a short normalized form like "NE 1/4" or "SW 1/4 of the NW 1/4". Leave null if no quarter-section language appears.
- "relationship_type" should be one of: "resubdivision", "addition", "addition/resubdivision", "subdivision".
- "development_chain" is an ordered array from oldest (county/section) to newest (the property), e.g. ["Cook County, IL", "Section 26, Township 41 North, Range 12 East", "Parent Subdivision", "Block X", "Lot Y", "Child Subdivision", "Lot Z", "526 N Washington Ave"].
- Match subdivision names to the known list case-insensitively. If matched, set the _id field to the UUID from the list. If not matched, set _id to null and add the name to "new_subdivision_names".
- "change_events": If the deed has MULTIPLE PARCELS (Parcel One, Parcel Two, etc.), always include a consolidation change event describing which lots were combined under one PIN. Also include events if the deed text explicitly mentions combining, splitting, or adjusting parcels. event_type must be one of: "consolidation", "subdivision", "resubdivision", "boundary_adj", "creation", "annexation".
- "related_pins" will usually be empty - only populate if specific PIN numbers appear in the deed text.
- If the deed text is not a standard legal description, return an empty subdivision_links array and empty arrays for everything else.`;

  const userPrompt = `Property: ${address ?? pin} (PIN: ${pin})

Known subdivisions (use these IDs when names match):
${subdivisionList || "  (none loaded)"}

Deed legal description:
${deedNotes}`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{ role: "user", content: userPrompt }],
      system: systemPrompt,
    });

    const rawText = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    // Strip markdown code fences if the model wrapped the JSON
    const jsonText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    const parsed = JSON.parse(jsonText) as DeedAnalysisResult;
    return { result: parsed };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `AI analysis failed: ${msg}` };
  }
}

// ─── Ensure subdivision exists ────────────────────────────────────────────────

export async function ensureSubdivision(
  name: string,
  entityType: "subdivision" | "parent_plat" | "unknown" = "subdivision"
): Promise<{ id?: string; error?: string }> {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // Check if it already exists (case-insensitive)
  const { data: existing } = await adminSupabase
    .from("subdivisions")
    .select("id")
    .ilike("name", name)
    .maybeSingle();

  if (existing) return { id: existing.id };

  const { data, error } = await adminSupabase
    .from("subdivisions")
    .insert({
      name,
      normalized_name: normalized,
      display_name: name,
      slug,
      entity_type: entityType,
      confidence_level: "low",
      confidence_reason: "Created from AI deed analysis; verification required.",
      status: "research_candidate",
      geometry_status: "not_started",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { id: data.id };
}

// ─── Save lineage record ──────────────────────────────────────────────────────

export async function saveLineageRecord(
  pin: string,
  address: string | null,
  record: AIDeedLineageRecord,
  sourceText: string
): Promise<{ error?: string }> {
  const childSlug = record.child_subdivision
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const parentSlug = (record.parent_subdivision ?? "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const lotPart = record.child_lot ? `--lot-${record.child_lot.toLowerCase().replace(/\s+/g, "-")}` : "";
  const lineageKey = `${childSlug}--from--${parentSlug}${lotPart}`;

  const payload = {
    lineage_key: lineageKey,
    pin,
    address,
    child_subdivision_id: record.child_subdivision_id,
    parent_subdivision_id: record.parent_subdivision_id,
    child_subdivision: record.child_subdivision,
    child_lot: record.child_lot,
    child_block: record.child_block,
    parent_subdivision: record.parent_subdivision,
    parent_lot: record.parent_lot,
    parent_block: record.parent_block,
    parent_portion: record.parent_portion,
    section: record.section,
    quarter_section: record.quarter_section,
    township: record.township,
    range: record.range,
    meridian: record.meridian,
    county: record.county,
    state: record.state,
    relationship_type: record.relationship_type,
    development_chain: record.development_chain,
    plain_english_summary: record.plain_english_summary,
    development_interpretation: record.development_interpretation,
    source_type: "deed_legal_description",
    source_text: sourceText,
    confidence: record.confidence,
    confidence_reason: record.confidence_reason,
    needs_verification: true,
    verification_notes:
      "Created via AI deed analysis. Review source text and confirm against recorded plat.",
  };

  const { error } = await adminSupabase
    .from("historical_subdivision_lineage")
    .upsert(payload, { onConflict: "lineage_key" });

  if (error) return { error: error.message };

  // If both subdivision IDs are known, update parent_subdivision_id on the child
  if (record.child_subdivision_id && record.parent_subdivision_id) {
    await adminSupabase
      .from("subdivisions")
      .update({ parent_subdivision_id: record.parent_subdivision_id })
      .eq("id", record.child_subdivision_id)
      .is("parent_subdivision_id", null); // Only set if not already set
  }

  revalidatePath(`/admin/properties/${encodeURIComponent(pin)}`);
  revalidatePath("/subdivisions");

  // Fire-and-forget: rebuild the spatial research queue now that a new anchor exists
  refreshResearchQueue().catch(() => {});

  return {};
}

// ─── Parse result tracking ─────────────────────────────────────────────────────

const CONFIDENCE_WEIGHT: Record<string, number> = { high: 0.9, medium: 0.6, low: 0.3, unknown: 0.1 };

/** Derives a numeric 0-1 confidence score from a set of categorical confidence labels. */
function scoreConfidences(labels: string[]): number | null {
  if (labels.length === 0) return null;
  const weights = labels.map((l) => CONFIDENCE_WEIGHT[l] ?? 0.1);
  return Math.round((weights.reduce((a, b) => a + b, 0) / weights.length) * 100) / 100;
}

/**
 * Records that a deed parse ran for this PIN. Always lands as 'needs_review'
 * -- this table tracks the parse attempt itself, not admin approval of the
 * extracted facts (those still go through the existing per-fact confidence
 * and subdivision status workflow).
 */
export async function recordParseResult(
  pin: string,
  result: DeedAnalysisResult,
  aiModel: string
): Promise<{ error?: string }> {
  const labels = [
    ...result.subdivision_links.map((l) => l.confidence),
    ...result.lineage_records.map((l) => l.confidence),
  ];
  const confidenceScore = scoreConfidences(labels);
  const notes =
    `Extracted ${result.subdivision_links.length} subdivision link(s), ` +
    `${result.lineage_records.length} lineage record(s), ` +
    `${result.change_events.length} change event(s).` +
    (result.new_subdivision_names.length
      ? ` New subdivision names introduced: ${result.new_subdivision_names.join(", ")}.`
      : "");

  const { error } = await adminSupabase.from("deed_parse_results").upsert(
    {
      pin,
      parse_status: "needs_review",
      confidence_score: confidenceScore,
      parse_notes: notes,
      subdivision_link_count: result.subdivision_links.length,
      lineage_record_count: result.lineage_records.length,
      ai_model: aiModel,
      parsed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "pin" }
  );

  if (error) return { error: error.message };
  return {};
}

// ─── Batch processing (runs from Admin, no local script or API key needed) ────
//
// Reuses the exact same save path as the interactive per-property panel
// (ensureSubdivision, saveLineageRecord, upsertSubdivisionLink,
// recordParseResult) -- just looped over every parcel with deed_notes that
// hasn't been parsed yet. Every result lands as parse_status='needs_review',
// same as a single-property "Apply All & Save". Runs server-side using
// whatever ANTHROPIC_API_KEY is already configured for this deployment --
// the same one the interactive panel already relies on.

export async function countUnparsedDeeds(): Promise<number> {
  const { data: parcels } = await adminSupabase
    .from("parcels")
    .select("pin_normalized")
    .eq("municipality", "CITY OF PARK RIDGE")
    .not("deed_notes", "is", null);
  const { data: parsed } = await adminSupabase.from("deed_parse_results").select("pin");
  const parsedPins = new Set((parsed ?? []).map((r) => r.pin));
  return (parcels ?? []).filter((p) => !parsedPins.has(p.pin_normalized)).length;
}

async function applyDeedAnalysisResult(
  pin: string,
  address: string | null,
  deedNotes: string,
  result: DeedAnalysisResult
): Promise<{ error?: string }> {
  for (const link of result.subdivision_links) {
    let resolvedId = link.subdivision_id ?? "";
    if (!resolvedId && link.subdivision_name) {
      const r = await ensureSubdivision(link.subdivision_name, "subdivision");
      if (r.error) return { error: r.error };
      resolvedId = r.id ?? "";
    }
    if (!resolvedId) continue;
    const fd = new FormData();
    fd.set("subdivision_id", resolvedId);
    fd.set("lot_number", link.lot_number ?? "");
    fd.set("block_number", link.block_number ?? "");
    fd.set("confidence_level", link.confidence);
    fd.set("confidence_reason", link.confidence_reason);
    fd.set("match_method", "deed_legal_description");
    fd.set("source_name", "AI deed analysis (admin batch)");
    fd.set("source_reference", deedNotes.slice(0, 500));
    const r = await upsertSubdivisionLink(pin, null, fd);
    if (r?.error) return { error: r.error };
  }

  for (const record of result.lineage_records) {
    let resolvedChildId = record.child_subdivision_id ?? null;
    if (!resolvedChildId && record.child_subdivision) {
      const r = await ensureSubdivision(record.child_subdivision, "subdivision");
      if (r.error) return { error: r.error };
      resolvedChildId = r.id ?? null;
    }
    let resolvedParentId = record.parent_subdivision_id ?? null;
    if (!resolvedParentId && record.parent_subdivision) {
      const r = await ensureSubdivision(record.parent_subdivision, "parent_plat");
      if (r.error) return { error: r.error };
      resolvedParentId = r.id ?? null;
    }
    const r = await saveLineageRecord(
      pin,
      address,
      { ...record, child_subdivision_id: resolvedChildId, parent_subdivision_id: resolvedParentId },
      deedNotes
    );
    if (r.error) return { error: r.error };
  }

  await recordParseResult(pin, result, "claude-haiku-4-5-20251001");
  return {};
}

export type DeedParseBatchItem = {
  pin: string;
  address: string | null;
  linkCount: number;
  lineageCount: number;
  error?: string;
};

export async function processNextDeedParseBatch(
  batchSize: number
): Promise<{ processed: DeedParseBatchItem[]; remaining: number; error?: string }> {
  const { data: knownSubdivisions } = await adminSupabase.from("subdivisions").select("id, name");
  const subs = knownSubdivisions ?? [];

  const { data: parcels } = await adminSupabase
    .from("parcels")
    .select("pin_normalized, address, deed_notes")
    .eq("municipality", "CITY OF PARK RIDGE")
    .not("deed_notes", "is", null);
  const { data: parsedRows } = await adminSupabase.from("deed_parse_results").select("pin");
  const parsedPins = new Set((parsedRows ?? []).map((r) => r.pin));

  const todo = (parcels ?? [])
    .filter((p) => p.deed_notes?.trim() && !parsedPins.has(p.pin_normalized))
    .slice(0, batchSize);

  const processed: DeedParseBatchItem[] = [];
  for (const parcel of todo) {
    const pin = parcel.pin_normalized as string;
    const address = (parcel.address as string | null) ?? null;
    const deedNotes = parcel.deed_notes as string;

    const { result, error } = await analyzeDeedWithAI(pin, address, deedNotes, subs);
    if (error || !result) {
      processed.push({ pin, address, linkCount: 0, lineageCount: 0, error: error ?? "No result" });
      await adminSupabase.from("deed_parse_results").upsert(
        { pin, parse_status: "rejected", parse_notes: `Batch parse failed: ${error}`, ai_model: "claude-haiku-4-5-20251001", parsed_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { onConflict: "pin" }
      );
      continue;
    }

    const applyResult = await applyDeedAnalysisResult(pin, address, deedNotes, result);
    processed.push({
      pin,
      address,
      linkCount: result.subdivision_links.length,
      lineageCount: result.lineage_records.length,
      error: applyResult.error,
    });
  }

  revalidatePath("/admin/data-quality");
  const remaining = await countUnparsedDeeds();
  return { processed, remaining };
}

// ─── PDF text extraction ──────────────────────────────────────────────────────

export async function extractPdfText(
  formData: FormData
): Promise<{ text?: string; error?: string }> {
  const file = formData.get("file");
  if (!file || !(file instanceof Blob)) return { error: "No file provided." };
  if (file.size > 20 * 1024 * 1024) return { error: "File too large. Maximum 20 MB." };

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    // Cook County deed PDFs are scanned images — no text layer exists.
    // Send directly to Claude as a document; it reads the image natively.
    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: base64 },
          },
          {
            type: "text",
            text: "Extract the complete legal property description from this deed or mortgage document. The legal description typically begins with 'LOT' or 'PARCEL' and includes subdivision names, section/township/range information. Return only the legal description text exactly as written — no commentary, no header.",
          },
        ],
      }],
    });

    const extracted = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")
      .trim()
      .slice(0, 3000);

    if (!extracted) return { error: "No legal description found in this document." };
    return { text: extracted };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to read PDF." };
  }
}
