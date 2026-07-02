"use client";

import { useState, useEffect, useTransition } from "react";
import {
  suggestPlatMatch,
  markNoMatch,
  linkPlatIndexEntry,
  fetchPinsForGisPageCodes,
  type PlatMatchSuggestion,
} from "../_actions/platMapping";
import { fetchPinsForSubdivision } from "../_actions/subdivisionMap";
import { ClusterMapCore } from "./_ClusterMapCore";

type UnlinkedEntry = {
  id: string;
  short_name: string;
  full_name: string;
  section_ref: string;
  gis_page_codes: string[] | null;
};

type SubdivisionForMatching = {
  id: string;
  name: string;
  normalized_name: string;
  alternate_names: string[] | null;
};

function confidenceClasses(confidence: string, selected: boolean) {
  const base =
    confidence === "high"
      ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
      : confidence === "medium"
      ? "border-amber-400/40 text-amber-300 bg-amber-400/10"
      : "border-surface-border text-text-muted bg-surface-card";
  return `${base} ${selected ? "ring-2 ring-accent-teal/50 opacity-100" : "opacity-60 hover:opacity-90"}`;
}

export function SuggestionQueue({
  unlinkedEntries,
  allSubdivisions,
}: {
  unlinkedEntries: UnlinkedEntry[];
  allSubdivisions: SubdivisionForMatching[];
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [suggestions, setSuggestions] = useState<PlatMatchSuggestion[] | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [highlightPins, setHighlightPins] = useState<string[]>([]);
  const [comparePins, setComparePins] = useState<string[]>([]);

  const current = unlinkedEntries[currentIndex];
  const remaining = unlinkedEntries.length - currentIndex;
  const done = currentIndex >= unlinkedEntries.length;

  // Highlight this entry's own GIS page code cluster, if it has one.
  useEffect(() => {
    const codes = current?.gis_page_codes ?? [];
    if (!codes.length) {
      setHighlightPins([]);
      return;
    }
    let cancelled = false;
    fetchPinsForGisPageCodes(codes).then((pins) => {
      if (!cancelled) setHighlightPins(pins);
    });
    return () => {
      cancelled = true;
    };
  }, [current?.id, current?.gis_page_codes]);

  // Overlay the currently-selected AI suggestion's existing linked footprint,
  // so the admin can visually compare before accepting.
  useEffect(() => {
    if (!selectedId) {
      setComparePins([]);
      return;
    }
    let cancelled = false;
    fetchPinsForSubdivision(selectedId).then((pins) => {
      if (!cancelled) setComparePins(pins);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    if (!current) return;
    setSuggestions(null);
    setSuggestError(null);
    setSelectedId(null);
    setLoading(true);

    suggestPlatMatch(
      current.short_name,
      current.full_name,
      current.section_ref,
      allSubdivisions.map((s) => ({
        id: s.id,
        name: s.name,
        normalized_name: s.normalized_name,
        alternate_names: s.alternate_names ?? [],
      }))
    ).then(({ suggestions: s, error }) => {
      setLoading(false);
      if (error) {
        setSuggestError(error);
      } else if (s) {
        setSuggestions(s);
        setSelectedId(s[0]?.subdivisionId ?? null);
      }
    });
  }, [currentIndex, current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (dismissed || unlinkedEntries.length === 0) return null;

  if (done) {
    return (
      <div className="mb-8 px-4 py-3 bg-surface-raised border border-surface-border rounded-lg">
        <p className="text-sm text-accent-teal font-medium">
          All {unlinkedEntries.length} queued entries reviewed.
        </p>
      </div>
    );
  }

  const selectedSuggestion = suggestions?.find((s) => s.subdivisionId === selectedId);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-text-primary">
          Needs matching{" "}
          <span className="text-amber-400 font-bold">({remaining})</span>
        </h2>
        <button
          onClick={() => setDismissed(true)}
          className="text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          Skip all
        </button>
      </div>

      <div className="bg-surface-raised border border-surface-border rounded-lg p-5">
        {/* Entry identity */}
        <div className="mb-4">
          <p className="text-base font-mono font-bold text-text-primary tracking-wide">
            {current.short_name}
          </p>
          <p className="text-xs text-text-muted mt-0.5">
            Full: {current.full_name}
            {" · "}
            Section {current.section_ref}
          </p>
        </div>

        {/* AI suggestions */}
        <div className="mb-4">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">
            AI suggestions
          </p>

          {loading && (
            <p className="text-xs text-text-muted animate-pulse">Asking Claude...</p>
          )}

          {suggestError && (
            <p className="text-xs text-red-400">{suggestError}</p>
          )}

          {!loading && suggestions && suggestions.length === 0 && (
            <p className="text-xs text-text-muted italic">No strong matches found.</p>
          )}

          {!loading && suggestions && suggestions.length > 0 && (
            <div className="flex flex-col gap-2">
              {suggestions.map((s) => (
                <button
                  key={s.subdivisionId}
                  onClick={() => setSelectedId(s.subdivisionId)}
                  className={`flex items-start gap-3 px-3 py-2 rounded border text-left transition-all ${confidenceClasses(s.confidence, selectedId === s.subdivisionId)}`}
                >
                  <span className="text-[11px] font-semibold capitalize min-w-[3.5rem] mt-0.5">
                    {s.confidence}
                  </span>
                  <span className="flex-1 text-xs">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-[10px] text-text-muted block mt-0.5">{s.reason}</span>
                  </span>
                  {selectedId === s.subdivisionId && (
                    <span className="text-accent-teal text-[11px] font-bold mt-0.5 shrink-0">
                      Selected
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Visual confirmation: this entry's GIS page code cluster vs. the
            selected suggestion's existing linked footprint */}
        {(highlightPins.length > 0 || comparePins.length > 0) && (
          <div className="mb-4 rounded-lg overflow-hidden border border-surface-border">
            <ClusterMapCore
              highlightPins={highlightPins}
              comparePins={comparePins}
              highlightLabel={highlightPins.length ? "This entry's GIS codes" : undefined}
              compareLabel={comparePins.length ? `${selectedSuggestion?.name ?? "Selected subdivision"} (existing)` : undefined}
              height="220px"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              if (!current || !selectedId) return;
              startTransition(async () => {
                await linkPlatIndexEntry(current.id, selectedId);
                setCurrentIndex((i) => i + 1);
              });
            }}
            disabled={!selectedId || isPending || loading}
            className="px-4 py-1.5 bg-accent-teal text-surface-base text-xs font-semibold rounded transition-colors hover:bg-accent-teal/80 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending
              ? "Saving..."
              : selectedSuggestion
              ? `Accept: ${selectedSuggestion.name}`
              : "Select a suggestion above"}
          </button>

          <button
            onClick={() => {
              if (!current) return;
              startTransition(async () => {
                await markNoMatch(current.id);
                setCurrentIndex((i) => i + 1);
              });
            }}
            disabled={isPending}
            className="px-3 py-1.5 border border-surface-border text-xs text-text-muted rounded hover:text-text-primary transition-colors disabled:opacity-40"
          >
            No match
          </button>

          <button
            onClick={() => setCurrentIndex((i) => i + 1)}
            disabled={isPending}
            className="px-3 py-1.5 text-xs text-text-muted hover:text-text-primary transition-colors disabled:opacity-40"
          >
            Skip
          </button>

          <span className="ml-auto text-[11px] text-text-muted tabular-nums">
            {currentIndex + 1} of {unlinkedEntries.length}
          </span>
        </div>
      </div>
    </div>
  );
}
