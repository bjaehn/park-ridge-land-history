import type { HistoricalFact, HistoricalFactConfidence } from "@/lib/data/historicalFacts";

// ─── Confidence dot (mirrors SubdivisionHistoryPanel's convention) ───────────

function confidenceDotClass(level: HistoricalFactConfidence): string {
  switch (level) {
    case "high":
      return "bg-confidence-high";
    case "medium":
      return "bg-confidence-medium";
    case "low":
      return "bg-confidence-low";
    default:
      return "bg-confidence-unknown";
  }
}

function confidenceTextClass(level: HistoricalFactConfidence): string {
  switch (level) {
    case "high":
      return "text-confidence-high";
    case "medium":
      return "text-confidence-medium";
    case "low":
      return "text-confidence-low";
    default:
      return "text-confidence-unknown";
  }
}

function confidencePlainText(level: HistoricalFactConfidence): string {
  const labels: Record<HistoricalFactConfidence, string> = {
    high: "Verified by cited source",
    medium: "Supported by cited source",
    low: "Research lead, not yet verified",
    unknown: "Unknown",
  };
  return labels[level] ?? "Unknown";
}

// ─── Fact-type badge: 1996 plan proposals get a distinct amber "proposed" ────
// treatment so readers don't mistake a recommendation for something that
// actually happened.

function isProposal(factType: string | null): boolean {
  return factType === "plan_1996_proposal";
}

function factTypeBadge(fact: HistoricalFact): { label: string; className: string } | null {
  if (isProposal(fact.factType)) {
    return {
      label: "1996 plan proposal",
      className: "bg-accent-amber/15 text-accent-amber border border-accent-amber/30",
    };
  }
  if (!fact.category) return null;
  return {
    label: fact.category,
    className: "bg-surface-raised text-text-muted border border-surface-border",
  };
}

function FactCard({ fact }: { fact: HistoricalFact }) {
  const badge = factTypeBadge(fact);
  const proposal = isProposal(fact.factType);

  return (
    <div className="bg-surface-card border border-surface-border rounded-lg p-4 mb-3">
      <div className="flex items-center gap-2 flex-wrap">
        {fact.dateText && (
          <span className="text-xs font-mono text-text-muted">{fact.dateText}</span>
        )}
        {badge && (
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${badge.className}`}>
            {badge.label}
          </span>
        )}
      </div>

      <p className="text-sm font-semibold text-text-primary mt-1">
        {proposal && <span className="text-accent-amber">Proposed: </span>}
        {fact.title}
      </p>

      {fact.summary && (
        <p className="text-sm text-text-secondary leading-relaxed mt-1">{fact.summary}</p>
      )}

      <div className="flex items-start justify-between gap-3 mt-3">
        <div className="text-xs text-text-muted min-w-0">
          {fact.source && (
            <span className="break-words">
              <span className="font-medium">{fact.source.title}</span>
              {fact.source.publication_year && <span> ({fact.source.publication_year})</span>}
              {fact.printedPage && <span> · p.{fact.printedPage}</span>}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className={`w-2 h-2 rounded-full ${confidenceDotClass(fact.confidence)}`} />
          <span className={`text-xs ${confidenceTextClass(fact.confidence)}`}>
            {confidencePlainText(fact.confidence)}
          </span>
        </div>
      </div>
    </div>
  );
}

type Props = {
  facts: HistoricalFact[];
  heading?: string;
};

export function HistoricalFactsPanel({ facts, heading = "From the historical record" }: Props) {
  if (facts.length === 0) return null;

  return (
    <div>
      <p className="section-heading">{heading}</p>
      {facts.map((fact) => (
        <FactCard key={fact.factId} fact={fact} />
      ))}
    </div>
  );
}
