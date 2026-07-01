// Batch-runs every parcel with deed_notes on file through the same AI deed
// parsing used interactively in Admin > Properties > [pin] (see
// app/admin/_actions/aiDeedAnalysis.ts), and records a deed_parse_results
// row for each so admins can see what's parsed and awaiting review.
//
// Scope: ~211 Park Ridge parcels have deed_notes today (checked 2026-07-01),
// not the ~12,000 total Park Ridge parcels -- small and cheap enough to run
// in full, unlike a reprocess at full-dataset scale would be.
//
// Does NOT touch change_events -- those need the parcel_change_events +
// lineage-edge junction wiring that only the interactive admin panel
// currently handles (app/admin/properties/_DeedAnalysisPanel.tsx). Every
// subdivision link and lineage record this script writes lands exactly like
// the interactive "Apply All & Save" button would, and every parse gets a
// deed_parse_results row with parse_status='needs_review' -- nothing here
// publishes automatically.
//
// Resumable: skips any PIN that already has a deed_parse_results row, so a
// failed or interrupted run can just be re-invoked.
//
// Usage: ANTHROPIC_API_KEY=... node scripts/backfill_deed_parse.mjs [--limit N] [--dry-run]
// Requires NEXT_PUBLIC_SUPABASE_URL (or VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY,
// and ANTHROPIC_API_KEY in the environment.

import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitArg = args.find((a) => a.startsWith("--limit"));
const limit = limitArg ? parseInt(limitArg.split("=")[1] ?? args[args.indexOf(limitArg) + 1], 10) : null;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL (or VITE_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Missing ANTHROPIC_API_KEY. This is required to call Claude for deed parsing.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const anthropic = new Anthropic();
const AI_MODEL = "claude-haiku-4-5-20251001";

const CONFIDENCE_WEIGHT = { high: 0.9, medium: 0.6, low: 0.3, unknown: 0.1 };
function scoreConfidences(labels) {
  if (labels.length === 0) return null;
  const weights = labels.map((l) => CONFIDENCE_WEIGHT[l] ?? 0.1);
  return Math.round((weights.reduce((a, b) => a + b, 0) / weights.length) * 100) / 100;
}

const SYSTEM_PROMPT = `You are a historical land records analyst specializing in Cook County, Illinois property deeds from the 1800s-1950s. You extract structured subdivision lineage information from deed legal descriptions.

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
- "lineage_records" captures each parent-child chain. Produce one record per parent-child relationship found, across ALL parcels. If the deed shows A was carved from B which was carved from C, produce two records: A->B and B->C.
- "quarter_section" captures phrases like "the Northeast Quarter" or "NE 1/4" when the deed describes a quarter-section of the federal survey; use a short normalized form like "NE 1/4" or "SW 1/4 of the NW 1/4". Leave null if no quarter-section language appears.
- "relationship_type" should be one of: "resubdivision", "addition", "addition/resubdivision", "subdivision".
- "development_chain" is an ordered array from oldest (county/section) to newest (the property), e.g. ["Cook County, IL", "Section 26, Township 41 North, Range 12 East", "Parent Subdivision", "Block X", "Lot Y", "Child Subdivision", "Lot Z", "526 N Washington Ave"].
- Match subdivision names to the known list case-insensitively. If matched, set the _id field to the UUID from the list. If not matched, set _id to null and add the name to "new_subdivision_names".
- "change_events": leave this array empty. It is not processed by this batch run.
- "related_pins" will usually be empty - only populate if specific PIN numbers appear in the deed text.
- If the deed text is not a standard legal description, return an empty subdivision_links array and empty arrays for everything else.`;

async function analyzeDeed(pin, address, deedNotes, knownSubdivisions) {
  const subdivisionList = knownSubdivisions.map((s) => `  - "${s.name}" (id: ${s.id})`).join("\n");
  const userPrompt = `Property: ${address ?? pin} (PIN: ${pin})\n\nKnown subdivisions (use these IDs when names match):\n${subdivisionList || "  (none loaded)"}\n\nDeed legal description:\n${deedNotes}`;

  const message = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 2048,
    messages: [{ role: "user", content: userPrompt }],
    system: SYSTEM_PROMPT,
  });

  const rawText = message.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  const jsonText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  return JSON.parse(jsonText);
}

