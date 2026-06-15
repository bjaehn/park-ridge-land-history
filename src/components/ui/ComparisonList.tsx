import { compareToScope } from "@/lib/formatters";
import type { ComparisonScope, ComparisonMetric } from "@/lib/formatters";

export type ComparisonRow = {
  scope: ComparisonScope;
  scopeLabel: string;
  propertyValue: number | null;
  referenceValue: number | null;
  referenceLabel?: string;
  metric: ComparisonMetric;
};

type Props = {
  rows: ComparisonRow[];
  title?: string;
};

/**
 * "How this property compares" table. Consumes compareToScope for
 * every sentence, so the grammar is correct by construction.
 *
 * Scopes are: street, neighborhood, city. Never "block".
 */
export function ComparisonList({ rows, title }: Props) {
  return (
    <div>
      {title && (
        <h2 className="text-base font-semibold text-text-primary mb-3">{title}</h2>
      )}
      <div className="divide-y divide-surface-border border border-surface-border rounded-lg overflow-hidden">
        {rows.map((row, i) => {
          const sentence = compareToScope(
            row.propertyValue,
            row.referenceValue,
            row.scope,
            row.metric
          );
          return (
            <div key={i} className="flex items-start justify-between gap-4 px-4 py-3 bg-surface-card">
              <div className="min-w-0">
                <p className="text-xs text-text-muted uppercase tracking-wide mb-0.5">
                  {row.scopeLabel}
                </p>
                <p className="text-sm text-text-secondary leading-relaxed">{sentence}</p>
              </div>
              <div className="text-right shrink-0">
                {row.referenceValue !== null && row.referenceValue !== undefined ? (
                  <span className="text-sm font-mono text-text-primary">
                    {row.referenceLabel ?? String(row.referenceValue)}
                  </span>
                ) : (
                  <span className="text-xs text-text-muted">Unavailable</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
