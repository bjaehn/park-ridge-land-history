"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  fetchPinsForGisPageCodes,
  fetchGisCodeSuggestionsForSubdivision,
  bulkLinkParcelsByPageCodes,
  linkPlatIndexEntry,
  savePlatIndexGisCodes,
  type GisCodeSuggestion,
} from "../_actions/platMapping";
import { fetchPinsForSubdivision } from "../_actions/subdivisionMap";
import { ClusterMapCore } from "./_ClusterMapCore";

export type PageCodeStatus = {
  code: string;
  cnt: number;
  linkedCnt: number;
  subdivisionId: string | null;
  subdivisionName: string | null;
};

type PlatEntry = {
  id: string;
  short_name: string;
  full_name: string;
  subdivision_id: string | null;
  gis_page_codes: string[] | null;
};

type SubOption = { id: string; name: string };

function statusColor(s: PageCodeStatus): string {
  if (s.cnt === 0) return "bg-surface-border";
  if (s.linkedCnt === 0) return "bg-text-muted";
  if (s.linkedCnt < s.cnt) return "bg-amber-400";
  return "bg-accent-teal";
}

export function PlatSectionMap({
  pageCodes,
  entries,
  subdivisions,
}: {
  pageCodes: PageCodeStatus[];
  entries: PlatEntry[];
  subdivisions: SubOption[];
}) {
  const [search, setSearch] = useState("");
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [highlightPins, setHighlightPins] = useState<string[]>([]);
  const [loadingHighlight, setLoadingHighlight] = useState(false);

  const [entryId, setEntryId] = useState<string>("");
  const [subdivisionId, setSubdivisionId] = useState<string>("");
  const [comparePins, setComparePins] = useState<string[]>([]);
  const [loadingCompare, setLoadingCompare] = useState(false);

  const [suggestions, setSuggestions] = useState<GisCodeSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [linkedResult, setLinkedResult] = useState<number | null>(null);

  const sortedCodes = useMemo(
    () =>
      [...pageCodes]
        .filter((c) => c.code.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => b.cnt - a.cnt),
    [pageCodes, search]
  );

  const selectedEntry = entries.find((e) => e.id === entryId) ?? null;

  function toggleCode(code: string) {
    setLinkedResult(null);
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  function selectEntry(id: string) {
    setEntryId(id);
    setLinkedResult(null);
    const entry = entries.find((e) => e.id === id);
    setSelectedCodes(entry?.gis_page_codes ?? []);
    setSubdivisionId(entry?.subdivision_id ?? "");
  }

  // Fetch the highlighted cluster whenever the selected codes change.
  useEffect(() => {
    if (!selectedCodes.length) {
      setHighlightPins([]);
      return;
    }
    let cancelled = false;
    setLoadingHighlight(true);
    fetchPinsForGisPageCodes(selectedCodes).then((pins) => {
      if (!cancelled) {
        setHighlightPins(pins);
        setLoadingHighlight(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedCodes]);

  // Fetch the comparison subdivision's existing footprint.
  useEffect(() => {
    if (!subdivisionId) {
      setComparePins([]);
      return;
    }
    let cancelled = false;
    setLoadingCompare(true);
    fetchPinsForSubdivision(subdivisionId).then((pins) => {
      if (!cancelled) {
        setComparePins(pins);
        setLoadingCompare(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [subdivisionId]);

  // Fetch ranked GIS code suggestions for the selected subdivision, so the
  // admin doesn't have to click through hundreds of raw codes.
  useEffect(() => {
    if (!subdivisionId) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    setLoadingSuggestions(true);
    fetchGisCodeSuggestionsForSubdivision(subdivisionId).then((s) => {
      if (!cancelled) {
        setSuggestions(s);
        setLoadingSuggestions(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [subdivisionId]);

  const suggestedCodes = useMemo(() => new Set(suggestions.map((s) => s.code)), [suggestions]);

  function applySuggestion(code: string) {
    setLinkedResult(null);
    setSelectedCodes((prev) => (prev.includes(code) ? prev : [...prev, code]));
  }

  function handleLink() {
    if (!entryId || !subdivisionId || !selectedCodes.length) return;
    startTransition(async () => {
      await savePlatIndexGisCodes(entryId, selectedCodes);
      await linkPlatIndexEntry(entryId, subdivisionId);
      const count = await bulkLinkParcelsByPageCodes(subdivisionId, selectedCodes);
      setLinkedResult(count);
    });
  }

  const compareSubdivisionName = subdivisions.find((s) => s.id === subdivisionId)?.name ?? null;

  return (
    <div className="-mx-8 -mb-8 border-t border-surface-border">
      <div className="flex" style={{ height: "calc(100vh - 15rem)" }}>
        {/* Left panel — GIS page code list */}
        <div className="w-80 shrink-0 border-r border-surface-border flex flex-col bg-surface-raised">
          <div className="p-3 border-b border-surface-border">
            <input
              type="search"
              placeholder="Filter GIS page codes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-card border border-surface-border rounded px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-teal/60"
            />
            <p className="text-[10px] text-text-muted mt-1.5">
              Click one or more codes to highlight their parcels on the map.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {sortedCodes.map((c) => {
              const active = selectedCodes.includes(c.code);
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => toggleCode(c.code)}
                  className={`w-full text-left px-3 py-2 border-b border-surface-border flex items-center gap-2.5 transition-colors ${
                    active ? "bg-surface-card" : "hover:bg-surface-card/50"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${statusColor(c)}`} />
                  <span className="flex-1 min-w-0">
                    <span
                      className={`block text-xs font-mono truncate ${
                        active ? "text-text-primary font-semibold" : "text-text-secondary"
                      }`}
                    >
                      {suggestedCodes.has(c.code) && (
                        <span className="text-amber-400 mr-1" title="Suggested match">
                          ★
                        </span>
                      )}
                      {c.code}
                    </span>
                    {c.subdivisionName && (
                      <span className="block text-[10px] text-text-muted truncate">
                        {c.subdivisionName}
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-text-muted shrink-0 tabular-nums">
                    {c.linkedCnt > 0 ? `${c.linkedCnt}/${c.cnt}` : c.cnt}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Link controls */}
          <div className="p-3 border-t border-surface-border space-y-2 bg-surface-card/40">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">
              Link selection
            </p>
            <select
              value={entryId}
              onChange={(e) => selectEntry(e.target.value)}
              className="w-full bg-surface-base border border-surface-border rounded px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-teal/60"
            >
              <option value="">— Plat index entry —</option>
              {entries.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.full_name}
                </option>
              ))}
            </select>

            <select
              value={subdivisionId}
              onChange={(e) => {
                setSubdivisionId(e.target.value);
                setLinkedResult(null);
              }}
              className="w-full bg-surface-base border border-surface-border rounded px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-teal/60"
            >
              <option value="">— Subdivision —</option>
              {subdivisions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            {subdivisionId && (
              <div className="rounded border border-surface-border bg-surface-base p-2 space-y-1.5">
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">
                  Suggested codes
                </p>
                {loadingSuggestions && (
                  <p className="text-[11px] text-text-muted animate-pulse">Searching…</p>
                )}
                {!loadingSuggestions && suggestions.length === 0 && (
                  <p className="text-[11px] text-text-muted italic">
                    No deed-verified properties yet for this subdivision — pick a code manually
                    above.
                  </p>
                )}
                {!loadingSuggestions &&
                  suggestions.map((s) => (
                    <button
                      key={s.code}
                      type="button"
                      onClick={() => applySuggestion(s.code)}
                      disabled={selectedCodes.includes(s.code)}
                      className="w-full flex items-center gap-2 text-left px-2 py-1 rounded border border-surface-border hover:border-accent-teal/60 disabled:opacity-40 disabled:cursor-default transition-colors"
                    >
                      <span className="font-mono text-[11px] text-text-primary">{s.code}</span>
                      <span className="flex-1 text-[10px] text-text-muted">
                        {s.matchType === "direct_evidence"
                          ? `${s.evidenceCount} of ${s.evidenceTotal} deed-verified properties`
                          : `~${s.distanceM}m away, unconfirmed`}
                      </span>
                      {selectedCodes.includes(s.code) && (
                        <span className="text-[10px] text-accent-teal shrink-0">Selected</span>
                      )}
                    </button>
                  ))}
              </div>
            )}

            <button
              type="button"
              onClick={handleLink}
              disabled={!entryId || !subdivisionId || !selectedCodes.length || isPending}
              className="w-full px-3 py-1.5 bg-accent-teal text-surface-base text-xs font-semibold rounded hover:bg-accent-teal/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isPending
                ? "Linking…"
                : `Link & bulk-assign ${selectedCodes.length || ""} code${
                    selectedCodes.length === 1 ? "" : "s"
                  }`}
            </button>

            {linkedResult !== null && (
              <p className="text-[11px] text-accent-teal">
                {linkedResult} {linkedResult === 1 ? "parcel" : "parcels"} linked to{" "}
                {compareSubdivisionName ?? "subdivision"}.
              </p>
            )}
            {selectedEntry?.subdivision_id && selectedEntry.subdivision_id !== subdivisionId && (
              <p className="text-[10px] text-amber-300/80">
                This entry is already linked to a different subdivision.
              </p>
            )}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <ClusterMapCore
            highlightPins={highlightPins}
            comparePins={comparePins}
            highlightLabel={
              selectedCodes.length ? `Selected code${selectedCodes.length === 1 ? "" : "s"}` : undefined
            }
            compareLabel={compareSubdivisionName ? `${compareSubdivisionName} (existing)` : undefined}
            height="100%"
          />
          {(loadingHighlight || loadingCompare) && (
            <div className="absolute top-2 right-2 bg-surface-raised/95 border border-surface-border rounded px-2 py-1 text-[10px] text-text-muted animate-pulse">
              Loading…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
