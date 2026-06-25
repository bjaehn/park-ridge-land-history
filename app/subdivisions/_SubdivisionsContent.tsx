"use client";

import { useState, useMemo } from "react";
import { EntityCard } from "@/components/ui/EntityCard";
import type { MetaItem } from "@/components/ui/EntityCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchIcon, YearBuiltIcon, PropertyIcon } from "@/lib/icons";
import { formatCount } from "@/lib/formatters";
import { getEraColor } from "@/lib/mapConfig";
import type { SubdivisionSummary, SubdivisionConfidenceLevel } from "@/lib/subdivisionTypes";

type Props = {
  subdivisions: SubdivisionSummary[];
};

function entityTypeLabel(
  entityType: SubdivisionSummary["entity_type"]
): string | null {
  if (entityType === "estate") return "Estate";
  if (entityType === "parent_plat") return "Parent plat";
  return null;
}

function confidenceDotClass(level: SubdivisionConfidenceLevel): string {
  if (level === "high") return "bg-confidence-high";
  if (level === "medium") return "bg-confidence-medium";
  if (level === "low") return "bg-confidence-low";
  return "bg-confidence-unknown";
}

function shortConfidenceLabel(level: SubdivisionConfidenceLevel): string {
  if (level === "high") return "Verified";
  if (level === "medium") return "Sourced";
  if (level === "low") return "Research lead";
  return "Unknown source";
}

const CONFIDENCE_OPTIONS: Array<{
  label: string;
  value: SubdivisionConfidenceLevel | null;
}> = [
  { label: "All", value: null },
  { label: "Verified", value: "high" },
  { label: "Sourced", value: "medium" },
  { label: "Research lead", value: "low" },
  { label: "Unknown", value: "unknown" },
];

