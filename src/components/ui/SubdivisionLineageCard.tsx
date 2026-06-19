import type { HistoricalSubdivisionLineage } from "@/lib/subdivisionTypes";

function confidenceLabel(confidence: string | null | undefined): string {
  if (!confidence) return "Unknown";
  return confidence.charAt(0).toUpperCase() + confidence.slice(1);
}

function chainItems(lineage: HistoricalSubdivisionLineage): string[] {
  if (Array.isArray(lineage.development_chain) && lineage.development_chain.length) {
    return lineage.development_chain;
  }
  return [
    lineage.parent_subdivision,
    lineage.parent_block,
    lineage.parent_portion ?? lineage.parent_lot,
    lineage.child_subdivision,
    lineage.child_lot,
    lineage.address,
  ].filter((item): item is string => Boolean(item));
}

export function SubdivisionLineageCard({
  lineage,
  showAddress = false,
  compact = false,
  context = "property",
}: {
  lineage: HistoricalSubdivisionLineage;
  showAddress?: boolean;
  compact?: boolean;
  context?: "subdivision" | "property";
}) {
  const items = chainItems(lineage);
  const isSubdivisionContext = context === "subdivision";
  return (
    <article className="bg-surface-card border border-surface-border rounded-lg p-4 space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          {isSubdivisionContext ? "Lineage record" : "Subdivision ancestry"}
        </p>
        <h3 className="text-sm font-semibold text-text-primary mt-1">
          {lineage.child_subdivision}
          {!isSubdivisionContext && showAddress && lineage.address ? (
            <span className="font-normal text-text-secondary"> - {lineage.address}</span>
          ) : null}
        </h3>
      </div>

      {items.length > 0 && (
        <ol className="flex flex-wrap items-center gap-1.5 text-xs text-text-secondary">
          {items.map((item, index) => (
            <li key={`${item}-${index}`} className="flex items-center gap-1.5">
              <span>{item}</span>
              {index < items.length - 1 ? (
                <span className="text-text-muted" aria-hidden="true">-&gt;</span>
              ) : null}
            </li>
          ))}
        </ol>
      )}

      {isSubdivisionContext ? (
        lineage.development_interpretation && (
          <p className="text-sm text-text-secondary leading-relaxed">
            {lineage.development_interpretation}
          </p>
        )
      ) : (
        lineage.plain_english_summary && (
          <p className="text-sm text-text-secondary leading-relaxed">
            {lineage.plain_english_summary}
          </p>
        )
      )}

      {!compact && !isSubdivisionContext && lineage.development_interpretation && (
        <p className="text-sm text-text-muted leading-relaxed">
          {lineage.development_interpretation}
        </p>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted border-t border-surface-border pt-3">
        <span>Source: {lineage.source_type} provided by user</span>
        <span>Confidence: {confidenceLabel(lineage.confidence)}</span>
        {lineage.needs_verification ? <span>Needs recorded plat verification</span> : null}
      </div>

      {!compact && (
        <details className="text-xs text-text-muted">
          <summary className="cursor-pointer hover:text-text-secondary">Source language</summary>
          <blockquote className="mt-2 border-l-2 border-surface-border pl-3 italic leading-relaxed">
            {lineage.source_text}
          </blockquote>
          {lineage.verification_notes ? (
            <p className="mt-2 leading-relaxed">{lineage.verification_notes}</p>
          ) : null}
        </details>
      )}
    </article>
  );
}
