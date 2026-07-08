"use client";

import { useState, useMemo } from "react";
import type { ReactNode } from "react";
import { EntityCard } from "@/components/ui/EntityCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { DecadeGroup } from "@/components/ui/DecadeGroup";
import { groupByFixedBuckets, type FixedBucketDef } from "@/lib/decadeGrouping";
import { getEraColor } from "@/lib/mapConfig";
import { StreetIcon } from "@/lib/icons";
import type { StreetListRow } from "@/lib/data/streets";

// Streets are grouped into fixed multi-decade spans rather than single
// decades -- 444 streets across ~190 years would otherwise produce a long
// tail of near-empty single-decade groups. This is an intentional exception
// to the default single-decade bucketing (see decadeGrouping.ts), expressed
// through DecadeGroup's `buckets` override so it still shares the one
// canonical header/grid rendering, not a copy-pasted reimplementation of it.
const ERA_BUCKETS: FixedBucketDef[] = [
  {
    key: "pre1920",
    label: "Pre-1920s",
    repYear: 1910,
    test: (y) => y != null && y < 1920,
  },
  {
    key: "1920s-1930s",
    label: "1920s–1930s",
    repYear: 1925,
    test: (y) => y != null && y >= 1920 && y < 1940,
  },
  {
    key: "1940s-1950s",
    label: "1940s–1950s",
    repYear: 1950,
    test: (y) => y != null && y >= 1940 && y < 1960,
  },
  {
    key: "1960s-1970s",
    label: "1960s–1970s",
    repYear: 1965,
    test: (y) => y != null && y >= 1960 && y < 1980,
  },
  {
    key: "1980s+",
    label: "1980s+",
    repYear: 1985,
    test: (y) => y != null && y >= 1980,
  },
  {
    key: "unknown",
    label: "Unknown era",
    repYear: null,
    test: (y) => y == null,
  },
];

function getStreetEraBucket(medianYear: number | null): string {
  for (const bucket of ERA_BUCKETS) {
    if (bucket.test(medianYear)) return bucket.key;
  }
  return "unknown";
}

type FilterChipProps = {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
};

