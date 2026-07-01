"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { processNextDeedParseBatch, type DeedParseBatchItem } from "../_actions/aiDeedAnalysis";

const BATCH_SIZE = 5;

export function DeedParseBatchRunner({ initialRemaining }: { initialRemaining: number }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [remaining, setRemaining] = useState(initialRemaining);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<DeedParseBatchItem[]>([]);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const stopRef = useRef(false);

  function runOneBatch() {
    startTransition(() => {
      processNextDeedParseBatch(BATCH_SIZE).then((r) => {
        if (r.error) {
          setFatalError(r.error);
          setRunning(false);
          return;
        }
        setLog((prev) => [...prev, ...r.processed]);
        setRemaining(r.remaining);
        if (r.remaining > 0 && !stopRef.current) {
          runOneBatch();
        } else {
          setRunning(false);
          router.refresh();
        }
      }).catch((err) => {
        setFatalError(err instanceof Error ? err.message : "Batch failed unexpectedly.");
        setRunning(false);
      });
    });
  }

  function start() {
    setFatalError(null);
    stopRef.current = false;
    setRunning(true);
    runOneBatch();
  }

  function stop() {
    stopRef.current = true;
  }

  if (initialRemaining === 0 && log.length === 0) return null;

  return (
    <div className="bg-surface-raised border border-surface-border rounded-lg p-5 mb-8">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">AI deed parse batch</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Runs every parcel with a legal description on file (that hasn&apos;t been parsed yet)
            through the same AI extraction as the per-property &ldquo;Apply All &amp; Save&rdquo;
            button. Everything lands as &ldquo;needs review&rdquo; — nothing publishes automatically.
            Processes {BATCH_SIZE} at a time so you can stop anytime.
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
              onClick={start}
              disabled={remaining === 0}
              className="text-xs bg-accent-teal/10 text-accent-teal border border-accent-teal/30 rounded px-3 py-1.5 hover:bg-accent-teal/20 transition-colors disabled:opacity-50"
            >
              {remaining === 0 ? "All parsed" : `Run batch (${remaining} remaining)`}
            </button>
          )}
        </div>
      </div>

      {fatalError && <p className="text-accent-red text-xs mb-3">{fatalError}</p>}

      {log.length > 0 && (
        <div className="max-h-64 overflow-y-auto border-t border-surface-border pt-3 mt-3 space-y-1">
          {log.map((item, i) => (
            <p key={`${item.pin}-${i}`} className="text-xs font-mono">
              {item.error ? (
                <span className="text-accent-red">✗ {item.pin} — {item.error}</span>
              ) : (
                <span className="text-text-secondary">
                  ✓ {item.pin}{item.address ? ` (${item.address})` : ""} — {item.linkCount} link(s), {item.lineageCount} lineage record(s)
                </span>
              )}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
