"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  analyzeDeedWithAI,
  ensureSubdivision,
  saveLineageRecord,
  type AIDeedSubdivisionLink,
  type AIDeedLineageRecord,
  type AIDeedChangeEvent,
  type DeedAnalysisResult,
} from "../_actions/aiDeedAnalysis";
import {
  upsertSubdivisionLink,
  upsertChangeEvent,
  upsertLineageEdge,
} from "../_actions/properties";

const LABEL = "block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1";
const INPUT = "w-full bg-surface-card border border-surface-border rounded px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-teal/60 transition-colors";
const SELECT = "w-full bg-surface-card border border-surface-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent-teal/60 transition-colors";

const CONFIDENCE_COLOR: Record<string, string> = {
  high: "text-green-400",
  medium: "text-yellow-400",
  low: "text-orange-400",
  unknown: "text-text-muted",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-3">
      {children}
    </h4>
  );
}

function ApplyButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-xs bg-accent-teal/10 text-accent-teal border border-accent-teal/30 rounded px-3 py-1.5 hover:bg-accent-teal/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      Apply
    </button>
  );
}

function SkipButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs text-text-muted hover:text-text-secondary transition-colors px-2 py-1.5"
    >
      Skip
    </button>
  );
}

function ConfidenceBadge({ level }: { level: string }) {
  return (
    <span className={`text-xs font-semibold ${CONFIDENCE_COLOR[level] ?? "text-text-muted"}`}>
      {level}
    </span>
  );
}

// ─── Section A: Subdivision Link ──────────────────────────────────────────────

function SubdivisionLinkSection({
  link,
  pin,
  deedNotes,
  allSubdivisions,
  onApplied,
  onSkip,
}: {
  link: AIDeedSubdivisionLink;
  pin: string;
  deedNotes: string;
  allSubdivisions: { id: string; name: string }[];
  onApplied: () => void;
  onSkip: () => void;
}) {
  const [subdivisionId, setSubdivisionId] = useState(link.subdivision_id ?? "");
  const [lotNumber, setLotNumber] = useState(link.lot_number ?? "");
  const [blockNumber, setBlockNumber] = useState(link.block_number ?? "");
  const [confidence, setConfidence] = useState(link.confidence);
  const [confidenceReason, setConfidenceReason] = useState(link.confidence_reason);
  const [err, setErr] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function apply() {
    setErr(null);
    startTransition(async () => {
      let resolvedId = subdivisionId;
      if (!resolvedId) {
        // New subdivision — create it first
        const r = await ensureSubdivision(link.subdivision_name, "subdivision");
        if (r.error) { setErr(r.error); return; }
        resolvedId = r.id ?? "";
      }
      if (!resolvedId) { setErr("Could not resolve subdivision ID."); return; }

      const fd = new FormData();
      fd.set("subdivision_id", resolvedId);
      fd.set("lot_number", lotNumber);
      fd.set("block_number", blockNumber);
      fd.set("confidence_level", confidence);
      fd.set("confidence_reason", confidenceReason);
      fd.set("match_method", "deed_legal_description");
      fd.set("source_name", "AI deed analysis");
      fd.set("source_reference", deedNotes.slice(0, 500));

      const r = await upsertSubdivisionLink(pin, null, fd);
      if (r?.error) { setErr(r.error); return; }
      onApplied();
    });
  }

  return (
    <div className="bg-surface-card border border-surface-border rounded-lg p-4 mb-3">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-xs text-text-muted mb-0.5">
            {link.parcel_label ? link.parcel_label : "Subdivision for this property"}
          </p>
          <p className="text-sm font-semibold text-text-primary">{link.subdivision_name}</p>
        </div>
        <ConfidenceBadge level={confidence} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 mb-3">
        <div>
          <label className={LABEL}>Subdivision</label>
          <select value={subdivisionId} onChange={(e) => setSubdivisionId(e.target.value)} className={SELECT}>
            <option value="">-- select --</option>
            {allSubdivisions.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={LABEL}>Block</label>
            <input value={blockNumber} onChange={(e) => setBlockNumber(e.target.value)} className={INPUT} placeholder="e.g. 1" />
          </div>
          <div>
            <label className={LABEL}>Lot</label>
            <input value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} className={INPUT} placeholder="e.g. 2" />
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 mb-3">
        <div>
          <label className={LABEL}>Confidence</label>
          <select value={confidence} onChange={(e) => setConfidence(e.target.value as typeof confidence)} className={SELECT}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>
        <div>
          <label className={LABEL}>Confidence reason</label>
          <input value={confidenceReason} onChange={(e) => setConfidenceReason(e.target.value)} className={INPUT} />
        </div>
      </div>
      {err && <p className="text-accent-red text-xs mb-2">{err}</p>}
      <div className="flex items-center gap-2">
        <ApplyButton onClick={apply} disabled={!subdivisionId && !link.subdivision_name} />
        <SkipButton onClick={onSkip} />
      </div>
    </div>
  );
}

