"use client";

import { useState, useEffect } from "react";
import { EntityCard } from "@/components/ui/EntityCard";
import { LoadingSkeleton, EmptyState } from "@/components/ui/EmptyState";
import { getChangeSignal } from "@/lib/formatters";
import { fetchNeighborhoodSummaries } from "@/lib/data/neighborhoods";
import type { NeighborhoodSummary, NeighborhoodType } from "@/lib/data/neighborhoods";
import { NEIGHBORHOOD_ERA_LABELS } from "@/lib/content";

const TYPE_SECTIONS = [
  { type: "official_planning" as const, title: "Official Planning Neighborhoods" },
  { type: "business_district" as const, title: "Business Districts" },
  { type: "local_market" as const, title: "Local / Market Neighborhoods" },
];

const FILTER_CHIPS: { value: NeighborhoodType | "all"; label: string }[] = [
  { value: "all",               label: "All" },
  { value: "official_planning", label: "Official Planning" },
  { value: "business_district", label: "Business Districts" },
  { value: "local_market",      label: "Local Names" },
];

type SortKey = "type" | "oldest" | "newest" | "properties" | "active";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "type",       label: "By type" },
  { value: "oldest",     label: "Oldest" },
  { value: "newest",     label: "Newest" },
  { value: "properties", label: "Most properties" },
  { value: "active",     label: "Most active" },
];

function sortedNeighborhoods(items: NeighborhoodSummary[], sort: SortKey): NeighborhoodSummary[] {
  const copy = [...items];
  switch (sort) {
    case "oldest":
      return copy.sort((a, b) => {
        if (a.medianYear == null && b.medianYear == null) return 0;
        if (a.medianYear == null) return 1;
        if (b.medianYear == null) return -1;
        return a.medianYear - b.medianYear;
      });
    case "newest":
      return copy.sort((a, b) => {
        if (a.medianYear == null && b.medianYear == null) return 0;
        if (a.medianYear == null) return 1;
        if (b.medianYear == null) return -1;
        return b.medianYear - a.medianYear;
      });
    case "properties":
      return copy.sort((a, b) => b.parcelCount - a.parcelCount);
    case "active":
      return copy.sort((a, b) => ((b.totalSales ?? 0) + (b.totalPermits ?? 0)) - ((a.totalSales ?? 0) + (a.totalPermits ?? 0)));
    default:
      return copy;
  }
}

function NeighborhoodSection({ title, items }: { title: string; items: NeighborhoodSummary[] }) {
  if (!items.length) return null;
  return (
    <div className="mb-10">
      <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((n) => (
          <EntityCard
            key={n.id}
            href={`/neighborhoods/${encodeURIComponent(n.slug)}`}
            eyebrow={`${n.parcelCount} properties`}
            title={n.label}
            subtitle={NEIGHBORHOOD_ERA_LABELS[n.slug] ?? (n.medianYear ? `Typical build year: ${n.medianYear}` : undefined)}
            signal={getChangeSignal({
              permit_count: n.totalPermits,
              sale_count: n.totalSales,
              recent_teardown_count: n.recentTeardowns,
            })}
          />
        ))}
      </div>
    </div>
  );
}

export function NeighborhoodsGrid({ teaser }: { teaser?: boolean }) {
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sort, setSort] = useState<SortKey>("type");
  const [filterType, setFilterType] = useState<NeighborhoodType | "all">("all");

  useEffect(() => {
    fetchNeighborhoodSummaries()
      .then(setNeighborhoods)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i}>
            <div className="h-5 w-48 bg-surface-raised rounded mb-3 animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, j) => (
                <LoadingSkeleton key={j} rows={1} className="h-36" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) return <EmptyState heading="Unable to load neighborhoods" body="Try refreshing the page." />;

  if (teaser) {
    const preview = neighborhoods.slice(0, 6);
    return (
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {preview.map((n) => (
            <EntityCard
              key={n.id}
              href={`/neighborhoods/${encodeURIComponent(n.slug)}`}
              eyebrow={`${n.parcelCount} properties`}
              title={n.label}
              subtitle={NEIGHBORHOOD_ERA_LABELS[n.slug] ?? (n.medianYear ? `Typical build year: ${n.medianYear}` : undefined)}
              signal={getChangeSignal({
                permit_count: n.totalPermits,
                sale_count: n.totalSales,
                recent_teardown_count: n.recentTeardowns,
              })}
            />
          ))}
        </div>
        {neighborhoods.length > 6 && (
          <div className="mt-4">
            <a href="/neighborhoods" className="text-sm text-accent-purple hover:underline">
              See all neighborhoods →
            </a>
          </div>
        )}
      </div>
    );
  }

  const handleSortChange = (newSort: SortKey) => {
    setSort(newSort);
    if (newSort === "type") setFilterType("all");
  };

  const sortControl = (
    <div className="flex items-center gap-2 mb-4">
      <label htmlFor="neighborhood-sort" className="text-sm text-text-muted">Sort:</label>
      <select
        id="neighborhood-sort"
        value={sort}
        onChange={(e) => handleSortChange(e.target.value as SortKey)}
        className="text-sm bg-surface-card border border-surface-border rounded px-2 py-1 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-purple"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );

  if (sort !== "type") {
    const filtered = filterType === "all"
      ? neighborhoods
      : neighborhoods.filter((n) => n.neighborhoodType === filterType);
    const sorted = sortedNeighborhoods(filtered, sort);

    return (
      <div>
        {sortControl}
        <div className="flex flex-wrap gap-2 mb-6">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip.value}
              type="button"
              onClick={() => setFilterType(chip.value)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                filterType === chip.value
                  ? "bg-accent-purple/15 border-accent-purple/30 text-accent-purple"
                  : "bg-surface-raised border-surface-border text-text-muted hover:text-text-secondary hover:border-surface-border"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
        {sorted.length === 0 ? (
          <p className="text-sm text-text-muted">No neighborhoods in this category.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map((n) => (
              <EntityCard
                key={n.id}
                href={`/neighborhoods/${encodeURIComponent(n.slug)}`}
                eyebrow={`${n.parcelCount} properties`}
                title={n.label}
                subtitle={NEIGHBORHOOD_ERA_LABELS[n.slug] ?? (n.medianYear ? `Typical build year: ${n.medianYear}` : undefined)}
                signal={getChangeSignal({
                  permit_count: n.totalPermits,
                  sale_count: n.totalSales,
                  recent_teardown_count: n.recentTeardowns,
                })}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {sortControl}
      {TYPE_SECTIONS.map(({ type, title }) => (
        <NeighborhoodSection
          key={type}
          title={title}
          items={neighborhoods.filter((n) => n.neighborhoodType === type)}
        />
      ))}
      <NeighborhoodSection
        title="Other"
        items={neighborhoods.filter((n) => !n.neighborhoodType)}
      />
    </div>
  );
}