async function ensureSubdivision(name, entityType, knownSubdivisions) {
  const existing = knownSubdivisions.find((s) => s.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing.id;

  const normalized = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const { data, error } = await supabase
    .from("subdivisions")
    .insert({
      name,
      normalized_name: normalized,
      display_name: name,
      slug,
      entity_type: entityType,
      confidence_level: "low",
      confidence_reason: "Created from batch AI deed analysis; verification required.",
      status: "research_candidate",
      geometry_status: "not_started",
    })
    .select("id")
    .single();
  if (error) throw new Error(`ensureSubdivision(${name}): ${error.message}`);

  knownSubdivisions.push({ id: data.id, name });
  return data.id;
}

async function applySubdivisionLink(pin, link, deedNotes, knownSubdivisions) {
  let subdivisionId = link.subdivision_id;
  if (!subdivisionId && link.subdivision_name) {
    subdivisionId = await ensureSubdivision(link.subdivision_name, "subdivision", knownSubdivisions);
  }
  if (!subdivisionId) return;

  const { error } = await supabase.from("property_subdivision_links").upsert(
    {
      pin,
      subdivision_id: subdivisionId,
      lot_number: link.lot_number,
      block_number: link.block_number,
      match_method: "deed_legal_description",
      confidence_level: link.confidence,
      confidence_reason: link.confidence_reason,
      source_name: "AI deed analysis (batch)",
      source_reference: deedNotes.slice(0, 500),
    },
    { onConflict: "pin,subdivision_id" }
  );
  if (error) throw new Error(`property_subdivision_links upsert for ${pin}: ${error.message}`);
}

async function applyLineageRecord(pin, address, record, deedNotes, knownSubdivisions) {
  let childId = record.child_subdivision_id;
  if (!childId && record.child_subdivision) {
    childId = await ensureSubdivision(record.child_subdivision, "subdivision", knownSubdivisions);
  }
  let parentId = record.parent_subdivision_id;
  if (!parentId && record.parent_subdivision) {
    parentId = await ensureSubdivision(record.parent_subdivision, "parent_plat", knownSubdivisions);
  }

  const childSlug = record.child_subdivision.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const parentSlug = (record.parent_subdivision ?? "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const lotPart = record.child_lot ? `--lot-${record.child_lot.toLowerCase().replace(/\s+/g, "-")}` : "";
  const lineageKey = `${childSlug}--from--${parentSlug}${lotPart}`;

  const { error } = await supabase.from("historical_subdivision_lineage").upsert(
    {
      lineage_key: lineageKey,
      pin,
      address,
      child_subdivision_id: childId,
      parent_subdivision_id: parentId,
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
      source_text: deedNotes,
      confidence: record.confidence,
      confidence_reason: record.confidence_reason,
      needs_verification: true,
      verification_notes: "Created via batch AI deed analysis. Review source text and confirm against recorded plat.",
    },
    { onConflict: "lineage_key" }
  );
  if (error) throw new Error(`historical_subdivision_lineage upsert for ${pin}: ${error.message}`);

  if (childId && parentId) {
    await supabase.from("subdivisions").update({ parent_subdivision_id: parentId }).eq("id", childId).is("parent_subdivision_id", null);
  }
}

async function main() {
  const { data: knownSubsRaw, error: subErr } = await supabase.from("subdivisions").select("id, name");
  if (subErr) throw subErr;
  const knownSubdivisions = knownSubsRaw ?? [];

  const { data: alreadyParsed, error: parsedErr } = await supabase.from("deed_parse_results").select("pin");
  if (parsedErr) throw parsedErr;
  const parsedPins = new Set((alreadyParsed ?? []).map((r) => r.pin));

  const { data: parcels, error: parcelErr } = await supabase
    .from("parcels")
    .select("pin_normalized, address, deed_notes")
    .eq("municipality", "CITY OF PARK RIDGE")
    .not("deed_notes", "is", null);
  if (parcelErr) throw parcelErr;

  let todo = (parcels ?? []).filter((p) => p.deed_notes?.trim() && !parsedPins.has(p.pin_normalized));
  if (limit) todo = todo.slice(0, limit);

  console.log(`${todo.length} parcel(s) to parse (${parsedPins.size} already done, skipping).`);
  if (dryRun) {
    console.log("Dry run -- not calling the AI or writing anything.");
    return;
  }

  let ok = 0, failed = 0;
  for (const [i, parcel] of todo.entries()) {
    const pin = parcel.pin_normalized;
    process.stdout.write(`[${i + 1}/${todo.length}] ${pin}... `);
    try {
      const result = await analyzeDeed(pin, parcel.address, parcel.deed_notes, knownSubdivisions);

      for (const link of result.subdivision_links ?? []) {
        await applySubdivisionLink(pin, link, parcel.deed_notes, knownSubdivisions);
      }
      for (const record of result.lineage_records ?? []) {
        await applyLineageRecord(pin, parcel.address, record, parcel.deed_notes, knownSubdivisions);
      }

      const labels = [
        ...(result.subdivision_links ?? []).map((l) => l.confidence),
        ...(result.lineage_records ?? []).map((l) => l.confidence),
      ];
      const confidenceScore = scoreConfidences(labels);
      const notes =
        `Extracted ${result.subdivision_links?.length ?? 0} subdivision link(s), ` +
        `${result.lineage_records?.length ?? 0} lineage record(s). ` +
        `Batch run via scripts/backfill_deed_parse.mjs.` +
        (result.new_subdivision_names?.length
          ? ` New subdivision names introduced: ${result.new_subdivision_names.join(", ")}.`
          : "");

      const { error: recordErr } = await supabase.from("deed_parse_results").upsert(
        {
          pin,
          parse_status: "needs_review",
          confidence_score: confidenceScore,
          parse_notes: notes,
          subdivision_link_count: result.subdivision_links?.length ?? 0,
          lineage_record_count: result.lineage_records?.length ?? 0,
          ai_model: AI_MODEL,
          parsed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "pin" }
      );
      if (recordErr) throw recordErr;

      console.log(`ok (${result.subdivision_links?.length ?? 0} link(s), ${result.lineage_records?.length ?? 0} lineage record(s), confidence ${confidenceScore ?? "n/a"})`);
      ok++;
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
      failed++;
      // Record the failure so it doesn't get silently skipped on the next run
      // (parse_status='rejected' excludes it from the "todo" set, but the
      // parse_notes explains why -- an admin can requeue by deleting the row).
      await supabase.from("deed_parse_results").upsert(
        {
          pin,
          parse_status: "rejected",
          parse_notes: `Batch parse failed: ${err.message}`,
          ai_model: AI_MODEL,
          parsed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "pin" }
      );
    }
    // Small delay between calls to stay well under API rate limits.
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\nDone. ${ok} parsed, ${failed} failed. Review in Admin > Data Quality (check: deed_parse_needs_review) or per-property deed analysis panels.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