// ─── Section B: Lineage Record ────────────────────────────────────────────────

function LineageRecordCard({
  record,
  index,
  pin,
  address,
  deedNotes,
  allSubdivisions,
  onApplied,
  onSkip,
}: {
  record: AIDeedLineageRecord;
  index: number;
  pin: string;
  address: string | null;
  deedNotes: string;
  allSubdivisions: { id: string; name: string }[];
  onApplied: () => void;
  onSkip: () => void;
}) {
  const [childSubId, setChildSubId] = useState(record.child_subdivision_id ?? "");
  const [parentSubId, setParentSubId] = useState(record.parent_subdivision_id ?? "");
  const [childLot, setChildLot] = useState(record.child_lot ?? "");
  const [childBlock, setChildBlock] = useState(record.child_block ?? "");
  const [parentLot, setParentLot] = useState(record.parent_lot ?? "");
  const [parentBlock, setParentBlock] = useState(record.parent_block ?? "");
  const [parentPortion, setParentPortion] = useState(record.parent_portion ?? "");
  const [section, setSection] = useState(record.section ?? "");
  const [township, setTownship] = useState(record.township ?? "");
  const [range, setRange] = useState(record.range ?? "");
  const [meridian, setMeridian] = useState(record.meridian ?? "");
  const [county, setCounty] = useState(record.county ?? "");
  const [state, setState] = useState(record.state ?? "");
  const [relType, setRelType] = useState(record.relationship_type);
  const [summary, setSummary] = useState(record.plain_english_summary);
  const [interpretation, setInterpretation] = useState(record.development_interpretation);
  const [confidence, setConfidence] = useState(record.confidence);
  const [confidenceReason, setConfidenceReason] = useState(record.confidence_reason);
  const [err, setErr] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function apply() {
    setErr(null);
    startTransition(async () => {
      // Resolve unknown child subdivision
      let resolvedChildId = childSubId || null;
      if (!resolvedChildId && record.child_subdivision) {
        const r = await ensureSubdivision(record.child_subdivision, "subdivision");
        if (r.error) { setErr(r.error); return; }
        resolvedChildId = r.id ?? null;
      }

      // Resolve unknown parent subdivision
      let resolvedParentId = parentSubId || null;
      if (!resolvedParentId && record.parent_subdivision) {
        const r = await ensureSubdivision(record.parent_subdivision, "parent_plat");
        if (r.error) { setErr(r.error); return; }
        resolvedParentId = r.id ?? null;
      }

      const finalRecord: AIDeedLineageRecord = {
        ...record,
        child_subdivision_id: resolvedChildId,
        parent_subdivision_id: resolvedParentId,
        child_lot: childLot || null,
        child_block: childBlock || null,
        parent_lot: parentLot || null,
        parent_block: parentBlock || null,
        parent_portion: parentPortion || null,
        section: section || null,
        township: township || null,
        range: range || null,
        meridian: meridian || null,
        county: county || null,
        state: state || null,
        relationship_type: relType,
        plain_english_summary: summary,
        development_interpretation: interpretation,
        confidence,
        confidence_reason: confidenceReason,
      };

      const r = await saveLineageRecord(pin, address, finalRecord, deedNotes);
      if (r.error) { setErr(r.error); return; }
      onApplied();
    });
  }

  return (
    <div className="bg-surface-card border border-surface-border rounded-lg p-4 mb-3">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-xs text-text-muted mb-0.5">Lineage record {index + 1}</p>
          <p className="text-sm font-semibold text-text-primary">
            {record.child_subdivision}
            {record.parent_subdivision && (
              <span className="font-normal text-text-muted"> ← {record.parent_subdivision}</span>
            )}
          </p>
        </div>
        <ConfidenceBadge level={confidence} />
      </div>

      {/* Chain summary */}
      {record.development_chain.length > 0 && (
        <div className="mb-3 text-xs text-text-muted bg-surface-base rounded px-3 py-2">
          {record.development_chain.join(" → ")}
        </div>
      )}

      <p className="text-xs text-text-secondary mb-3">{summary}</p>

      <div className="grid gap-3 sm:grid-cols-2 mb-3">
        <div>
          <label className={LABEL}>Child subdivision</label>
          <select value={childSubId} onChange={(e) => setChildSubId(e.target.value)} className={SELECT}>
            <option value="">{record.child_subdivision} (create new)</option>
            {allSubdivisions.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>Parent subdivision</label>
          <select value={parentSubId} onChange={(e) => setParentSubId(e.target.value)} className={SELECT}>
            <option value="">{record.parent_subdivision ?? "none"} (create new)</option>
            {allSubdivisions.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-4 mb-3">
        <div>
          <label className={LABEL}>Child lot</label>
          <input value={childLot} onChange={(e) => setChildLot(e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Child block</label>
          <input value={childBlock} onChange={(e) => setChildBlock(e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Parent lot</label>
          <input value={parentLot} onChange={(e) => setParentLot(e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Parent block</label>
          <input value={parentBlock} onChange={(e) => setParentBlock(e.target.value)} className={INPUT} />
        </div>
      </div>

      <div className="mb-3">
        <label className={LABEL}>Parent portion</label>
        <input value={parentPortion} onChange={(e) => setParentPortion(e.target.value)} placeholder="e.g. North 468.6 feet of Block 1" className={INPUT} />
      </div>

      <div className="grid gap-2 sm:grid-cols-3 mb-3">
        <div>
          <label className={LABEL}>Section</label>
          <input value={section} onChange={(e) => setSection(e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Township</label>
          <input value={township} onChange={(e) => setTownship(e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Range</label>
          <input value={range} onChange={(e) => setRange(e.target.value)} className={INPUT} />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3 mb-3">
        <div>
          <label className={LABEL}>Meridian</label>
          <input value={meridian} onChange={(e) => setMeridian(e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>County</label>
          <input value={county} onChange={(e) => setCounty(e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>State</label>
          <input value={state} onChange={(e) => setState(e.target.value)} className={INPUT} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 mb-3">
        <div>
          <label className={LABEL}>Relationship type</label>
          <select value={relType} onChange={(e) => setRelType(e.target.value)} className={SELECT}>
            <option value="resubdivision">Resubdivision</option>
            <option value="addition">Addition</option>
            <option value="addition/resubdivision">Addition/Resubdivision</option>
            <option value="subdivision">Subdivision</option>
          </select>
        </div>
        <div>
          <label className={LABEL}>Confidence</label>
          <select value={confidence} onChange={(e) => setConfidence(e.target.value as typeof confidence)} className={SELECT}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>
      </div>

      <div className="mb-3">
        <label className={LABEL}>Confidence reason</label>
        <input value={confidenceReason} onChange={(e) => setConfidenceReason(e.target.value)} className={INPUT} />
      </div>

      <div className="mb-3">
        <label className={LABEL}>Plain English summary</label>
        <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} className={`${INPUT} resize-y`} />
      </div>

      <div className="mb-3">
        <label className={LABEL}>Development interpretation</label>
        <textarea value={interpretation} onChange={(e) => setInterpretation(e.target.value)} rows={3} className={`${INPUT} resize-y`} />
      </div>

      {err && <p className="text-accent-red text-xs mb-2">{err}</p>}
      <div className="flex items-center gap-2">
        <ApplyButton onClick={apply} />
        <SkipButton onClick={onSkip} />
      </div>
    </div>
  );
}

// ─── Section C: Change Event ──────────────────────────────────────────────────

function ChangeEventCard({
  event,
  index,
  onApplied,
  onSkip,
}: {
  event: AIDeedChangeEvent;
  index: number;
  onApplied: () => void;
  onSkip: () => void;
}) {
  const [eventType, setEventType] = useState(event.event_type);
  const [eventYear, setEventYear] = useState(event.event_year?.toString() ?? "");
  const [description, setDescription] = useState(event.description);
  const [err, setErr] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function apply() {
    setErr(null);
    const fd = new FormData();
    fd.set("event_type", eventType);
    fd.set("event_year", eventYear);
    fd.set("description", description);
    fd.set("confidence_level", event.confidence);
    fd.set("date_precision", eventYear ? "year" : "unknown");

    startTransition(async () => {
      const r = await upsertChangeEvent(null, fd);
      if (r.error) { setErr(r.error); return; }
      if (r.id && event.related_pins.length > 0) {
        for (const pin of event.related_pins) {
          const edgeFd = new FormData();
          edgeFd.set("pin", pin);
          edgeFd.set("side", "predecessor");
          await upsertLineageEdge(r.id, null, edgeFd);
        }
      }
      onApplied();
    });
  }

  return (
    <div className="bg-surface-card border border-surface-border rounded-lg p-4 mb-3">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-xs text-text-muted mb-0.5">Boundary change {index + 1}</p>
          <p className="text-sm font-semibold text-text-primary capitalize">{event.event_type}</p>
        </div>
        <ConfidenceBadge level={event.confidence} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 mb-3">
        <div>
          <label className={LABEL}>Event type</label>
          <select value={eventType} onChange={(e) => setEventType(e.target.value)} className={SELECT}>
            <option value="acquisition">Acquisition</option>
            <option value="consolidation">Consolidation</option>
            <option value="boundary_adj">Boundary adjustment</option>
            <option value="subdivision">Subdivision</option>
            <option value="resubdivision">Resubdivision</option>
            <option value="annexation">Annexation</option>
            <option value="creation">Creation</option>
          </select>
        </div>
        <div>
          <label className={LABEL}>Year</label>
          <input value={eventYear} onChange={(e) => setEventYear(e.target.value)} type="number" min={1800} max={2100} placeholder="e.g. 1925" className={INPUT} />
        </div>
      </div>
      <div className="mb-3">
        <label className={LABEL}>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={`${INPUT} resize-y`} />
      </div>
      {event.related_pins.length > 0 && (
        <p className="text-xs text-text-muted mb-3">
          Related PINs: {event.related_pins.join(", ")}
        </p>
      )}
      {err && <p className="text-accent-red text-xs mb-2">{err}</p>}
      <div className="flex items-center gap-2">
        <ApplyButton onClick={apply} />
        <SkipButton onClick={onSkip} />
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function DeedAnalysisPanel({
  pin,
  address,
  deedNotes,
  allSubdivisions,
}: {
  pin: string;
  address: string | null;
  deedNotes: string | null;
  allSubdivisions: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DeedAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Track dismissed cards
  const [dismissedLinks, setDismissedLinks] = useState<Set<number>>(new Set());
  const [dismissedLineage, setDismissedLineage] = useState<Set<number>>(new Set());
  const [dismissedChanges, setDismissedChanges] = useState<Set<number>>(new Set());

  async function analyze() {
    // Read live text from the textarea so this works even if the server prop hasn't refreshed yet
    const textarea = document.querySelector<HTMLTextAreaElement>('textarea[name="deed_notes"]');
    const liveText = textarea?.value?.trim() || deedNotes?.trim() || "";
    if (!liveText) {
      setError("Enter a deed legal description in the Deed Record field above first.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setDismissedLinks(new Set());
    setDismissedLineage(new Set());
    setDismissedChanges(new Set());

    const r = await analyzeDeedWithAI(pin, address, liveText, allSubdivisions);
    setLoading(false);
    if (r.error) { setError(r.error); return; }
    setResult(r.result ?? null);
  }

  function handleApplied() {
    router.refresh();
  }

  const hasContent = result && (
    result.subdivision_links.some((_, i) => !dismissedLinks.has(i)) ||
    result.lineage_records.some((_, i) => !dismissedLineage.has(i)) ||
    result.change_events.some((_, i) => !dismissedChanges.has(i))
  );

  const allEmpty = result && (
    result.subdivision_links.length === 0 &&
    result.lineage_records.length === 0 &&
    result.change_events.length === 0
  );

  return (
    <section className="bg-surface-raised rounded-lg border border-surface-border p-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">AI Deed Analysis</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Extract subdivision lineage and boundary changes from deed text
          </p>
        </div>
        <button
          type="button"
          onClick={analyze}
          disabled={loading}
          className="text-xs bg-accent-teal text-surface-base font-semibold px-4 py-1.5 rounded hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Analyzing…" : result ? "Re-analyze" : "Analyze Deed"}
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-text-muted py-4">
          <span className="animate-spin text-accent-teal">⟳</span>
          Reading deed language…
        </div>
      )}

      {error && (
        <div className="bg-accent-red/10 border border-accent-red/30 rounded p-3 text-xs text-accent-red">
          {error}
          <button type="button" onClick={analyze} className="ml-3 underline">
            Retry
          </button>
        </div>
      )}

      {result && allEmpty && (
        <p className="text-xs text-text-muted py-2">
          No subdivision lineage or boundary change information found in this deed text.
        </p>
      )}

      {result && hasContent && (
        <div className="mt-2">
          {/* New subdivision names warning */}
          {result.new_subdivision_names.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 text-xs text-yellow-300 mb-4">
              <strong>New subdivisions detected:</strong>{" "}
              {result.new_subdivision_names.join(", ")}
              <br />
              Clicking Apply will create these as research candidates in the database.
            </div>
          )}

          {/* Section A */}
          {result.subdivision_links.some((_, i) => !dismissedLinks.has(i)) && (
            <div className="mb-5">
              <SectionHeader>
                A — Subdivision {result.subdivision_links.length > 1 ? "Links" : "Link"}
                {result.subdivision_links.length > 1 && (
                  <span className="ml-2 text-[10px] font-normal text-text-muted normal-case tracking-normal">
                    {result.subdivision_links.length} parcels in deed
                  </span>
                )}
              </SectionHeader>
              {result.subdivision_links.map((link, i) =>
                dismissedLinks.has(i) ? null : (
                  <SubdivisionLinkSection
                    key={i}
                    link={link}
                    pin={pin}
                    deedNotes={deedNotes ?? ""}
                    allSubdivisions={allSubdivisions}
                    onApplied={() => { setDismissedLinks((prev) => new Set([...prev, i])); handleApplied(); }}
                    onSkip={() => setDismissedLinks((prev) => new Set([...prev, i]))}
                  />
                )
              )}
            </div>
          )}

          {/* Section B */}
          {result.lineage_records.some((_, i) => !dismissedLineage.has(i)) && (
            <div className="mb-5">
              <SectionHeader>B — Subdivision Lineage</SectionHeader>
              {result.lineage_records.map((rec, i) =>
                dismissedLineage.has(i) ? null : (
                  <LineageRecordCard
                    key={i}
                    record={rec}
                    index={i}
                    pin={pin}
                    address={address}
                    deedNotes={deedNotes ?? ""}
                    allSubdivisions={allSubdivisions}
                    onApplied={() => {
                      setDismissedLineage((prev) => new Set([...prev, i]));
                      handleApplied();
                    }}
                    onSkip={() => setDismissedLineage((prev) => new Set([...prev, i]))}
                  />
                )
              )}
            </div>
          )}

          {/* Section C */}
          {result.change_events.some((_, i) => !dismissedChanges.has(i)) && (
            <div className="mb-5">
              <SectionHeader>C — Boundary Changes</SectionHeader>
              {result.change_events.map((ev, i) =>
                dismissedChanges.has(i) ? null : (
                  <ChangeEventCard
                    key={i}
                    event={ev}
                    index={i}
                    onApplied={() => {
                      setDismissedChanges((prev) => new Set([...prev, i]));
                      handleApplied();
                    }}
                    onSkip={() => setDismissedChanges((prev) => new Set([...prev, i]))}
                  />
                )
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
