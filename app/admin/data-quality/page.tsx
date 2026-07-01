import Link from "next/link";
import { adminSupabase } from "@/lib/supabase/adminClient";
import { countUnparsedDeeds } from "../_actions/aiDeedAnalysis";
import { DeedParseBatchRunner } from "./_DeedParseBatchRunner";
import { AISubdivisionAnalysisPanel } from "./_AISubdivisionAnalysisPanel";

const SEVERITY_COLORS: Record<string, string> = {
  high:   "text-confidence-low    bg-confidence-low/10    border-confidence-low/30",
  medium: "text-confidence-medium bg-confidence-medium/10 border-confidence-medium/30",
  low:    "text-text-muted        bg-surface-card         border-surface-border",
};

type SummaryRow = { check_type: string; label: string; severity: string; issue_count: number };
type DetailRow = {
  check_type: string;
  entity_type: string;
  entity_id: string;
  problem: string;
  severity: string;
  suggested_fix: string;
  source_fields: string[];
};

export default async function DataQualityPage({
  searchParams,
}: {
  searchParams: { check?: string };
}) {
  const activeCheck = searchParams.check ?? null;

  const [{ data: summaryRaw }, { data: detailRaw }, unparsedDeedCount] = await Promise.all([
    adminSupabase.rpc("data_quality_summary"),
    adminSupabase.rpc("data_quality_report", { p_check_type: activeCheck, p_limit: 200 }),
    countUnparsedDeeds(),
  ]);

  const summary = (summaryRaw ?? []) as SummaryRow[];
  const details = (detailRaw ?? []) as DetailRow[];
  const totalIssues = summary.reduce((sum, r) => sum + Number(r.issue_count), 0);

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-widest uppercase text-text-secondary mb-2">
          Admin
        </p>
        <h1 className="text-2xl font-bold text-text-primary">Data Quality Report</h1>
        <p className="text-sm text-text-secondary mt-1">
          {totalIssues.toLocaleString()} issue{totalIssues !== 1 ? "s" : ""} across {summary.length} checks.
          Detail rows are capped at 200 per check for performance — use this as a
          triage list, not an exhaustive export.
        </p>
      </div>

      <DeedParseBatchRunner initialRemaining={unparsedDeedCount} />

      <AISubdivisionAnalysisPanel />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {summary.map((row) => (
          <Link
            key={row.check_type}
            href={activeCheck === row.check_type ? "/admin/data-quality" : `/admin/data-quality?check=${row.check_type}`}
            className={`block border rounded-lg p-4 transition-colors ${
              activeCheck === row.check_type
                ? "border-accent-teal bg-accent-teal/5"
                : "border-surface-border bg-surface-raised hover:border-accent-teal/40"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className={`inline-flex px-1.5 py-0.5 rounded border text-[10px] font-medium uppercase tracking-wider ${
                  SEVERITY_COLORS[row.severity] ?? SEVERITY_COLORS.low
                }`}
              >
                {row.severity}
              </span>
              <span className="text-lg font-bold tabular-nums text-text-primary">
                {Number(row.issue_count).toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-text-secondary leading-snug">{row.label}</p>
          </Link>
        ))}
      </div>

      {activeCheck && (
        <div className="mb-4">
          <Link href="/admin/data-quality" className="text-xs text-accent-teal hover:underline">
            ← Clear filter
          </Link>
        </div>
      )}

      <div className="bg-surface-raised border border-surface-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border">
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Entity</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Problem</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Suggested fix</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Severity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {details.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-text-muted">
                  No issues found{activeCheck ? " for this check" : ""}.
                </td>
              </tr>
            )}
            {details.map((d, i) => (
              <tr key={`${d.check_type}-${d.entity_id}-${i}`} className="hover:bg-surface-card transition-colors">
                <td className="px-4 py-3 text-text-secondary">
                  <span className="text-text-muted text-xs uppercase tracking-wider mr-1.5">{d.entity_type}</span>
                  {d.entity_type === "parcel" ? (
                    <Link href={`/admin/properties/${encodeURIComponent(d.entity_id)}`} className="text-accent-teal hover:underline font-mono">
                      {d.entity_id}
                    </Link>
                  ) : (
                    <span className="font-mono">{d.entity_id}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-text-primary max-w-sm">{d.problem}</td>
                <td className="px-4 py-3 text-text-muted max-w-sm">{d.suggested_fix}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded border text-xs font-medium ${
                      SEVERITY_COLORS[d.severity] ?? SEVERITY_COLORS.low
                    }`}
                  >
                    {d.severity}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