function FilterChip({ active, onClick, children }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
        active
          ? "bg-accent-purple/15 text-accent-purple"
          : "bg-surface-raised text-text-secondary hover:text-text-primary hover:bg-surface-card border border-surface-border"
      }`}
    >
      {children}
    </button>
  );
}

function StreetCard({ street }: { street: StreetListRow }) {
  const metaParts: string[] = [];
  if (street.oldest_year) metaParts.push(`est. ${street.oldest_year}`);
  metaParts.push(`${street.parcel_count.toLocaleString()} ${street.parcel_count === 1 ? "property" : "properties"}`);
  if (street.total_permits > 0) metaParts.push(`${street.total_permits.toLocaleString()} permits`);
  if (street.teardown_count > 0)
    metaParts.push(`${street.teardown_count} teardown${street.teardown_count > 1 ? "s" : ""}`);

  const decadeYear = street.median_year != null
    ? Math.floor(street.median_year / 10) * 10
    : null;

  return (
    <EntityCard
      href={`/streets/${encodeURIComponent(street.street_name_normalized)}`}
      eyebrow={street.neighborhood_label ?? undefined}
      title={street.display_name}
      meta={metaParts.join("  ·  ")}
      eraSwatch={getEraColor(decadeYear)}
    />
  );
}

type Props = { streets: StreetListRow[] };

export function StreetsContent({ streets }: Props) {
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string | null>(null);
  const [selectedEra, setSelectedEra] = useState<string | null>(null);

  // ── Headline stats ────────────────────────────────────────────────────────
  const statsLine = useMemo(() => {
    const validOldest = streets.map((s) => s.oldest_year).filter((y): y is number => y != null);
    const validNewest = streets.map((s) => s.newest_year).filter((y): y is number => y != null);
    const earliestYear = validOldest.length ? Math.min(...validOldest) : null;
    const latestYear = validNewest.length ? Math.max(...validNewest) : null;
    const base = `${streets.length} streets across Park Ridge`;
    return earliestYear && latestYear
      ? `${base}, built from ${earliestYear} to ${latestYear}`
      : base;
  }, [streets]);

  // ── Neighborhood filter options ───────────────────────────────────────────
  const neighborhoods = useMemo(() => {
    const seen = new Map<string, string>();
    for (const s of streets) {
      if (s.neighborhood_id && s.neighborhood_label && !seen.has(s.neighborhood_id)) {
        seen.set(s.neighborhood_id, s.neighborhood_label);
      }
    }
    return Array.from(seen.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [streets]);

  // ── Filtered by neighborhood ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!selectedNeighborhood) return streets;
    return streets.filter((s) => s.neighborhood_id === selectedNeighborhood);
  }, [streets, selectedNeighborhood]);

  // ── Era counts for chip badges ────────────────────────────────────────────
  const eraCountsForFilter = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of filtered) {
      const key = getStreetEraBucket(s.median_year);
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [filtered]);

  // ── Era groups ────────────────────────────────────────────────────────────
  const toGroup = useMemo(
    () =>
      selectedEra
        ? filtered.filter((s) => getStreetEraBucket(s.median_year) === selectedEra)
        : filtered,
    [filtered, selectedEra]
  );

  const eraGroups = useMemo(
    () => groupByFixedBuckets(toGroup, (s) => s.median_year, ERA_BUCKETS),
    [toGroup]
  );

  const isFiltered = selectedNeighborhood != null || selectedEra != null;
  const totalShown = eraGroups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Park Ridge"
        icon={<StreetIcon size={22} strokeWidth={1.5} className="text-text-muted mt-1 shrink-0" aria-hidden="true" />}
        title="Streets"
        subtitle={statsLine}
      />
      <p className="text-text-muted text-xs -mt-6">
        Grouped by the era when most homes on each street were built.
      </p>

      {/* Filter panel */}
      <div className="space-y-3">
        {neighborhoods.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-text-muted tracking-widest uppercase mb-1.5">
              Neighborhood
            </p>
            <div className="flex flex-wrap gap-1.5">
              <FilterChip
                active={selectedNeighborhood == null}
                onClick={() => setSelectedNeighborhood(null)}
              >
                All
              </FilterChip>
              {neighborhoods.map((n) => (
                <FilterChip
                  key={n.id}
                  active={selectedNeighborhood === n.id}
                  onClick={() =>
                    setSelectedNeighborhood(selectedNeighborhood === n.id ? null : n.id)
                  }
                >
                  {n.label}
                </FilterChip>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-[10px] font-semibold text-text-muted tracking-widest uppercase mb-1.5">
            Era
          </p>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip active={selectedEra == null} onClick={() => setSelectedEra(null)}>
              All eras
            </FilterChip>
            {ERA_BUCKETS.map((bucket) => {
              const count = eraCountsForFilter[bucket.key] ?? 0;
              if (count === 0 && !selectedEra) return null;
              return (
                <FilterChip
                  key={bucket.key}
                  active={selectedEra === bucket.key}
                  onClick={() => setSelectedEra(selectedEra === bucket.key ? null : bucket.key)}
                >
                  {bucket.label}
                  <span className="ml-1.5 text-xs opacity-60">{count}</span>
                </FilterChip>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results context */}
      <div className="flex items-center gap-3">
        <p className="text-xs text-text-muted flex-1">
          {isFiltered
            ? `${totalShown.toLocaleString()} street${totalShown !== 1 ? "s" : ""}${
                selectedNeighborhood
                  ? ` · ${neighborhoods.find((n) => n.id === selectedNeighborhood)?.label ?? ""}`
                  : ""
              }${selectedEra ? ` · ${ERA_BUCKETS.find((b) => b.key === selectedEra)?.label ?? ""}` : ""}`
            : `${streets.length.toLocaleString()} streets`}
        </p>
        {isFiltered && (
          <button
            type="button"
            onClick={() => {
              setSelectedNeighborhood(null);
              setSelectedEra(null);
            }}
            className="text-xs text-text-muted hover:text-text-primary underline shrink-0"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Era groups */}
      {eraGroups.length === 0 ? (
        <EmptyState heading="No streets match" body="Try a different filter." />
      ) : (
        <DecadeGroup
          items={toGroup}
          getYear={(s) => s.median_year}
          getKey={(s) => s.street_name_normalized}
          buckets={ERA_BUCKETS}
          formatCount={(count) => `${count} ${count === 1 ? "street" : "streets"}`}
          renderItem={(street) => <StreetCard street={street} />}
        />
      )}
    </div>
  );
}
