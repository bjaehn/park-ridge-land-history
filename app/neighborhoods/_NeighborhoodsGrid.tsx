"use client";

import { useState, useEffect } from "react";
import { EntityCard } from "@/components/ui/EntityCard";
import { LoadingSkeleton, EmptyState } from "@/components/ui/EmptyState";
import { getChangeSignal, formatCount } from "@/lib/formatters";
import { getEraColor } from "@/lib/mapConfig";
import { fetchNeighborhoodSummaries } from "@/lib/data/neighborhoods";
import type { NeighborhoodSummary } from "@/lib/data/neighborhoods";
import { NEIGHBORHOOD_ERA_LABELS } from "@/lib/content";

// Official Planning Neighborhoods and Business Districts have their own
// dedicated pages (/planning-districts, /business-districts) with a map
// overview -- not listed here. "corridor" was previously missing from this
// list entirely (a pre-existing bug: corridor-type rows have a
// neighborhoodType set, so they were never caught by the "Other" section
// below either, which only catches null-type rows -- they were invisible
// site-wide until this fix).
const TYPE_SECTIONS = [
  { type: "corridor" as const, title: "Corridor Districts" },
  { type: "local_market" as const, title: "Local / Market Neighborhoods" },
];

function groupByDecade(items: NeighborhoodSummary[]): [string, NeighborhoodSummary[]][] {
  const byDecade = new Map<string, NeighborhoodSummary[]>();
  items.forEach((n) => {
    const key = n.medianYear ? `${Math.floor(n.medianYear / 10) * 10}s` : "Unknown";
    const arr = byDecade.get(key) ?? [];
    arr.push(n);
    byDecade.set(key, arr);
  });
  return Array.from(byDecade.entries()).sort(([a], [b]) => {
    if (a === "Unknown") return 1;
    if (b === "Unknown") return -1;
    return a.localeCompare(b);
  });
}

function NeighborhoodSection({ title, items }: { title: string; items: NeighborhoodSummary[] }) {
  if (!items.length) return null;
  const decades = groupByDecade(items);
  return (
    <div className="mb-10">
      <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">{title}</h2>
      <div className="space-y-8">
        {decades.map(([decade, group]) => {
          const decadeYear = decade === "Unknown" ? null : parseInt(decade);
          return (
            <div key={decade}>
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: getEraColor(decadeYear ?? undefined) ?? "#64748b" }}
                  aria-hidden="true"
                />
                <span className="text-sm font-semibold text-text-secondary tracking-wide">
                  {decadeYear ? decade : "Unknown era"}
                </span>
                <div className="flex-1 border-t border-surface-border" />
                <span className="text-xs text-text-muted">
                  {formatCount(group.length, "neighborhood", "neighborhoods")}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.map((n) => (
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
        })}
      </div>
    </div>
  );
}

export function NeighborhoodsGrid({ teaser }: { teaser?: boolean }) {
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

  return (
    <div>
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
