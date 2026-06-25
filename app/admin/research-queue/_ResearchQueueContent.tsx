"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { refreshResearchQueue, updateQueueStatus } from "../_actions/researchQueue";

type QueueEntry = {
  id: string;
  pin: string;
  address: string | null;
  suspected_subdivision_id: string | null;
  suspected_subdivision_name: string | null;
  ai_reasoning: string;
  priority_score: number;
  source_pins: string[] | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type StatusFilter = "pending" | "all" | "skipped";

export function ResearchQueueContent({
  initialEntries,
}: {
  initialEntries: QueueEntry[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState<Record<string, string>>({});

  const displayed = initialEntries.filter((e) => {
    const status = localStatus[e.id] ?? e.status;
    if (filter === "pending") return status === "pending";
    if (filter === "skipped") return status === "skipped";
    return true;
  });

  function handleStatus(id: string, status: "pending" | "researched" | "not_found" | "skipped") {
    setLocalStatus((prev) => ({ ...prev, [id]: status }));
    startTransition(async () => {
      await updateQueueStatus(id, status);
    });
  }

  function handleRefresh() {
    setRefreshMsg(null);
    startTransition(async () => {
      const { added, error } = await refreshResearchQueue();
      if (error) {
        setRefreshMsg(`Error: ${error}`);
      } else {
        setRefreshMsg(
          added > 0
            ? `Added ${added} new ${added === 1 ? "entry" : "entries"} to the queue.`
            : "Queue is up to date — no new properties found."
        );
        router.refresh();
      }
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          onClick={handleRefresh}
          disabled={isPending}
          className="px-4 py-2 bg-accent-teal text-surface-base text-xs font-semibold rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isPending ? "Working…" : "Refresh queue"}
        </button>

        <div className="flex rounded border border-surface-border overflow-hidden text-xs">
          {(["pending", "all", "skipped"] as StatusFilter[]).map((v) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className={`px-3 py-1.5 font-medium capitalize transition-colors ${
                filter === v
                  ? "bg-accent-teal text-surface-base"
                  : "bg-surface-raised text-text-muted hover:text-text-primary"
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {refreshMsg && (
          <span className="text-xs text-text-secondary">{refreshMsg}</span>
        )}
      </div>

      {displayed.length === 0 ? (
        <div className="bg-surface-raised border border-surface-border rounded-lg px-6 py-10 text-center">
          <p className="text-text-muted text-sm">
            {filter === "pending"
              ? 'No pending properties. Click "Refresh queue" to find new candidates based on current deed research.'
              : "Nothing to show."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((entry) => {
            const status = localStatus[entry.id] ?? entry.status;
            const isDone = status !== "pending";
            return (
              <div
                key={entry.id}
                className={`bg-surface-raised border rounded-lg px-5 py-4 transition-opacity ${
                  isDone ? "opacity-40 border-surface-border" : "border-surface-border"
                }`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-sm font-semibold text-text-primary">
                        {entry.address ?? entry.pin}
                      </h3>
                      <PriorityDots score={entry.priority_score} />
                      {isDone && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted px-1.5 py-0.5 border border-surface-border rounded">
                          {status.replace("_", " ")}
                        </span>
                      )}
                    </div>

                    {entry.suspected_subdivision_name && (
                      <p className="text-xs text-accent-teal mb-1.5">
                        Suspected:{" "}
                        {entry.suspected_subdivision_id ? (
                          <Link
                            href={`/admin/subdivisions/${entry.suspected_subdivision_id}`}
                            className="hover:underline"
                          >
                            {entry.suspected_subdivision_name}
                          </Link>
                        ) : (
                          entry.suspected_subdivision_name
                        )}
                      </p>
                    )}

                    {entry.ai_reasoning && (
                      <p className="text-xs text-text-secondary italic mb-2 leading-relaxed">
                        "{entry.ai_reasoning}"
                      </p>
                    )}

                    {entry.source_pins && entry.source_pins.length > 0 && (
                      <p className="text-[10px] text-text-muted">
                        Based on {entry.source_pins.length} researched neighbor
                        {entry.source_pins.length !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>

                  {!isDone && (
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <Link
                        href={`/admin/properties/${entry.pin}`}
                        target="_blank"
                        className="px-3 py-1.5 text-xs border border-surface-border text-text-secondary rounded hover:text-text-primary hover:border-text-muted transition-colors"
                      >
                        Open in admin ↗
                      </Link>
                      <button
                        onClick={() => handleStatus(entry.id, "researched")}
                        disabled={isPending}
                        className="px-3 py-1.5 text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded hover:bg-emerald-500/20 disabled:opacity-50 transition-colors"
                      >
                        Mark researched
                      </button>
                      <button
                        onClick={() => handleStatus(entry.id, "not_found")}
                        disabled={isPending}
                        className="px-3 py-1.5 text-xs border border-surface-border text-text-muted rounded hover:text-text-secondary transition-colors"
                      >
                        Not found
                      </button>
                      <button
                        onClick={() => handleStatus(entry.id, "skipped")}
                        disabled={isPending}
                        className="px-3 py-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors"
                      >
                        Skip
                      </button>
                    </div>
                  )}

                  {isDone && (
                    <button
                      onClick={() => handleStatus(entry.id, "pending")}
                      disabled={isPending}
                      className="text-[10px] text-text-muted hover:text-text-secondary transition-colors shrink-0"
                    >
                      Undo
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PriorityDots({ score }: { score: number }) {
  const filled = Math.min(5, Math.round(score));
  return (
    <span className="flex items-center gap-0.5" title={`Priority: ${score} neighboring anchors`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`inline-block w-1.5 h-1.5 rounded-full ${
            i < filled ? "bg-accent-teal" : "bg-surface-border"
          }`}
        />
      ))}
    </span>
  );
}
