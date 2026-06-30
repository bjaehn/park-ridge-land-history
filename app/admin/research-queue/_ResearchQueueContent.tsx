"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  refreshResearchQueue,
  refreshBoundaryQueue,
  refreshSubdivisionQueue,
  updateQueueStatus,
} from "../_actions/researchQueue";

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
  queue_type: string;
  adjacent_subdivision_names: string[] | null;
  created_at: string;
  updated_at: string;
};

type StatusFilter = "pending" | "boundary" | "all" | "skipped";

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

  const filtered = useMemo(
    () =>
      initialEntries.filter((e) => {
        const status = localStatus[e.id] ?? e.status;
        if (filter === "pending") return status === "pending" && e.queue_type !== "boundary_edge";
        if (filter === "boundary") return e.queue_type === "boundary_edge" && status === "pending";
        if (filter === "skipped") return status === "skipped";
        return true;
      }),
    [initialEntries, filter, localStatus]
  );

  // In boundary mode, group by the top-two subdivision pair.
  // In all other modes, group by the single suspected subdivision.
  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { name: string; id: string | null; entries: QueueEntry[]; isBoundaryPair: boolean }
    >();

    for (const e of filtered) {
      let key: string;
      let displayName: string;
      let isBoundaryPair = false;

      if (filter === "boundary" && (e.adjacent_subdivision_names?.length ?? 0) >= 2) {
        const pair = [...(e.adjacent_subdivision_names ?? [])]
          .slice(0, 2)
          .sort()
          .join(" ↔ ");
        key = pair;
        displayName = pair;
        isBoundaryPair = true;
      } else {
        key = e.suspected_subdivision_id ?? "__none__";
        displayName = e.suspected_subdivision_name ?? "Unknown subdivision";
      }

      if (!map.has(key)) {
        map.set(key, {
          name: displayName,
          id: isBoundaryPair ? null : (e.suspected_subdivision_id ?? null),
          entries: [],
          isBoundaryPair,
        });
      }
      map.get(key)!.entries.push(e);
    }

    return Array.from(map.values()).sort(
      (a, b) =>
        (b.entries[0]?.priority_score ?? 0) - (a.entries[0]?.priority_score ?? 0)
    );
  }, [filtered, filter]);

  function handleStatus(
    id: string,
    status: "pending" | "researched" | "not_found" | "skipped"
  ) {
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
        setLocalStatus({});
        router.refresh();
      }
    });
  }

  function handleRefreshBoundary() {
    setRefreshMsg(null);
    startTransition(async () => {
      const { added, error } = await refreshBoundaryQueue();
      if (error) {
        setRefreshMsg(`Error: ${error}`);
      } else {
        setRefreshMsg(
          added > 0
            ? `Added ${added} boundary edge ${added === 1 ? "candidate" : "candidates"}.`
            : "No new boundary candidates found."
        );
        setLocalStatus({});
        router.refresh();
      }
    });
  }

  const tabs: { value: StatusFilter; label: string }[] = [
    { value: "pending", label: "Pending" },
    { value: "boundary", label: "Boundary edges" },
    { value: "all", label: "All" },
    { value: "skipped", label: "Skipped" },
  ];

  return (
    <div>
      {/* Top controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          onClick={handleRefresh}
          disabled={isPending}
          className="px-4 py-2 bg-accent-teal text-surface-base text-xs font-semibold rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isPending ? "Working…" : "Refresh queue"}
        </button>

        <button
          onClick={handleRefreshBoundary}
          disabled={isPending}
          className="px-4 py-2 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold rounded hover:bg-amber-500/30 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Working…" : "Find boundary edges"}
        </button>

        <div className="flex rounded border border-surface-border overflow-hidden text-xs">
          {tabs.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-3 py-1.5 font-medium transition-colors ${
                filter === value
                  ? "bg-accent-teal text-surface-base"
                  : "bg-surface-raised text-text-muted hover:text-text-primary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {refreshMsg && (
          <span className="text-xs text-text-secondary">{refreshMsg}</span>
        )}
      </div>

      {filter === "boundary" && grouped.length === 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg px-6 py-4 mb-6 text-sm text-amber-200/70">
          No boundary edge candidates yet. Click <strong>Find boundary edges</strong> to scan for
          unassigned properties sitting between two or more known subdivision territories.
        </div>
      )}

      {grouped.length === 0 && filter !== "boundary" ? (
        <div className="bg-surface-raised border border-surface-border rounded-lg px-6 py-10 text-center">
          <p className="text-text-muted text-sm">
            {filter === "pending"
              ? 'No pending properties. Click "Refresh queue" to find new candidates based on current deed research.'
              : "Nothing to show."}
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {grouped.map((group) => (
            <div key={group.isBoundaryPair ? group.name : (group.id ?? "__none__")}>
              {/* Group header */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-semibold text-text-secondary shrink-0">
                  {group.isBoundaryPair ? (
                    <span className="text-amber-300">{group.name}</span>
                  ) : group.id ? (
                    <Link
                      href={`/admin/subdivisions/${group.id}`}
                      className="hover:text-text-primary transition-colors"
                    >
                      {group.name}
                    </Link>
                  ) : (
                    group.name
                  )}
                </span>
                <div className="flex-1 border-t border-surface-border" />
                <span className="text-xs text-text-muted shrink-0">
                  {group.entries.length} candidate{group.entries.length !== 1 ? "s" : ""}
                </span>
                {!group.isBoundaryPair && group.id && (
                  <RefreshSubdivisionButton subdivisionId={group.id} />
                )}
              </div>

              {/* Entry cards */}
              <div className="space-y-3">
                {group.entries.map((entry) => {
                  const status = localStatus[entry.id] ?? entry.status;
                  const isDone = status !== "pending";
                  const isBoundary = entry.queue_type === "boundary_edge";
                  const subdivCount = entry.adjacent_subdivision_names?.length ?? 0;

                  return (
                    <div
                      key={entry.id}
                      className={`bg-surface-raised border rounded-lg px-5 py-4 transition-opacity ${
                        isDone
                          ? "opacity-40 border-surface-border"
                          : isBoundary
                          ? "border-amber-500/25"
                          : "border-surface-border"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="text-sm font-semibold text-text-primary">
                              {entry.address ?? entry.pin}
                            </h3>
                            <PriorityDots score={entry.priority_score} />
                            {isBoundary && subdivCount >= 2 && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                {subdivCount} subdivisions
                              </span>
                            )}
                            {isDone && (
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted px-1.5 py-0.5 border border-surface-border rounded">
                                {status.replace("_", " ")}
                              </span>
                            )}
                          </div>

                          {entry.ai_reasoning && (
                            <p className="text-xs text-text-secondary italic mb-2 leading-relaxed">
                              &ldquo;{entry.ai_reasoning}&rdquo;
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PriorityDots({ score }: { score: number }) {
  const filled = Math.min(5, Math.round(score));
  return (
    <span
      className="flex items-center gap-0.5"
      title={`Priority score: ${score}`}
    >
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

function RefreshSubdivisionButton({ subdivisionId }: { subdivisionId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function handleClick() {
    setMsg(null);
    startTransition(async () => {
      const { added, error } = await refreshSubdivisionQueue(subdivisionId);
      if (error) {
        setMsg(`Error: ${error}`);
      } else {
        setMsg(added > 0 ? `+${added} added` : "Up to date");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="text-xs border border-surface-border text-text-muted px-2.5 py-1 rounded hover:text-text-primary hover:border-text-muted transition-colors disabled:opacity-50"
      >
        {isPending ? "Refreshing…" : "Refresh"}
      </button>
      {msg && <span className="text-xs text-text-muted">{msg}</span>}
    </div>
  );
}
