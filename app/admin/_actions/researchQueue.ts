"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { adminSupabase } from "@/lib/supabase/adminClient";

type Candidate = {
  candidate_pin: string;
  candidate_address: string | null;
  suspected_subdivision_id: string;
  suspected_subdivision_name: string;
  source_pins: string[];
  neighbor_count: number;
  anchor_lots: string[] | null;
  anchor_blocks: string[] | null;
  anchor_addresses: string[] | null;
};

type BoundaryCandidate = Candidate & {
  distinct_subdivision_count: number;
  adjacent_subdivision_names: string[];
  adjacent_subdivision_ids: string[];
  is_near_major_road: boolean;
  edge_score: number;
};

// ─── Shared processing logic ──────────────────────────────────────────────────

async function processAndUpsertCandidates(
  rows: Candidate[]
): Promise<{ added: number; error?: string }> {
  // Group by subdivision so Claude is called once per subdivision context
  const bySubdivision = new Map<string, Candidate[]>();
  for (const c of rows) {
    const key = c.suspected_subdivision_id ?? "unknown";
    if (!bySubdivision.has(key)) bySubdivision.set(key, []);
    bySubdivision.get(key)!.push(c);
  }

  const client = new Anthropic();
  const reasoningMap = new Map<string, string>();

  for (const [, group] of bySubdivision) {
    const subdivisionName = group[0].suspected_subdivision_name ?? "Unknown subdivision";
    const anchors = group[0];
    const anchorContext = [
      anchors.anchor_addresses?.join(", ") ?? "nearby properties",
      anchors.anchor_lots?.length ? `Lots ${anchors.anchor_lots.join(", ")}` : null,
      anchors.anchor_blocks?.length ? `Block ${anchors.anchor_blocks[0]}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    const candidateList = group
      .map((c, i) => `${i + 1}. ${c.candidate_address ?? c.candidate_pin}`)
      .join("\n");

    try {
      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system: `You are generating one-sentence research notes for a property historian investigating Park Ridge, IL subdivision deeds at Cook County. Be specific about spatial adjacency and lot/block patterns. Return ONLY valid JSON — no prose, no markdown fences: {"items":[{"address":"...","reasoning":"one sentence"}]}`,
        messages: [
          {
            role: "user",
            content: `Subdivision being researched: ${subdivisionName}
Already deed-researched neighbors: ${anchorContext}

Write one research-priority sentence for each candidate address explaining why it's likely in the same subdivision:
${candidateList}`,
          },
        ],
      });

      const rawText = message.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("");

      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;
      const parsed = JSON.parse(jsonMatch[0]) as {
        items: Array<{ address: string; reasoning: string }>;
      };

      parsed.items.forEach((item, i) => {
        const candidate =
          group.find(
            (c) =>
              (c.candidate_address ?? c.candidate_pin)
                .toLowerCase()
                .includes(item.address.toLowerCase().slice(0, 10))
          ) ?? group[i];
        if (candidate) reasoningMap.set(candidate.candidate_pin, item.reasoning);
      });
    } catch {
      // Skip AI for this group; upsert proceeds with empty reasoning
    }
  }

  // Deduplicate by PIN — a PIN may appear as a candidate for multiple subdivisions.
  // ON CONFLICT DO UPDATE cannot affect the same row twice in one statement.
  const pinBest = new Map<string, Candidate>();
  for (const c of rows) {
    const existing = pinBest.get(c.candidate_pin);
    if (!existing || c.neighbor_count > existing.neighbor_count) {
      pinBest.set(c.candidate_pin, c);
    }
  }

  const upsertRows = Array.from(pinBest.values()).map((c) => ({
    pin: c.candidate_pin,
    address: c.candidate_address,
    suspected_subdivision_id: c.suspected_subdivision_id,
    suspected_subdivision_name: c.suspected_subdivision_name,
    ai_reasoning: reasoningMap.get(c.candidate_pin) ?? "",
    priority_score: c.neighbor_count,
    source_pins: c.source_pins,
    updated_at: new Date().toISOString(),
  }));

  const { data: inserted, error: upsertError } = await adminSupabase
    .from("deed_research_queue")
    .upsert(upsertRows, { onConflict: "pin", ignoreDuplicates: false })
    .select("id");

  if (upsertError) return { added: 0, error: upsertError.message };

  revalidatePath("/admin/research-queue");
  return { added: inserted?.length ?? 0 };
}

// ─── Refresh entire queue ─────────────────────────────────────────────────────

export async function refreshResearchQueue(): Promise<{ added: number; error?: string }> {
  try {
    const { data: candidates, error: rpcError } = await adminSupabase.rpc(
      "find_research_candidates"
    );

    if (rpcError) return { added: 0, error: rpcError.message };
    if (!candidates?.length) return { added: 0 };

    return processAndUpsertCandidates(candidates as Candidate[]);
  } catch (e) {
    return { added: 0, error: e instanceof Error ? e.message : "Unexpected error" };
  }
}

// ─── Refresh one subdivision ──────────────────────────────────────────────────

export async function refreshSubdivisionQueue(
  subdivisionId: string
): Promise<{ added: number; error?: string }> {
  const { data: candidates, error: rpcError } = await adminSupabase.rpc(
    "find_research_candidates_for_subdivision",
    { p_subdivision_id: subdivisionId }
  );

  if (rpcError) return { added: 0, error: rpcError.message };
  if (!candidates?.length) return { added: 0 };

  return processAndUpsertCandidates(candidates as Candidate[]);
}

// ─── Boundary edge queue ──────────────────────────────────────────────────────

export async function refreshBoundaryQueue(): Promise<{ added: number; error?: string }> {
  try {
  const { data: candidates, error: rpcError } = await adminSupabase.rpc(
    "find_boundary_edge_candidates"
  );

  if (rpcError) return { added: 0, error: rpcError.message };
  if (!candidates?.length) return { added: 0 };

  const rows = candidates as BoundaryCandidate[];

  // Group by boundary-pair key so Claude gets subdivision context per pair.
  const byPair = new Map<string, BoundaryCandidate[]>();
  for (const c of rows) {
    const pair = (c.adjacent_subdivision_names ?? [c.suspected_subdivision_name])
      .slice(0, 2)
      .sort()
      .join(" ↔ ");
    if (!byPair.has(pair)) byPair.set(pair, []);
    byPair.get(pair)!.push(c);
  }

  const client = new Anthropic();
  const reasoningMap = new Map<string, string>();

  for (const [pairKey, group] of byPair) {
    const sampleAnchor = group[0];
    const anchorContext = [
      sampleAnchor.anchor_addresses?.join(", ") ?? "nearby properties",
      sampleAnchor.anchor_lots?.length ? `Lots ${sampleAnchor.anchor_lots.join(", ")}` : null,
      sampleAnchor.anchor_blocks?.length ? `Block ${sampleAnchor.anchor_blocks[0]}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    const candidateList = group
      .map((c, i) => `${i + 1}. ${c.candidate_address ?? c.candidate_pin}`)
      .join("\n");

    try {
      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system: `You are generating one-sentence research notes for a property historian mapping Park Ridge, IL subdivision boundaries. Be specific about which subdivisions border this property and why researching it will clarify the plat edge. Return ONLY valid JSON: {"items":[{"address":"...","reasoning":"one sentence"}]}`,
        messages: [
          {
            role: "user",
            content: `Boundary zone: ${pairKey}
Nearby deed-researched properties: ${anchorContext}

Write one sentence per candidate explaining why it sits at a subdivision boundary and what researching it would clarify:
${candidateList}`,
          },
        ],
      });

      const rawText = message.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("");

      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;
      const parsed = JSON.parse(jsonMatch[0]) as {
        items: Array<{ address: string; reasoning: string }>;
      };

      parsed.items.forEach((item, i) => {
        const candidate =
          group.find((c) =>
            (c.candidate_address ?? c.candidate_pin)
              .toLowerCase()
              .includes(item.address.toLowerCase().slice(0, 10))
          ) ?? group[i];
        if (candidate) reasoningMap.set(candidate.candidate_pin, item.reasoning);
      });
    } catch {
      // Skip AI for this group; upsert proceeds with empty reasoning.
    }
  }

  // Deduplicate by PIN (a property can only be in the queue once).
  const pinBest = new Map<string, BoundaryCandidate>();
  for (const c of rows) {
    const existing = pinBest.get(c.candidate_pin);
    if (!existing || c.edge_score > existing.edge_score) {
      pinBest.set(c.candidate_pin, c);
    }
  }

  const upsertRows = Array.from(pinBest.values()).map((c) => ({
    pin: c.candidate_pin,
    address: c.candidate_address,
    suspected_subdivision_id: c.suspected_subdivision_id,
    suspected_subdivision_name: c.suspected_subdivision_name,
    ai_reasoning: reasoningMap.get(c.candidate_pin) ?? "",
    priority_score: c.edge_score,
    source_pins: c.source_pins,
    queue_type: "boundary_edge" as const,
    adjacent_subdivision_names: c.adjacent_subdivision_names,
    updated_at: new Date().toISOString(),
  }));

  const { data: inserted, error: upsertError } = await adminSupabase
    .from("deed_research_queue")
    .upsert(upsertRows, { onConflict: "pin", ignoreDuplicates: false })
    .select("id");

  if (upsertError) return { added: 0, error: upsertError.message };

  revalidatePath("/admin/research-queue");
  return { added: inserted?.length ?? 0 };
  } catch (e) {
    return { added: 0, error: e instanceof Error ? e.message : "Unexpected error" };
  }
}

// ─── Status update ────────────────────────────────────────────────────────────

export async function updateQueueStatus(
  id: string,
  status: "pending" | "researched" | "not_found" | "skipped"
): Promise<{ error?: string }> {
  const { error } = await adminSupabase
    .from("deed_research_queue")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/research-queue");
  return {};
}
