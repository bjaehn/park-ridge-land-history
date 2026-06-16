import type { SubdivisionFullDetail, SubdivisionHistoricalFact, SubdivisionResearchTask } from "@/lib/subdivisionTypes";
import { statusLabel, confidencePlainText } from "@/lib/subdivisionTypes";
import {
  SourceIcon,
  SearchIcon,
  ExternalLinkIcon,
} from "@/lib/icons";

// ─── Fact type badge ──────────────────────────────────────────────────────────

function factTypeBadgeClass(factType: string | null | undefined): string {
  switch (factType) {
    case "plat_recorded":
    case "legal_description":
      return "bg-accent-purple/15 text-accent-purple border border-accent-purple/30";
    case "lots_for_sale":
    case "subdivision_advertised":
      return "bg-accent-teal/15 text-accent-teal border border-accent-teal/30";
    case "historic_survey":
      return "bg-accent-teal/15 text-accent-teal border border-accent-teal/30";
    case "infrastructure_petition":
    case "annexation":
      return "bg-accent-amber/15 text-accent-amber border border-accent-amber/30";
    default:
      return "bg-surface-raised text-text-muted border border-surface-border";
  }
}

function factTypeLabel(factType: string | null | undefined): string {
  const labels: Record<string, string> = {
    plat_recorded: "Plat recorded",
    legal_description: "Legal description",
    lots_for_sale: "Lots for sale",
    subdivision_advertised: "Advertised",
    infrastructure_petition: "Infrastructure",
    annexation: "Annexation",
    church_or_institutional_land: "Institutional",
    farm: "Farm",
    historic_survey: "Historic survey",
    research_lead: "Research lead",
    newspaper: "Newspaper",
  };
  return labels[factType ?? ""] ?? (factType ?? "");
}

// ─── Confidence dot ───────────────────────────────────────────────────────────

