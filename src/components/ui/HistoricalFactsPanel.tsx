import type { HistoricalFact, HistoricalFactConfidence } from "@/lib/data/historicalFacts";
import { ERA_PALETTE, ERA_ORDER, getEraColor } from "@/lib/mapConfig";
import { LandmarkDesignationIcon, ProposalIcon, EventDotIcon } from "@/lib/icons";

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

// ─── Fact-type badge: 1996 plan proposals and landmarks get distinct badges ──
// so readers don't mistake a recommendation for something that actually
// happened, and can spot official landmark designations at a glance.

function isProposal(factType: string | null): boolean {
  return factType === "plan_1996_proposal";
}

function isLandmark(factType: string | null): boolean {
  return factType === "landmark";
}

function factTypeBadge(fact: HistoricalFact): { label: string; className: string } | null {
  if (isProposal(fact.factType)) {
    return {
      label: "1996 plan proposal",
      className: "bg-accent-amber/15 text-accent-amber border border-accent-amber/30",
    };
  }
  if (isLandmark(fact.factType)) {
    return {
      label: "Designated Landmark",
      className: "bg-accent-purple/15 text-accent-purple border border-accent-purple/30",
    };
  }
  if (!fact.category) return null;
  return {
    label: fact.category,
    className: "bg-surface-raised text-text-muted border border-surface-border",
  };
}

// ─── Timeline marker: icon + color by fact type, falling back to era color ──

function factIcon(fact: HistoricalFact) {
  if (isLandmark(fact.factType)) return LandmarkDesignationIcon;
  if (isProposal(fact.factType)) return ProposalIcon;
  return EventDotIcon;
}

function markerStyle(fact: HistoricalFact): { className: string; style?: { color: string } } {
  if (isLandmark(fact.factType)) return { className: "text-accent-purple" };
  if (isProposal(fact.factType)) return { className: "text-accent-amber" };
  const hex = getEraColor(effectiveYear(fact) ?? undefined);
  return hex ? { className: "", style: { color: hex } } : { className: "text-text-muted" };
}

// ─── Effective year: many facts (esp. from the 1996 plan) only have a
// date_text string like "1996" or "1920s", with no date_start integer --
// falling back to Infinity for those pushed them to the END of the sort,
// even though they're often the OLDEST facts on the page. Extract a year
// from date_text so sorting/grouping reflects the real date, not just
// whichever facts happen to have the structured column populated. ─────────

function effectiveYear(fact: HistoricalFact): number | null {
  if (fact.dateStart != null) return fact.dateStart;
  const match = fact.dateText?.match(/\d{4}/);
  return match ? parseInt(match[0], 10) : null;
}

function FactTimelineItem({ fact }: { fact: HistoricalFact }) {
  const badge = factTypeBadge(fact);
  const proposal = isProposal(fact.factType);
  const Icon = factIcon(fact);
  const marker = markerStyle(fact);

  return (
    <li className="relative">
      <span
        className={`absolute -left-[1.9rem] flex items-center justify-center w-7 h-7 bg-surface-base border border-surface-border rounded-full ${marker.className}`}
        style={marker.style}
      >
        <Icon size={13} strokeWidth={2} aria-hidden="true" />
      </span>
      <div className="min-w-0 bg-surface-card border border-surface-border rounded-lg p-4">
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
    </li>
  );
}

function FactTimeline({ facts }: { facts: HistoricalFact[] }) {
  return (
    <ol className="relative ml-3.5 pl-6 border-l border-surface-border space-y-5">
      {facts.map((fact) => (
        <FactTimelineItem key={fact.factId} fact={fact} />
      ))}
    </ol>
  );
}

// ─── Era grouping (same convention as the decade-grouping pattern in
// app/pin/[prefix]/_PinGroupContent.tsx) — only worth doing once a list is
// long enough that grouping actually aids scanning; short lists (typical for
// a single neighborhood) read better as one plain timeline. ─────────────────

const GROUP_THRESHOLD = 8;

function eraKey(dateStart: number | null): string {
  if (!dateStart) return "Unknown";
  if (dateStart < 1900) return "Pre-1900";
  return `${Math.floor(dateStart / 10) * 10}s`;
}

type Props = {
  facts: HistoricalFact[];
  heading?: string;
};

export function HistoricalFactsPanel({ facts, heading = "From the historical record" }: Props) {
  if (facts.length === 0) return null;

  const sorted = [...facts].sort(
    (a, b) => (effectiveYear(a) ?? Infinity) - (effectiveYear(b) ?? Infinity)
  );

  const groups = new Map<string, HistoricalFact[]>();
  for (const fact of sorted) {
    const key = eraKey(effectiveYear(fact));
    const arr = groups.get(key) ?? [];
    arr.push(fact);
    groups.set(key, arr);
  }

  const useGrouping = facts.length > GROUP_THRESHOLD && groups.size > 1;

  if (!useGrouping) {
    return (
      <div>
        <h2 className="section-heading">{heading}</h2>
        <FactTimeline facts={sorted} />
      </div>
    );
  }

  const orderedGroups = Array.from(groups.entries()).sort(
    ([a], [b]) => ERA_ORDER.indexOf(a as (typeof ERA_ORDER)[number]) - ERA_ORDER.indexOf(b as (typeof ERA_ORDER)[number])
  );

  return (
    <div>
      <h2 className="section-heading">{heading}</h2>
      <div className="space-y-8">
        {orderedGroups.map(([era, eraFacts]) => (
          <div key={era}>
            <div className="flex items-center gap-3 mb-3">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: ERA_PALETTE[era] ?? ERA_PALETTE.Unknown }}
                aria-hidden="true"
              />
              <span className="text-sm font-semibold text-text-secondary tracking-wide">
                {era === "Unknown" ? "Unknown era" : era}
              </span>
              <div className="flex-1 border-t border-surface-border" />
              <span className="text-xs text-text-muted">{eraFacts.length}</span>
            </div>
            <FactTimeline facts={eraFacts} />
          </div>
        ))}
      </div>
    </div>
  );
}
