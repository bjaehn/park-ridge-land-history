import { Sparkles } from "lucide-react";

const LABELS: Record<string, string> = {
  property: "property narrative",
  block: "block summary",
  neighborhood: "neighborhood story",
  city: "citywide summary",
};

type Props = {
  entityType: "property" | "block" | "neighborhood" | "city";
  entityName?: string;
};

export function AISummaryPlaceholder({ entityType, entityName }: Props) {
  const label = LABELS[entityType] ?? "summary";
  return (
    <div className="glass-card-sm" style={{ padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Sparkles size={13} strokeWidth={2} style={{ color: "#fbbf24" }} aria-hidden="true" />
        <span className="badge badge-amber">Coming soon</span>
        <span style={{ color: "rgba(255,255,255,0.30)", fontSize: "0.70rem" }}>
          AI-generated {label}
        </span>
      </div>
      <p style={{ margin: 0, color: "rgba(255,255,255,0.32)", fontSize: "0.75rem", lineHeight: 1.55 }}>
        An AI-generated {label}{entityName ? ` for ${entityName}` : ""}, grounded in verified source records
        with inline citations, will appear here when the Supabase data pipeline is activated.
        {/* TODO: Fetch from ai_summaries Supabase table filtered by entity_type + entity_id */}
      </p>
    </div>
  );
}
