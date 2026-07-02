"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import {
  linkPlatIndexEntry,
  savePlatIndexNotes,
  savePlatIndexGisCodes,
} from "../_actions/platMapping";
import { SuggestionQueue } from "./_SuggestionQueue";
import { PlatSectionMap } from "./_PlatSectionMap";

type PlatEntry = {
  id: string;
  section_ref: string;
  short_name: string;
  full_name: string;
  subdivision_id: string | null;
  gis_page_codes: string[] | null;
  notes: string | null;
  subdivisions: { id: string; name: string } | null;
};

type SubOption = { id: string; name: string; normalized_name: string; alternate_names: string[] | null };
type PageCode = {
  code: string;
  cnt: number;
  linkedCnt: number;
  subdivisionId: string | null;
  subdivisionName: string | null;
};

const PR_SECTIONS = ["01-40-12", "02-40-12", "11-40-12", "12-40-12"];
type SectionFilter = "pr" | "all";
type LinkedFilter = "all" | "linked" | "unlinked";

export function PlatMappingContent({
  entries,
  subdivisions,
  pageCodes,
}: {
  entries: PlatEntry[];
  subdivisions: SubOption[];
  pageCodes: PageCode[];
}) {
  const [sectionFilter, setSectionFilter] = useState<SectionFilter>("pr");
  const [linkedFilter, setLinkedFilter] = useState<LinkedFilter>("unlinked");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [view, setView] = useState<"table" | "map">("map");

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (sectionFilter === "pr" && !PR_SECTIONS.includes(e.section_ref)) return false;
      if (linkedFilter === "linked" && !e.subdivision_id) return false;
      if (linkedFilter === "unlinked" && e.subdivision_id) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!e.short_name.toLowerCase().includes(q) && !e.full_name.toLowerCase().includes(q))
          return false;
      }
      return true;
    });
  }, [entries, sectionFilter, linkedFilter, search]);

  const prEntries = useMemo(
    () => entries.filter((e) => PR_SECTIONS.includes(e.section_ref)),
    [entries]
  );
  const linked = prEntries.filter((e) => e.subdivision_id).length;
  const withGisCodes = prEntries.filter((e) => e.gis_page_codes?.length).length;

  function handleLink(id: string, subdivisionId: string) {
    startTransition(async () => {
      await linkPlatIndexEntry(id, subdivisionId || null);
    });
  }
  function handleGisCodes(id: string, codes: string[]) {
    startTransition(async () => {
      await savePlatIndexGisCodes(id, codes);
    });
  }
  function handleNotes(id: string, notes: string) {
    startTransition(async () => {
      await savePlatIndexNotes(id, notes);
    });
  }

  const queueEntries = useMemo(
    () =>
      prEntries.filter((e) => !e.subdivision_id && e.notes !== "no_match_found"),
    [prEntries]
  );

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-text-secondary mb-2">
            Admin
          </p>
          <h1 className="text-2xl font-bold text-text-primary">Recorder Plat Index</h1>
          <p className="text-sm text-text-secondary mt-1">
            Cook County Recorder plat search results for T40N R12E.{" "}
            <span
              className={
                linked > 0 ? "text-accent-teal font-medium" : "text-amber-400 font-medium"
              }
            >
              {linked} / {prEntries.length}
            </span>{" "}
            Park Ridge entries linked to a subdivision ·{" "}
            <span className="text-accent-teal font-medium">{withGisCodes}</span> with GIS page
            codes set.
          </p>
        </div>

        <div className="flex rounded border border-surface-border overflow-hidden text-xs shrink-0">
          {(["table", "map"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 font-medium capitalize transition-colors ${
                view === v
                  ? "bg-accent-teal text-surface-base"
                  : "bg-surface-raised text-text-muted hover:text-text-primary"
              }`}
            >
              {v === "table" ? "Table" : "Map"}
            </button>
          ))}
        </div>
      </div>

      {view === "map" ? (
        <PlatSectionMap pageCodes={pageCodes} entries={entries} subdivisions={subdivisions} />
      ) : (
        <>
      <SuggestionQueue unlinkedEntries={queueEntries} allSubdivisions={subdivisions} />

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex rounded border border-surface-border overflow-hidden text-xs">
          {(["pr", "all"] as SectionFilter[]).map((v) => (
            <button
              key={v}
              onClick={() => setSectionFilter(v)}
              className={`px-3 py-1.5 font-medium transition-colors ${
                sectionFilter === v
                  ? "bg-accent-teal text-surface-base"
                  : "bg-surface-raised text-text-muted hover:text-text-primary"
              }`}
            >
              {v === "pr" ? "Park Ridge sections" : "All sections"}
            </button>
          ))}
        </div>

        <div className="flex rounded border border-surface-border overflow-hidden text-xs">
          {(["all", "linked", "unlinked"] as LinkedFilter[]).map((v) => (
            <button
              key={v}
              onClick={() => setLinkedFilter(v)}
              className={`px-3 py-1.5 font-medium capitalize transition-colors ${
                linkedFilter === v
                  ? "bg-accent-teal text-surface-base"
                  : "bg-surface-raised text-text-muted hover:text-text-primary"
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search short name or full name…"
          className="flex-1 min-w-48 bg-surface-raised border border-surface-border rounded px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-teal/60 transition-colors"
        />
      </div>

      <p className="text-xs text-text-muted mb-3">
        {filtered.length} entries{isPending ? " · saving…" : ""}
      </p>

      <div className="bg-surface-raised border border-surface-border rounded-lg overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-surface-border">
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider w-24">
                Section
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider w-40">
                Short name
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                Recorder full name
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider w-64">
                Subdivision · GIS page codes
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider w-40">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-muted">
                  No entries match your filters.
                </td>
              </tr>
            )}
            {filtered.map((entry) => (
              <PlatRow
                key={`${entry.id}-${entry.subdivision_id ?? "none"}-${(entry.gis_page_codes ?? []).join(",")}`}
                entry={entry}
                subdivisions={subdivisions}
                pageCodes={pageCodes}
                onLink={handleLink}
                onGisCodes={handleGisCodes}
                onNotes={handleNotes}
                globalPending={isPending}
              />
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-text-muted mt-4">
        Source: Cook County Recorder of Deeds plat search, Township 40N Range 12E. Collected
        2026-06.
      </p>
        </>
      )}
    </div>
  );
}

function PlatRow({
  entry,
  subdivisions,
  pageCodes,
  onLink,
  onGisCodes,
  onNotes,
  globalPending,
}: {
  entry: PlatEntry;
  subdivisions: SubOption[];
  pageCodes: PageCode[];
  onLink: (id: string, subdivisionId: string) => void;
  onGisCodes: (id: string, codes: string[]) => void;
  onNotes: (id: string, notes: string) => void;
  globalPending: boolean;
}) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(entry.notes ?? "");

  const currentCodes = entry.gis_page_codes ?? [];
  const availableCodes = pageCodes.filter((pc) => !currentCodes.includes(pc.code));

  function addCode(code: string) {
    if (!code) return;
    onGisCodes(entry.id, [...currentCodes, code]);
  }
  function removeCode(code: string) {
    onGisCodes(entry.id, currentCodes.filter((c) => c !== code));
  }

  return (
    <tr
      className={`transition-colors ${globalPending ? "opacity-50" : "hover:bg-surface-card"}`}
    >
      <td className="px-4 py-2.5 text-text-muted tabular-nums whitespace-nowrap">
        {entry.section_ref}
      </td>
      <td className="px-4 py-2.5 font-mono text-[11px] text-text-secondary whitespace-nowrap">
        {entry.short_name}
      </td>
      <td className="px-4 py-2.5 text-text-primary">{entry.full_name}</td>

      {/* Subdivision + GIS page codes stacked */}
      <td className="px-4 py-2.5 space-y-1.5">
        <select
          defaultValue={entry.subdivision_id ?? ""}
          onChange={(e) => onLink(entry.id, e.target.value)}
          className={`w-full bg-surface-base border rounded px-2 py-1 text-xs focus:outline-none focus:border-accent-teal/60 transition-colors ${
            entry.subdivision_id
              ? "border-accent-teal/40 text-accent-teal"
              : "border-surface-border text-text-muted"
          }`}
        >
          <option value="">— Subdivision —</option>
          {subdivisions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {/* Existing codes as chips */}
        {currentCodes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {currentCodes.map((code) => (
              <span
                key={code}
                className="inline-flex items-center gap-1 bg-accent-teal/10 border border-accent-teal/20 rounded px-1.5 py-0.5 text-[10px] font-mono text-accent-teal"
              >
                {code}
                <button
                  onClick={() => removeCode(code)}
                  className="hover:text-red-400 transition-colors leading-none"
                  aria-label={`Remove ${code}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Add another code */}
        <select
          value=""
          onChange={(e) => { addCode(e.target.value); e.currentTarget.value = ""; }}
          className="w-full bg-surface-base border border-surface-border rounded px-2 py-1 text-[11px] text-text-muted focus:outline-none focus:border-accent-teal/60 transition-colors"
        >
          <option value="">+ Add GIS page code…</option>
          {availableCodes.map((pc) => (
            <option key={pc.code} value={pc.code}>
              {pc.code} ({pc.cnt})
            </option>
          ))}
        </select>

        {entry.subdivisions && (
          <Link
            href={`/subdivisions/${entry.subdivision_id}`}
            target="_blank"
            className="block text-[10px] text-accent-teal/70 hover:text-accent-teal hover:underline truncate transition-colors"
          >
            {entry.subdivisions.name} ↗
          </Link>
        )}
      </td>

      {/* Notes */}
      <td className="px-4 py-2.5">
        {editingNotes ? (
          <input
            value={notesValue}
            onChange={(e) => setNotesValue(e.target.value)}
            onBlur={() => {
              setEditingNotes(false);
              if (notesValue !== (entry.notes ?? "")) onNotes(entry.id, notesValue);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                setNotesValue(entry.notes ?? "");
                setEditingNotes(false);
              }
            }}
            autoFocus
            className="w-full bg-surface-base border border-accent-teal/40 rounded px-2 py-0.5 text-xs text-text-primary focus:outline-none"
          />
        ) : (
          <button
            onClick={() => setEditingNotes(true)}
            className="text-left w-full text-text-muted hover:text-text-primary transition-colors"
          >
            {entry.notes ? (
              <span className="text-text-secondary">{entry.notes}</span>
            ) : (
              <span className="text-[10px] italic">Add note…</span>
            )}
          </button>
        )}
      </td>
    </tr>
  );
}