function confidenceDotClass(level: string | null | undefined): string {
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

function confidenceTextClass(level: string | null | undefined): string {
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

// ─── Status badge ─────────────────────────────────────────────────────────────

function statusBadgeClass(status: string | null | undefined): string {
  switch (status) {
    case "verified":
      return "text-confidence-high font-medium";
    case "partially_verified":
      return "text-confidence-medium font-medium";
    case "research_candidate":
      return "text-text-muted";
    case "needs_manual_review":
      return "text-confidence-low font-medium";
    default:
      return "text-text-muted";
  }
}

// ─── FactCard (inline) ────────────────────────────────────────────────────────

function FactCard({ fact }: { fact: SubdivisionHistoricalFact }) {
  const hasSource = Boolean(fact.source ?? fact.source_name);
  const sourceTitle = fact.source?.title ?? fact.source?.source_name ?? fact.source_name ?? null;
  const sourcePublisher = fact.source?.author_or_publisher ?? null;
  const sourceDate = fact.source?.publication_date ?? null;
  const sourceUrl = fact.source?.source_url ?? null;
  const archiveLocation = fact.source?.archive_location ?? null;

  return (
    <div className="bg-surface-card border border-surface-border rounded-lg p-4 mb-3">
      {/* Top row: year + fact type badge */}
      <div className="flex items-center gap-2 flex-wrap">
        {fact.event_year != null && (
          <span className="text-xs font-mono text-text-muted">{fact.event_year}</span>
        )}
        {fact.fact_type && (
          <span
            className={`text-xs px-1.5 py-0.5 rounded font-medium ${factTypeBadgeClass(fact.fact_type)}`}
          >
            {factTypeLabel(fact.fact_type)}
          </span>
        )}
      </div>

      {/* Title */}
      <p className="text-sm font-semibold text-text-primary mt-1">{fact.title}</p>

      {/* Description */}
      {fact.description && (
        <p className="text-sm text-text-secondary leading-relaxed mt-1">{fact.description}</p>
      )}

      {/* Direct quote */}
      {fact.direct_quote && (
        <blockquote className="text-xs text-text-secondary italic border-l-2 border-surface-border pl-3 mt-2">
          {fact.direct_quote}
        </blockquote>
      )}

      {/* Citation + confidence row */}
      <div className="flex items-start justify-between gap-3 mt-3">
        {/* Citation */}
        <div className="text-xs text-text-muted min-w-0">
          {hasSource && (
            <span className="flex items-start gap-1 flex-wrap">
              <SourceIcon className="w-3 h-3 mt-0.5 shrink-0" />
              <span className="break-words">
                {sourceTitle && <span className="font-medium">{sourceTitle}</span>}
                {sourcePublisher && <span> · {sourcePublisher}</span>}
                {sourceDate && <span> · {sourceDate}</span>}
                {fact.source_page && <span> · p.{fact.source_page}</span>}
              </span>
              {sourceUrl ? (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-link inline-flex items-center gap-0.5 hover:underline"
                >
                  <ExternalLinkIcon className="w-3 h-3" />
                </a>
              ) : archiveLocation ? (
                <span className="text-text-muted">[{archiveLocation}]</span>
              ) : null}
            </span>
          )}
        </div>

        {/* Confidence indicator */}
        <div className="flex items-center gap-1 shrink-0">
          <span
            className={`w-2 h-2 rounded-full ${confidenceDotClass(fact.confidence_level)}`}
          />
          <span className={`text-xs ${confidenceTextClass(fact.confidence_level)}`}>
            {confidencePlainText(fact.confidence_level)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── ResearchTaskRow (inline) ─────────────────────────────────────────────────

function ResearchTaskRow({ task }: { task: SubdivisionResearchTask }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-surface-border last:border-0">
      <SearchIcon className="w-4 h-4 text-text-muted mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-text-primary break-words">
            {task.search_query}
          </span>
          {task.priority === "high" && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-accent-amber/15 text-accent-amber border border-accent-amber/30 font-medium">
              High priority
            </span>
          )}
        </div>
        {task.target_archive && (
          <p className="text-xs text-text-muted mt-0.5">{task.target_archive}</p>
        )}
        {task.reason && (
          <p className="text-xs text-text-secondary mt-1 leading-relaxed">{task.reason}</p>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  subdivision: SubdivisionFullDetail;
};

export function SubdivisionHistoryPanel({ subdivision }: Props) {
  const facts = subdivision.facts ?? [];
  const aliases = subdivision.aliases ?? [];
  const tasks = subdivision.research_tasks ?? [];
  const hasContent = facts.length > 0 || tasks.length > 0;

  return (
    <div>
      {/* Status + alias badges row */}
      {(subdivision.status || aliases.length > 0) && (
        <div className="flex items-center gap-2 flex-wrap mb-4">
          {subdivision.status && (
            <span className={`text-xs ${statusBadgeClass(subdivision.status)}`}>
              {statusLabel(subdivision.status)}
            </span>
          )}
          {aliases.map((a) => (
            <span
              key={a.id}
              className="text-xs px-2 py-0.5 rounded bg-surface-raised border border-surface-border text-text-muted"
              title={a.alias_type ?? undefined}
            >
              {a.alias}
            </span>
          ))}
        </div>
      )}

      {/* Historical summary */}
      {subdivision.historical_summary && (
        <p className="text-sm text-text-secondary leading-relaxed max-w-prose mb-6">
          {subdivision.historical_summary}
        </p>
      )}

      {!hasContent && (
        <p className="text-sm text-text-muted italic">
          Historical research not yet added for this subdivision.
        </p>
      )}

      {/* What we know */}
      {facts.length > 0 && (
        <div className="mb-6">
          <p className="section-heading">What we know</p>
          {facts.map((fact) => (
            <FactCard key={fact.id} fact={fact} />
          ))}
        </div>
      )}

      {/* What still needs research */}
      {tasks.length > 0 && (
        <div>
          <p className="section-heading">What still needs research</p>
          <p className="text-xs text-text-muted mb-3">
            The following searches at archives and databases would improve the record for this
            subdivision.
          </p>
          <div className="bg-surface-card border border-surface-border rounded-lg px-4">
            {tasks.map((task) => (
              <ResearchTaskRow key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
