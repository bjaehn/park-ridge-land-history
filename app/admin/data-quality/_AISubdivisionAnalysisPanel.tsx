"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  analyzeSubdivisionDuplicatesWithAI,
  mergeSubdivisions,
  type SubdivisionAISuggestion,
  type SubdivisionAIVerdict,
} from "../_actions/subdivisions";

const VERDICT_STYLE: Record<SubdivisionAIVerdict, string> = {
  likely_same: "text-confidence-high bg-confidence-high/10 border-confidence-high/30",
  parent_child: "text-accent-teal bg-accent-teal/10 border-accent-teal/30",
  likely_different: "text-text-muted bg-surface-card border-surface-border",
  unclear: "text-confidence-medium bg-confidence-medium/10 border-confidence-medium/30",
};

const VERDICT_LABEL: Record<SubdivisionAIVerdict, string> = {
  likely_same: "Likely the same plat",
  parent_child: "Related, keep separate",
  likely_different: "Likely different",
  unclear: "Unclear",
};

export function AISubdivisionAnalysisPanel() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SubdivisionAISuggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mergedKeys, setMergedKeys] = useState<Set<string>>(new Set());
  const [busyKey, setBusyKey] = useState<string | null>(null);

  function run() {
    setLoading(true);
    setError(null);
    startTransition(() => {
      analyzeSubdivisionDuplicatesWithAI().then((r) => {
        setLoading(false);
        if (r.error) { setError(r.error); return; }
        setSuggestions(r.suggestions ?? []);
      }).catch((err) => {
        setLoading(false);
        setError(err instanceof Error ? err.message : "Analysis failed unexpectedly.");
      });
    });
  }

  function merge(winnerId: string, loserId: string, key: string, winnerName: string, loserName: string) {
    if (!confirm(`Merge "${loserName}" into "${winnerName}"? This reassigns all its properties, aliases, and lineage records, then marks it deprecated. Nothing is deleted.`)) {
      return;
    }
    setBusyKey(key);
    startTransition(() => {
      mergeSubdivisions(winnerId, loserId).then((r) => {
        setBusyKey(null);
        if (r?.error) { setError(r.error); return; }
        setMergedKeys((prev) => new Set(prev).add(key));
        router.refresh();
      });
    });
  }

  return (
    <div className="bg-surface-raised border border-surface-border rounded-lg p-5 mb-8">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">AI subdivision analysis</h2>
          <p className="text-xs text-text-muted mt-0.5 max-w-2xl">
            Reads the aliases, developer names, deed excerpts, and linked-property counts behind
            each name-similarity match and explains what it thinks is going on — the same-plat,
            parent/child, or coincidental-name-collision distinction the mechanical similarity
            check on{" "}
            <Link href="/admin/subdivisions/duplicates" className="text-accent-teal hover:underline">
              the duplicates page
            </Link>{" "}
            can&apos;t make on its own. Suggestions only — nothing merges without you clicking it.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="shrink-0 text-xs bg-accent-teal/10 text-accent-teal border border-accent-teal/30 rounded px-3 py-1.5 hover:bg-accent-teal/20 transition-colors disabled:opacity-50"
        >
          {loading ? "Analyzing…" : suggestions ? "Re-analyze" : "Analyze candidates with AI"}
        </button>
      </div>

      {error && <p className="text-accent-red text-xs mb-3">{error}</p>}

      {suggestions && suggestions.length === 0 && (
        <p className="text-xs text-text-muted border-t border-surface-border pt-3 mt-3">
          No candidate pairs above the similarity threshold to analyze.
        </p>
      )}

      {suggestions && suggestions.length > 0 && (
        <div className="space-y-3 border-t border-surface-border pt-3 mt-3">
          {suggestions.map((s) => {
            const key = `${s.subdivision_a_id}:${s.subdivision_b_id}`;
            const merged = mergedKeys.has(key);
            return (
              <div key={key} className={`border rounded-lg p-4 ${merged ? "opacity-50" : ""} bg-surface-card border-surface-border`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 text-sm min-w-0">
                    <span className="font-medium text-text-primary truncate">{s.subdivision_a_name}</span>
                    <span className="text-text-muted shrink-0">↔</span>
                    <span className="font-medium text-text-primary truncate">{s.subdivision_b_name}</span>
                  </div>
                  <span className={`shrink-0 inline-flex px-2 py-0.5 rounded border text-[10px] font-semibold uppercase tracking-wider ${VERDICT_STYLE[s.verdict]}`}>
                    {VERDICT_LABEL[s.verdict]}
                  </span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed mb-1.5">{s.reasoning}</p>
                <p className="text-xs text-text-primary font-medium mb-3">→ {s.recommended_action}</p>

                {merged ? (
                  <p className="text-xs text-confidence-high">Merged.</p>
                ) : s.verdict === "likely_same" ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={busyKey === key}
                      onClick={() => merge(s.subdivision_a_id, s.subdivision_b_id, key, s.subdivision_a_name, s.subdivision_b_name)}
                      className="text-xs bg-accent-teal/10 text-accent-teal border border-accent-teal/30 rounded px-3 py-1.5 hover:bg-accent-teal/20 transition-colors disabled:opacity-50"
                    >
                      Keep A, merge B →
                    </button>
                    <button
                      type="button"
                      disabled={busyKey === key}
                      onClick={() => merge(s.subdivision_b_id, s.subdivision_a_id, key, s.subdivision_b_name, s.subdivision_a_name)}
                      className="text-xs bg-accent-teal/10 text-accent-teal border border-accent-teal/30 rounded px-3 py-1.5 hover:bg-accent-teal/20 transition-colors disabled:opacity-50"
                    >
                      ← Keep B, merge A
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-xs">
                    <Link href={`/admin/subdivisions/${encodeURIComponent(s.subdivision_a_id)}`} className="text-accent-teal hover:underline">
                      Edit {s.subdivision_a_name} →
                    </Link>
                    <Link href={`/admin/subdivisions/${encodeURIComponent(s.subdivision_b_id)}`} className="text-accent-teal hover:underline">
                      Edit {s.subdivision_b_name} →
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
