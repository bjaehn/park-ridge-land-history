"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  bulkLinkParcelsByPageCodes,
  suggestPlatEntriesForSubdivision,
  linkPlatIndexEntry,
  type PlatEntrySuggestion,
} from "../_actions/platMapping";

function confidenceClasses(confidence: string) {
  if (confidence === "high") return "border-emerald-500/40 text-emerald-400 bg-emerald-500/10";
  if (confidence === "medium") return "border-amber-400/40 text-amber-300 bg-amber-400/10";
  return "border-surface-border text-text-muted bg-surface-card";
}

export function CandidatePropertiesPanel({
  subdivisionId,
  subdivisionName,
  alternateNames,
  gisPageCodes,
  candidateCount,
  alreadyLinkedCount,
  sampleAddresses,
}: {
  subdivisionId: string;
  subdivisionName: string;
  alternateNames: string[];
  gisPageCodes: string[];
  candidateCount: number;
  alreadyLinkedCount: number;
  sampleAddresses: { address: string; pin_normalized: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [linkedCount, setLinkedCount] = useState<number | null>(null);

  // AI suggestion state (only used when no GIS codes are set)
  const [suggestions, setSuggestions] = useState<PlatEntrySuggestion[] | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  function handleBulkLink() {
    startTransition(async () => {
      const count = await bulkLinkParcelsByPageCodes(subdivisionId, gisPageCodes);
      setLinkedCount(count);
    });
  }

  async function handleSuggest() {
    setSuggestLoading(true);
    setSuggestError(null);
    setSuggestions(null);
    const { suggestions: s, error } = await suggestPlatEntriesForSubdivision(
      subdivisionId,
      subdivisionName,
      alternateNames
    );
    setSuggestLoading(false);
    if (error) setSuggestError(error);
    else setSuggestions(s ?? []);
  }

  function handleLinkEntry(entryId: string) {
    setLinkingId(entryId);
    setLinkError(null);
    startTransition(async () => {
      try {
        await linkPlatIndexEntry(entryId, subdivisionId);
      } catch (err) {
        setLinkError(err instanceof Error ? err.message : String(err));
      } finally {
        setLinkingId(null);
      }
    });
  }

  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold text-text-primary mb-1">
        Candidate Properties via GIS
      </h2>

      {gisPageCodes.length === 0 ? (
        <div className="bg-surface-raised border border-surface-border rounded-lg px-5 py-4 space-y-3">
          <p className="text-xs text-text-muted">No GIS page codes linked to this subdivision yet.</p>

          {!suggestions && !suggestLoading && (
            <button
              onClick={handleSuggest}
              className="px-3 py-1.5 bg-accent-teal text-surface-base text-xs font-semibold rounded hover:bg-accent-teal/80 transition-colors"
            >
              Find matching plat entry
            </button>
          )}

          {suggestLoading && (
            <p className="text-xs text-text-muted animate-pulse">Asking Claude...</p>
          )}

          {suggestError && (
            <p className="text-xs text-red-400">{suggestError}</p>
          )}

          {suggestions !== null && suggestions.length === 0 && (
            <p className="text-xs text-text-muted italic">
              No matching plat entries found.{" "}
              <Link href="/admin/plat-mapping" className="text-accent-teal hover:underline">
                Search the Plat Index
              </Link>{" "}
              manually.
            </p>
          )}

          {suggestions && suggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                AI suggestions
              </p>
              {suggestions.map((s) => (
                <div
                  key={s.entryId}
                  className={`flex items-start gap-3 px-3 py-2.5 rounded border ${confidenceClasses(s.confidence)}`}
                >
                  <span className="text-[11px] font-semibold capitalize min-w-[3.5rem] mt-0.5">
                    {s.confidence}
                  </span>
                  <div className="flex-1 text-xs min-w-0">
                    <span className="font-medium font-mono">{s.shortName}</span>
                    <span className="text-text-muted ml-1 text-[10px]">· {s.fullName}</span>
                    <span className="text-[10px] text-text-muted block mt-0.5">{s.reason}</span>
                    {s.hasGisCodes ? (
                      <span className="text-[10px] text-emerald-400 block mt-0.5">
                        Has GIS codes — candidate properties will appear after linking
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-300/80 block mt-0.5">
                        No GIS codes yet — set them on the Plat Index after linking
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleLinkEntry(s.entryId)}
                    disabled={isPending}
                    className="shrink-0 px-3 py-1 bg-accent-teal text-surface-base text-xs font-semibold rounded hover:bg-accent-teal/80 disabled:opacity-50 transition-colors"
                  >
                    {linkingId === s.entryId ? "Linking..." : "Link"}
                  </button>
                </div>
              ))}
              {linkError && (
                <p className="text-xs text-red-400 pt-1">{linkError}</p>
              )}
              <p className="text-[10px] text-text-muted pt-1">
                <Link href="/admin/plat-mapping" className="text-accent-teal hover:underline">
                  Open Plat Index
                </Link>{" "}
                if none of these match.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-surface-raised border border-surface-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="flex flex-wrap gap-1 mb-1">
                {gisPageCodes.map((c) => (
                  <span
                    key={c}
                    className="inline-block font-mono text-[10px] bg-accent-teal/10 border border-accent-teal/20 rounded px-1.5 py-0.5 text-accent-teal"
                  >
                    {c}
                  </span>
                ))}
              </div>
              <p className="text-sm text-text-primary">
                {linkedCount !== null ? (
                  <span className="text-accent-teal font-medium">
                    {linkedCount} {linkedCount === 1 ? "property" : "properties"} linked.
                  </span>
                ) : candidateCount === 0 ? (
                  <span className="text-text-muted">
                    All {alreadyLinkedCount} parcels for{" "}
                    {gisPageCodes.length === 1 ? "this code are" : "these codes are"} already linked.
                  </span>
                ) : (
                  <>
                    <span className="font-semibold text-amber-400">{candidateCount}</span>{" "}
                    {candidateCount === 1 ? "property" : "properties"}{" "}
                    {candidateCount === 1 ? "matches" : "match"} and{" "}
                    {candidateCount === 1 ? "isn't" : "aren't"} linked to any subdivision yet.
                    {alreadyLinkedCount > 0 && (
                      <span className="text-text-muted ml-1">
                        ({alreadyLinkedCount} already linked to another subdivision)
                      </span>
                    )}
                  </>
                )}
              </p>
            </div>

            {candidateCount > 0 && linkedCount === null && (
              <button
                onClick={handleBulkLink}
                disabled={isPending}
                className="shrink-0 px-4 py-2 bg-accent-teal text-surface-base text-xs font-semibold rounded hover:bg-accent-teal/80 disabled:opacity-50 transition-colors"
              >
                {isPending
                  ? "Linking..."
                  : `Link all ${candidateCount} ${candidateCount === 1 ? "property" : "properties"}`}
              </button>
            )}
          </div>

          {sampleAddresses.length > 0 && linkedCount === null && (
            <ul className="divide-y divide-surface-border">
              {sampleAddresses.map((p) => (
                <li key={p.pin_normalized} className="px-5 py-2 flex items-center justify-between gap-4">
                  <span className="text-xs text-text-primary">{p.address}</span>
                  <Link
                    href={`/properties/${p.pin_normalized}`}
                    target="_blank"
                    className="text-[10px] text-accent-teal/70 hover:text-accent-teal hover:underline shrink-0 transition-colors"
                  >
                    {p.pin_normalized} ↗
                  </Link>
                </li>
              ))}
              {candidateCount > sampleAddresses.length && (
                <li className="px-5 py-2 text-xs text-text-muted italic">
                  ...and {candidateCount - sampleAddresses.length} more
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
