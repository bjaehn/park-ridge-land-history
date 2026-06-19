"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { adminSupabase } from "@/lib/supabase/adminClient";

const client = new Anthropic();

// ─── Types ────────────────────────────────────────────────────────────────────

export type AIDeedSubdivisionLink = {
  subdivision_name: string;
  subdivision_id: string | null;
  lot_number: string | null;
  block_number: string | null;
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
  subdivision_link: AIDeedSubdivisionLink | null;
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

  const subdivisionList = knownSubdivisions
    .map((s) => `  - "${s.name}" (id: ${s.id})`)
    .join("\n");

  const systemPrompt = `You are a historical land records analyst specializing in Cook County, Illinois property deeds from the 1800s–1950s. You extract structured subdivision lineage information from deed legal descriptions.

You will receive:
1. A deed legal description text
2. A list of known subdivision names and their database IDs

Your job is to return ONLY a single valid JSON object with no prose, no markdown fences, no commentary. The JSON must exactly match this schema:

{
  "subdivision_link": {
    "subdivision_name": string,
    "subdivision_id": string | null,
    "lot_number": string | null,
    "block_number": string | null,
    "confidence": "high" | "medium" | "low" | "unknown",
    "confidence_reason": string
  } | null,
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
- "subdivision_link" is the primary subdivision the property currently belongs to (the innermost / most specific named plat in the deed, e.g. "Kulas' Subdivision" not "Hodges and Murison's Subdivision").
- "lineage_records" captures the parent-child chain. Include one record per parent-child relationship found. If the deed shows A was carved from B which was carved from C, produce two records: A→B and B→C.
- "relationship_type" should be one of: "resubdivision", "addition", "addition/resubdivision", "subdivision".
- "development_chain" is an ordered array from oldest (county/section) to newest (the property), e.g. ["Cook County, IL", "Section 26, Township 41 North, Range 12 East", "Parent Subdivision", "Block X", "Lot Y", "Child Subdivision", "Lot Z", "526 N Washington Ave"].
- Match subdivision names to the known list case-insensitively. If matched, set the _id field to the UUID from the list. If not matched, set _id to null and add the name to "new_subdivision_names".
- "change_events" should only contain entries if the deed text explicitly mentions combining, acquiring, or incorporating adjacent parcels or alleys. If nothing suggests a boundary change, return an empty array.
- "related_pins" will usually be empty — only populate if specific PIN numbers appear in the deed text.
- If the deed text is not a standard legal description or has no subdivision information, return subdivision_link: null and empty arrays for everything else.`;

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

    const parsed = JSON.parse(rawText) as DeedAnalysisResult;
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
  return {};
}