export function SubdivisionsContent({ subdivisions }: Props) {
  const [query, setQuery] = useState("");
  const [confidenceFilter, setConfidenceFilter] = useState<SubdivisionConfidenceLevel | null>(
    null
  );
  const [decadeFilter, setDecadeFilter] = useState<number | null>(null);

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    subdivisions.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [subdivisions]);

  const availableDecades = useMemo(() => {
    const decades = new Set<number>();
    subdivisions.forEach((s) => {
      if (s.recorded_year) {
        decades.add(Math.floor(s.recorded_year / 10) * 10);
      }
    });
    return Array.from(decades).sort((a, b) => a - b);
  }, [subdivisions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return subdivisions.filter((s) => {
      if (confidenceFilter && s.confidence_level !== confidenceFilter) return false;
      if (
        decadeFilter &&
        (!s.recorded_year ||
          Math.floor(s.recorded_year / 10) * 10 !== decadeFilter)
      )
        return false;
      if (q.length >= 2) {
        const nameMatch = s.name.toLowerCase().includes(q);
        const normMatch = s.normalized_name.includes(q);
        const devMatch = (s.original_owner ?? s.developer ?? "")
          .toLowerCase()
          .includes(q);
        const noteMatch = (s.notes ?? "").toLowerCase().includes(q);
        if (!nameMatch && !normMatch && !devMatch && !noteMatch) return false;
      }
      return true;
    });
  }, [subdivisions, query, confidenceFilter, decadeFilter]);

  const grouped = useMemo(() => {
    const byDecade = new Map<string, SubdivisionSummary[]>();
    filtered.forEach((s) => {
      const key = s.recorded_year
        ? `${Math.floor(s.recorded_year / 10) * 10}s`
        : "Date uncertain";
      const arr = byDecade.get(key) ?? [];
      arr.push(s);
      byDecade.set(key, arr);
    });
    return Array.from(byDecade.entries()).sort(([a], [b]) => {
      if (a === "Date uncertain") return 1;
      if (b === "Date uncertain") return -1;
      return a.localeCompare(b);
    });
  }, [filtered]);

  const isFiltered =
    query.trim().length >= 2 || confidenceFilter !== null || decadeFilter !== null;
  const filtersActive = isFiltered;

  function clearFilters() {
    setQuery("");
    setConfidenceFilter(null);
    setDecadeFilter(null);
  }

  return (
    <div className="space-y-8">
      {/* Search and filter row */}
      <div className="space-y-3">
        <div className="relative">
          <SearchIcon
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            aria-label="Search subdivisions"
            placeholder="Search by name, developer, or notes"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-surface-border bg-surface-card text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/60 focus:ring-1 focus:ring-accent-purple/30 transition-colors"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Confidence filter */}
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by confidence">
            {CONFIDENCE_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setConfidenceFilter(opt.value)}
                className={[
                  "text-xs px-2.5 py-1 rounded-full border transition-colors",
                  confidenceFilter === opt.value
                    ? "bg-accent-purple/15 border-accent-purple/40 text-accent-purple font-semibold"
                    : "border-surface-border text-text-muted hover:border-surface-border hover:text-text-secondary bg-surface-card",
                ].join(" ")}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Decade filter (only show if multiple decades exist) */}
          {availableDecades.length > 2 && (
            <div
              className="flex flex-wrap gap-1.5"
              role="group"
              aria-label="Filter by recording era"
            >
              {availableDecades.map((decade) => (
                <button
                  key={decade}
                  type="button"
                  onClick={() =>
                    setDecadeFilter(decadeFilter === decade ? null : decade)
                  }
                  className={[
                    "text-xs px-2.5 py-1 rounded-full border transition-colors",
                    decadeFilter === decade
                      ? "border-accent-purple/40 text-accent-purple font-semibold"
                      : "border-surface-border text-text-muted hover:text-text-secondary bg-surface-card",
                  ].join(" ")}
                  style={
                    decadeFilter === decade
                      ? {
                          background: getEraColor(decade)
                            ? `${getEraColor(decade)}20`
                            : undefined,
                        }
                      : undefined
                  }
                >
                  {decade}s
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Result count and clear */}
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>
            {filtersActive
              ? `Showing ${formatCount(filtered.length, "subdivision", "subdivisions")} of ${subdivisions.length}`
              : formatCount(subdivisions.length, "subdivision", "subdivisions")}
          </span>
          {filtersActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-accent-purple hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <EmptyState
          heading="No subdivisions match"
          body="Try a different name, developer, or remove a filter. Some subdivisions may not yet have full records."
        />
      ) : (
        <div className="space-y-8">
          {grouped.map(([decade, group]) => {
            const decadeYear =
              decade === "Date uncertain" ? null : parseInt(decade);
            return (
              <div key={decade} id={`decade-${decade.replace(/\s/g, "-")}`}>
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{
                      background:
                        getEraColor(decadeYear ?? undefined) ?? "#64748b",
                    }}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-semibold text-text-secondary tracking-wide">
                    {decade}
                  </span>
                  <div className="flex-1 border-t border-surface-border" />
                  <span className="text-xs text-text-muted">
                    {formatCount(group.length, "plat", "plats")}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.map((s) => {
                    const developer = s.original_owner ?? s.developer ?? null;
                    const parentName = s.parent_subdivision_id
                      ? (nameById.get(s.parent_subdivision_id) ?? null)
                      : null;
                    const typeLabel = entityTypeLabel(s.entity_type);

                    const metaItems: MetaItem[] = [
                      s.recorded_year
                        ? {
                            icon: (
                              <YearBuiltIcon
                                size={11}
                                strokeWidth={1.8}
                                aria-hidden="true"
                              />
                            ),
                            value: `Recorded ${s.recorded_year}`,
                          }
                        : null,
                      s.parcel_count && s.parcel_count > 0
                        ? {
                            icon: (
                              <PropertyIcon
                                size={11}
                                strokeWidth={1.8}
                                aria-hidden="true"
                              />
                            ),
                            value: formatCount(
                              s.parcel_count,
                              "property",
                              "properties"
                            ),
                          }
                        : null,
                      {
                        icon: (
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${confidenceDotClass(s.confidence_level)}`}
                            aria-hidden="true"
                          />
                        ),
                        value: shortConfidenceLabel(s.confidence_level),
                      },
                    ].filter((x): x is MetaItem => x !== null);

                    return (
                      <EntityCard
                        key={s.id}
                        href={`/subdivisions/${encodeURIComponent(s.id)}`}
                        eyebrow={typeLabel ?? undefined}
                        title={s.name}
                        subtitle={developer ?? undefined}
                        meta={
                          parentName ? `Part of ${parentName}` : undefined
                        }
                        metaItems={metaItems}
                        eraSwatch={getEraColor(s.recorded_year) ?? undefined}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Caveat */}
      <p className="text-xs text-text-muted italic pt-2 border-t border-surface-border">
        Subdivision data may be incomplete or under review. Records marked as research lead or
        unknown source have not been verified against a recorded plat. Confidence is shown on
        each record.
      </p>
    </div>
  );
}
