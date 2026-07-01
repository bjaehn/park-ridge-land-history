import type { LandLineageEntry } from "@/lib/subdivisionTypes";
import { confidenceLevelLabel } from "@/lib/subdivisionTypes";

type ChainStep = { label: string; value: string };

/**
 * Builds the ancestry chain for one lineage entry, from the federal survey
 * (when the deed text captured section/township/range/meridian) down to the
 * current parcel. Steps are only included when the underlying field is
 * actually present -- nothing here is inferred or guessed.
 */
function buildChainSteps(entry: LandLineageEntry): ChainStep[] {
  const steps: ChainStep[] = [];
  const richest = entry.lineage_records?.[0] ?? null;

  if (richest) {
    const surveyParts = [
      richest.section ? `Section ${richest.section}` : null,
      richest.township ? `Township ${richest.township}` : null,
      richest.range ? `Range ${richest.range}` : null,
      richest.meridian,
    ].filter((v): v is string => Boolean(v));
    if (surveyParts.length > 0) {
      steps.push({ label: "Federal survey", value: surveyParts.join(", ") });
    }
    if (richest.parent_subdivision) {
      steps.push({ label: "Parent tract", value: richest.parent_subdivision });
    }
    const parentLotBlock = [
      richest.parent_block ? `Block ${richest.parent_block}` : null,
      (richest.parent_portion ?? richest.parent_lot) ? `Lot ${richest.parent_portion ?? richest.parent_lot}` : null,
    ].filter((v): v is string => Boolean(v));
    if (parentLotBlock.length > 0) {
      steps.push({ label: "Parent lot / block", value: parentLotBlock.join(", ") });
    }
    if (richest.child_subdivision) {
      steps.push({ label: "Subdivision", value: richest.child_subdivision });
    }
    const childLotBlock = [
      richest.child_block ? `Block ${richest.child_block}` : null,
      richest.child_lot ? `Lot ${richest.child_lot}` : null,
    ].filter((v): v is string => Boolean(v));
    if (childLotBlock.length > 0) {
      steps.push({ label: "Lot / block", value: childLotBlock.join(", ") });
    }
    if (richest.address) {
      steps.push({ label: "This property", value: richest.address });
    }
    return steps;
  }

  // Legacy fallback: only subdivision/parent/lot data, no PLSS survey fields.
  if (entry.parent_subdivision) {
    steps.push({ label: "Parent tract", value: entry.parent_subdivision.name });
  }
  if (entry.subdivision.name) {
    steps.push({ label: "Subdivision", value: entry.subdivision.name });
  }
  const lot = entry.lots[0];
  if (lot && (lot.lot_number || lot.block_number)) {
    const parts = [
      lot.block_number ? `Block ${lot.block_number}` : null,
      lot.lot_number ? `Lot ${lot.lot_number}` : null,
    ].filter((v): v is string => Boolean(v));
    steps.push({ label: "Lot / block", value: parts.join(", ") });
  }
  return steps;
}

export function LandLineageVisual({ entries }: { entries: LandLineageEntry[] }) {
  const withSteps = entries
    .map((entry) => ({ entry, steps: buildChainSteps(entry) }))
    .filter((x) => x.steps.length > 0);

  if (withSteps.length === 0) return null;

  return (
    <div className="space-y-6">
      {withSteps.map(({ entry, steps }) => {
        const confidence = entry.lineage_records?.[0]?.confidence ?? entry.subdivision.confidence_level;
        return (
          <div key={entry.subdivision.id} className="bg-surface-card border border-surface-border rounded-lg p-4">
            <ol className="relative ml-2 pl-5 border-l border-surface-border space-y-4">
              {steps.map((step, i) => (
                <li key={`${step.label}-${i}`} className="relative">
                  <span className="absolute -left-[1.45rem] top-0.5 w-2.5 h-2.5 rounded-full bg-accent-purple border-2 border-surface-card" aria-hidden="true" />
                  <p className="text-[10px] text-text-muted uppercase tracking-wider">{step.label}</p>
                  <p className="text-sm font-medium text-text-primary leading-snug">{step.value}</p>
                </li>
              ))}
            </ol>
            <p className="text-xs text-text-muted mt-3 pt-3 border-t border-surface-border">
              Confidence: {confidenceLevelLabel(confidence as Parameters<typeof confidenceLevelLabel>[0])}
              {entry.lineage_records?.[0]?.source_type ? ` · Source: ${entry.lineage_records[0].source_type}` : ""}
            </p>
          </div>
        );
      })}
    </div>
  );
}
