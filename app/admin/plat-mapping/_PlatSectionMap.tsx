"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  fetchPinsForGisPageCodes,
  fetchGisCodeSuggestionsForSubdivision,
  bulkLinkParcelsByPageCodes,
  unlinkParcelsByPageCodes,
  reassignParcelsByPageCodes,
  fetchLinkedParcelsForPageCodes,
  fetchGisPageCodeSubdivisionBreakdown,
  linkPlatIndexEntry,
  savePlatIndexGisCodes,
  type GisCodeSuggestion,
  type BulkLinkResult,
  type GisPageCodeSubdivisionBreakdown,
} from "../_actions/platMapping";
import { fetchPinsForSubdivision } from "../_actions/subdivisionMap";
import { describeLinkResult } from "@/lib/platMappingMessages";
import { ClusterMapCore } from "./_ClusterMapCore";

export type PageCodeStatus = {
  code: string;
  cnt: number;
  linkedCnt: number;
  subdivisionId: string | null;
  subdivisionName: string | null;
  distinctSubdivisionCnt: number;
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
  if (s.distinctSubdivisionCnt > 1) return "bg-orange-500";
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
  const router = useRouter();
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
  const [linkedResult, setLinkedResult] = useState<BulkLinkResult | null>(null);
  const [unlinkedCount, setUnlinkedCount] = useState<number | null>(null);
  const [manualBrowseOpen, setManualBrowseOpen] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewParcels, setPreviewParcels] = useState<
    Array<{ pin_normalized: string; address: string | null }>
  >([]);

  const [breakdownCode, setBreakdownCode] = useState<string | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [breakdownData, setBreakdownData] = useState<GisPageCodeSubdivisionBreakdown[]>([]);

  const sortedCodes = useMemo(
    () =>
      [...pageCodes]
        .filter((c) => c.code.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => b.cnt - a.cnt),
    [pageCodes, search]
  );

  const selectedEntry = entries.find((e) => e.id === entryId) ?? null;

  const stagedCodeStatuses = useMemo(
    () =>
      selectedCodes
        .map((code) => pageCodes.find((c) => c.code === code))
        .filter((c): c is PageCodeStatus => !!c),
    [selectedCodes, pageCodes]
  );

  const linkedToSelected = subdivisionId
    ? stagedCodeStatuses.filter((c) => c.subdivisionId === subdivisionId)
    : [];

  const linkedToOther = subdivisionId
    ? stagedCodeStatuses.filter((c) => c.subdivisionId && c.subdivisionId !== subdivisionId)
    : [];

  const distinctOtherSubdivisionIds = useMemo(
    () => Array.from(new Set(linkedToOther.map((c) => c.subdivisionId as string))),
    [linkedToOther]
  );

  const reassignFromId =
    distinctOtherSubdivisionIds.length === 1 ? distinctOtherSubdivisionIds[0] : null;
  const reassignFromName = reassignFromId
    ? (linkedToOther.find((c) => c.subdivisionId === reassignFromId)?.subdivisionName ?? "that subdivision")
    : null;

  function toggleCode(code: string) {
    setLinkedResult(null);
    setUnlinkedCount(null);
    setPreviewOpen(false);
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  function selectEntry(id: string) {
    setEntryId(id);
    setLinkedResult(null);
    setUnlinkedCount(null);
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
    setUnlinkedCount(null);
    setSelectedCodes((prev) => (prev.includes(code) ? prev : [...prev, code]));
  }

  function removeCode(code: string) {
    setLinkedResult(null);
    setUnlinkedCount(null);
    setSelectedCodes((prev) => prev.filter((c) => c !== code));
  }

  function clearSelection() {
    setEntryId("");
    setSubdivisionId("");
    setSelectedCodes([]);
    setLinkedResult(null);
    setUnlinkedCount(null);
    setPreviewOpen(false);
  }

  function handleLink() {
    if (!subdivisionId || !selectedCodes.length) return;
    startTransition(async () => {
      // The plat index entry is optional metadata (ties the codes back to a
      // Cook County Recorder search result) -- the parcel bulk-link itself
      // only needs a subdivision and a set of codes.
      if (entryId) {
        await savePlatIndexGisCodes(entryId, selectedCodes);
        await linkPlatIndexEntry(entryId, subdivisionId);
      }
      const result = await bulkLinkParcelsByPageCodes(subdivisionId, selectedCodes);
      setLinkedResult(result);
      setUnlinkedCount(null);
      router.refresh();
    });
  }

  function handleReassign() {
    if (!subdivisionId || !reassignFromId || !selectedCodes.length) return;
    const fromName = reassignFromName ?? "the other subdivision";
    const toName = compareSubdivisionName ?? "subdivision";
    if (
      !confirm(
        `Reassign ${selectedCodes.length} code(s) from ${fromName} to ${toName}? This unlinks the matching parcels from ${fromName} and links them to ${toName} in one step. Only affects parcels linked by this GIS-code tool -- deed-verified and manually-confirmed links are untouched. Continue?`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const count = await reassignParcelsByPageCodes(reassignFromId, subdivisionId, selectedCodes);
      setLinkedResult({
        linkedCount: count,
        totalMatchingCount: count,
        alreadyLinkedSameCount: 0,
        alreadyLinkedOtherCount: 0,
        conflictingSubdivisionNames: [],
      });
      setUnlinkedCount(null);
      router.refresh();
    });
  }

  function handleUnlink() {
    if (!subdivisionId || !linkedToSelected.length) return;
    const codes = linkedToSelected.map((c) => c.code);
    const name = compareSubdivisionName ?? "this subdivision";
    if (
      !confirm(
        `Unlink parcel(s) previously bulk-assigned to ${name} via GIS code(s) ${codes.join(", ")}? This only reverses assignments made by this GIS-code tool -- it will not touch deed-verified links, manual admin links, or spatial GIS-lot matches. This does not delete any parcel or subdivision record and can be redone by re-linking. Continue?`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const count = await unlinkParcelsByPageCodes(subdivisionId, codes);
      setUnlinkedCount(count);
      setLinkedResult(null);
      setPreviewOpen(false);
      router.refresh();
    });
  }

  function togglePreview() {
    if (!subdivisionId || !linkedToSelected.length) return;
    if (previewOpen) {
      setPreviewOpen(false);
      return;
    }
    setPreviewOpen(true);
    setPreviewLoading(true);
    fetchLinkedParcelsForPageCodes(
      subdivisionId,
      linkedToSelected.map((c) => c.code)
    ).then((parcels) => {
      setPreviewParcels(parcels);
      setPreviewLoading(false);
    });
  }

  function toggleBreakdown(code: string) {
    if (breakdownCode === code) {
      setBreakdownCode(null);
      return;
    }
    setBreakdownCode(code);
    setBreakdownLoading(true);
    fetchGisPageCodeSubdivisionBreakdown(code).then((data) => {
      setBreakdownData(data);
      setBreakdownLoading(false);
    });
  }

  const compareSubdivisionName = subdivisions.find((s) => s.id === subdivisionId)?.name ?? null;

  return (
    <div className="-mx-8 -mb-8 border-t border-surface-border">
      <div className="flex" style={{ height: "calc(100vh - 15rem)" }}>
        {/* Left panel */}
        <div className="w-80 shrink-0 border-r border-surface-border flex flex-col bg-surface-raised overflow-y-auto">
          {/* Step 1: pick a subdivision */}
          <div className="p-3 border-b border-surface-border space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">
                Subdivision
              </p>
              {(entryId || subdivisionId || selectedCodes.length > 0) && (
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-[10px] text-text-muted hover:text-accent-red transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            <select
              value={subdivisionId}
              onChange={(e) => {
                setSubdivisionId(e.target.value);
                setLinkedResult(null);
                setUnlinkedCount(null);
                setPreviewOpen(false);
              }}
              className="w-full bg-surface-base border border-surface-border rounded px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-teal/60"
            >
              <option value="">— Select a subdivision —</option>
              {subdivisions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <select
              value={entryId}
              onChange={(e) => selectEntry(e.target.value)}
              className="w-full bg-surface-base border border-surface-border rounded px-2 py-1.5 text-xs text-text-muted focus:outline-none focus:border-accent-teal/60"
            >
              <option value="">— Plat index entry (optional) —</option>
              {entries.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.full_name}
                </option>
              ))}
            </select>
            {selectedEntry?.subdivision_id && selectedEntry.subdivision_id !== subdivisionId && (
              <p className="text-[10px] text-amber-300/80">
                This entry is already linked to a different subdivision.
              </p>
            )}
          </div>

          {/* Step 2: suggested codes for the selected subdivision */}
          {subdivisionId && (
            <div className="p-3 border-b border-surface-border space-y-1.5">
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">
                Suggested codes
              </p>
              {loadingSuggestions && (
                <p className="text-[11px] text-text-muted animate-pulse">Searching…</p>
              )}
              {!loadingSuggestions && suggestions.length === 0 && (
                <p className="text-[11px] text-text-muted italic">
                  No deed-verified properties yet for this subdivision — browse codes manually
                  below.
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

          {/* Step 3: confirm selection and link / unlink / reassign */}
          {selectedCodes.length > 0 && (
            <div className="p-3 border-b border-surface-border space-y-2 bg-surface-card/40">
              <div className="flex flex-wrap gap-1">
                {selectedCodes.map((code) => (
                  <span
                    key={code}
                    className="inline-flex items-center gap-1 bg-accent-teal/10 border border-accent-teal/20 rounded px-1.5 py-0.5 text-[10px] font-mono text-accent-teal"
                  >
                    {code}
                    <button
                      type="button"
                      onClick={() => removeCode(code)}
                      className="hover:text-red-400 transition-colors leading-none"
                      aria-label={`Remove ${code}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              {linkedToOther.length > 0 && distinctOtherSubdivisionIds.length > 1 && (
                <p className="text-[10px] text-amber-300/80">
                  Selected codes are already linked to multiple different subdivisions ({" "}
                  {Array.from(new Set(linkedToOther.map((c) => c.subdivisionName ?? "unknown"))).join(
                    ", "
                  )}
                  ). Reassign one subdivision's codes at a time via the list below.
                </p>
              )}

              {reassignFromId ? (
                <button
                  type="button"
                  onClick={handleReassign}
                  disabled={!subdivisionId || isPending}
                  className="w-full px-3 py-1.5 bg-amber-500 text-surface-base text-xs font-semibold rounded hover:bg-amber-500/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isPending
                    ? "Reassigning…"
                    : `Reassign ${selectedCodes.length} code${selectedCodes.length === 1 ? "" : "s"} from ${reassignFromName} to ${compareSubdivisionName ?? "subdivision"}`}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleLink}
                  disabled={!subdivisionId || !selectedCodes.length || isPending}
                  className="w-full px-3 py-1.5 bg-accent-teal text-surface-base text-xs font-semibold rounded hover:bg-accent-teal/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isPending
                    ? "Linking…"
                    : `Link & bulk-assign ${selectedCodes.length || ""} code${
                        selectedCodes.length === 1 ? "" : "s"
                      }`}
                </button>
              )}

              {linkedToSelected.length > 0 && (
                <div className="space-y-1.5 pt-1 border-t border-surface-border">
                  <button
                    type="button"
                    onClick={togglePreview}
                    className="text-[11px] text-text-muted hover:text-text-primary underline transition-colors"
                  >
                    {previewOpen ? "Hide" : "View"} parcels linked to {compareSubdivisionName} via{" "}
                    {linkedToSelected.map((c) => c.code).join(", ")}
                  </button>
                  {previewOpen && (
                    <div className="max-h-40 overflow-y-auto border border-surface-border rounded bg-surface-base">
                      {previewLoading && (
                        <p className="text-[10px] text-text-muted p-2 animate-pulse">Loading…</p>
                      )}
                      {!previewLoading && previewParcels.length === 0 && (
                        <p className="text-[10px] text-text-muted p-2 italic">No parcels found.</p>
                      )}
                      {!previewLoading &&
                        previewParcels.map((p) => (
                          <div
                            key={p.pin_normalized}
                            className="flex items-center justify-between gap-2 px-2 py-1 border-b border-surface-border last:border-b-0"
                          >
                            <span className="text-[10px] text-text-primary truncate">
                              {p.address ?? "(no address)"}
                            </span>
                            <Link
                              href={`/properties/${p.pin_normalized}`}
                              target="_blank"
                              className="text-[9px] text-accent-teal/70 hover:text-accent-teal shrink-0"
                            >
                              {p.pin_normalized} ↗
                            </Link>
                          </div>
                        ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleUnlink}
                    disabled={isPending}
                    className="w-full px-3 py-1.5 border border-accent-red/40 text-accent-red text-xs font-semibold rounded hover:bg-accent-red/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {isPending
                      ? "Unlinking…"
                      : `Unlink ${linkedToSelected.length} code${linkedToSelected.length === 1 ? "" : "s"} from ${compareSubdivisionName ?? "subdivision"}`}
                  </button>
                </div>
              )}

              {linkedResult !== null && (
                <p className="text-[11px] text-accent-teal">
                  {describeLinkResult(linkedResult, compareSubdivisionName ?? "subdivision")}
                </p>
              )}
              {unlinkedCount !== null && (
                <p className="text-[11px] text-accent-red">
                  {unlinkedCount} {unlinkedCount === 1 ? "parcel" : "parcels"} unlinked from{" "}
                  {compareSubdivisionName ?? "subdivision"}.
                </p>
              )}
            </div>
          )}

          {/* Step 4: manual fallback — browse every GIS code directly */}
          <div className="border-b border-surface-border">
            <button
              type="button"
              onClick={() => setManualBrowseOpen((o) => !o)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-[11px] font-semibold text-text-muted uppercase tracking-wide hover:text-text-primary transition-colors"
            >
              <span>Browse all GIS codes manually</span>
              <span>{manualBrowseOpen ? "▾" : "▸"}</span>
            </button>

            {manualBrowseOpen && (
              <div className="border-t border-surface-border">
                <div className="p-3 border-b border-surface-border">
                  <input
                    type="search"
                    placeholder="Filter codes…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-surface-card border border-surface-border rounded px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-teal/60"
                  />
                  <p className="text-[10px] text-text-muted mt-1.5">
                    Each code is a Cook County Assessor map-page group of parcels. Use this if a
                    subdivision has no suggestions above, or to explore the raw list.
                  </p>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {sortedCodes.map((c) => {
                    const active = selectedCodes.includes(c.code);
                    const split = c.distinctSubdivisionCnt > 1;
                    return (
                      <div key={c.code} className="border-b border-surface-border">
                        <button
                          type="button"
                          onClick={() => toggleCode(c.code)}
                          className={`w-full text-left px-3 py-2 flex items-center gap-2.5 transition-colors ${
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
                            {split ? (
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleBreakdown(c.code);
                                }}
                                className="block text-[10px] text-orange-400 truncate hover:underline cursor-pointer"
                              >
                                Split across {c.distinctSubdivisionCnt} subdivisions — view
                              </span>
                            ) : (
                              c.subdivisionName && (
                                <span className="block text-[10px] text-text-muted truncate">
                                  {c.subdivisionName}
                                </span>
                              )
                            )}
                          </span>
                          <span className="text-[10px] text-text-muted shrink-0 tabular-nums">
                            {c.linkedCnt > 0 ? `${c.linkedCnt}/${c.cnt}` : c.cnt}
                          </span>
                        </button>
                        {breakdownCode === c.code && (
                          <div className="px-3 pb-2 bg-surface-base">
                            {breakdownLoading && (
                              <p className="text-[10px] text-text-muted animate-pulse">Loading…</p>
                            )}
                            {!breakdownLoading &&
                              breakdownData.map((b) => (
                                <div
                                  key={b.subdivisionId ?? "unknown"}
                                  className="flex items-center justify-between text-[10px] text-text-secondary py-0.5"
                                >
                                  <span className="truncate">{b.subdivisionName ?? "(unknown)"}</span>
                                  <span className="tabular-nums shrink-0">{b.cnt}</span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
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
