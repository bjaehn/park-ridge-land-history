"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mergeSubdivisions } from "../../_actions/subdivisions";

type Candidate = {
  subdivision_a_id: string;
  subdivision_a_name: string;
  subdivision_b_id: string;
  subdivision_b_name: string;
  similarity_score: number;
  match_basis: string;
};

export function DuplicateCandidatesPanel({ candidates }: { candidates: Candidate[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function keyFor(c: Candidate) {
    return `${c.subdivision_a_id}:${c.subdivision_b_id}`;
  }

  function merge(winnerId: string, loserId: string, key: string) {
    if (
      !confirm(
        "This will reassign all properties, aliases, and lineage records from the losing record to the surviving one, then mark the losing record deprecated. This does not delete anything and can be manually reversed by an admin. Continue?"
      )
    ) {
      return;
    }
    setErr(null);
    setBusyKey(key);
    startTransition(() => {
      mergeSubdivisions(winnerId, loserId).then((r) => {
        setBusyKey(null);
        if (r?.error) { setErr(r.error); return; }
        setHidden((prev) => new Set(prev).add(key));
        router.refresh();
      });
    });
  }

  const visible = candidates.filter((c) => !hidden.has(keyFor(c)));

  if (visible.length === 0) {
    return (
      <div className="bg-surface-raised border border-surface-border rounded-lg p-8 text-center text-sm text-text-muted">
        No duplicate candidates above the similarity threshold right now.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {err && <p className="text-accent-red text-sm">{err}</p>}
      {visible.map((c) => {
        const key = keyFor(c);
        const pct = Math.round(c.similarity_score * 100);
        return (
          <div
            key={key}
            className="bg-surface-raised border border-surface-border rounded-lg p-4 flex items-center justify-between gap-4"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-text-primary truncate">{c.subdivision_a_name}</span>
                <span className="text-text-muted">↔</span>
                <span className="font-medium text-text-primary truncate">{c.subdivision_b_name}</span>
              </div>
              <p className="text-xs text-text-muted mt-1">
                {pct}% {c.match_basis} similarity
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={busyKey === key}
                onClick={() => merge(c.subdivision_a_id, c.subdivision_b_id, key)}
                className="text-xs bg-accent-teal/10 text-accent-teal border border-accent-teal/30 rounded px-3 py-1.5 hover:bg-accent-teal/20 transition-colors disabled:opacity-50"
                title={`Keep "${c.subdivision_a_name}", merge "${c.subdivision_b_name}" into it`}
              >
                Keep A, merge B →
              </button>
              <button
                type="button"
                disabled={busyKey === key}
                onClick={() => merge(c.subdivision_b_id, c.subdivision_a_id, key)}
                className="text-xs bg-accent-teal/10 text-accent-teal border border-accent-teal/30 rounded px-3 py-1.5 hover:bg-accent-teal/20 transition-colors disabled:opacity-50"
                title={`Keep "${c.subdivision_b_name}", merge "${c.subdivision_a_name}" into it`}
              >
                ← Keep B, merge A
              </button>
              <button
                type="button"
                onClick={() => setHidden((prev) => new Set(prev).add(key))}
                className="text-xs text-text-secondary hover:text-text-primary transition-colors px-2"
              >
                Not a duplicate
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
