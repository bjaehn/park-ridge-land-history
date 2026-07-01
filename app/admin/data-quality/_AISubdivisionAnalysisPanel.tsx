"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  analyzeSubdivisionDuplicatesWithAI,
  mergeSubdivisions,
  type SubdivisionAISuggestion,
  type SubdivisionAIVerdict,
} from "../_actions/subdivisions";

const BATCH_SIZE = 8;

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
  const [running, setRunning] = useState(false);
  const [suggestions, setSuggestions] = useState<SubdivisionAISuggestion[] | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mergedKeys, setMergedKeys] = useState<Set<string>>(new Set());
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const stopRef = useRef(false);
  const offsetRef = useRef(0);

  function runOneBatch() {
    startTransition(() => {
      analyzeSubdivisionDuplicatesWithAI(0.4, offsetRef.current, BATCH_SIZE).then((r) => {
        if (r.error) {
          setError(r.error);
          setRunning(false);
          return;
        }
        setSuggestions((prev) => [...(prev ?? []), ...(r.suggestions ?? [])]);
        const done = Math.min(r.nextOffset ?? offsetRef.current, r.total ?? 0);
        setProgress({ done, total: r.total ?? 0 });
        offsetRef.current = r.nextOffset ?? offsetRef.current;
        if (r.hasMore && !stopRef.current) {
          runOneBatch();
        } else {
          setRunning(false);
        }
      }).catch((err) => {
        setError(err instanceof Error ? err.message : "Analysis failed unexpectedly.");
        setRunning(false);
      });
    });
  }

  function run() {
    setError(null);
    setSuggestions([]);
    setProgress(null);
    offsetRef.current = 0;
    stopRef.current = false;
    setRunning(true);
    runOneBatch();
  }

  function stop() {
    stopRef.current = true;
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
            Processes {BATCH_SIZE} pairs at a time; there can be a couple hundred candidates, so
            this may take a few minutes and you can stop anytime.
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {running ? (
            <button
              type="button"
              onClick={stop}
              className="text-xs bg-accent-red/10 text-accent-red border border-accent-red/30 rounded px-3 py-1.5 hover:bg-accent-red/20 transition-colors"
            >
              Stop after current batch
            </button>
          ) : (
            <button
              type="button"
              onClick={run}
              className="text-xs bg-accent-teal/10 text-accent-teal border border-accent-teal/30 rounded px-3 py-1.5 hover:bg-accent-teal/20 transition-colors"
            >
              {suggestions ? "Re-analyze" : "Analyze candidates with AI"}
            </button>
          )}
        </div>
      </div>

      {progress && (
        <p className="text-xs text-text-muted mb-2">
          Analyzed {progress.done} of {progress.total} pair(s){running ? "…" : "."}
        </p>
      )}

      {error && <p className="text-accent-red text-xs mb-3">{error}</p>}

      {suggestions && suggestions.length === 0 && !running && (
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
