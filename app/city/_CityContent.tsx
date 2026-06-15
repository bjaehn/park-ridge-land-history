"use client";

import { useState, useEffect } from "react";
import { StatGrid } from "@/components/ui/StatGrid";
import { ConstructionByDecadeChart } from "@/components/ui/ConstructionByDecadeChart";
import { CoverageTable } from "@/components/ui/CoverageTable";
import { LoadingSkeleton } from "@/components/ui/EmptyState";
import { formatNumber } from "@/lib/formatters";
import { CITY_NARRATIVE } from "@/lib/content";
import type { DecadeRow } from "@/components/ui/ConstructionByDecadeChart";
import type { NeighborhoodSummary } from "@/lib/data/neighborhoods";

type HomeStatsSnapshot = {
  totalProperties: number;
  oldestYear: number | null;
  newestYear: number | null;
  pre1945Count: number;
  pre1945Pct: number;
  yearBuiltKnown: number;
  yearBuiltPct: number;
};

export function CityContent() {
  const [stats, setStats] = useState<HomeStatsSnapshot | null>(null);
  const [rows, setRows] = useState<DecadeRow[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      import("@/lib/supabase/homeQueries").then((m) => m.fetchHomeStats()),
      import("@/lib/supabase/homeQueries").then((m) => m.fetchDecadeDistribution()),
      import("@/lib/data/neighborhoods").then((m) => m.fetchNeighborhoodSummaries()),
    ])
      .then(([s, d, n]) => {
        if (s) setStats(s as unknown as HomeStatsSnapshot);
        setRows(d.map((r) => ({ decade: r.decade, count: r.count })));
        setNeighborhoods(
          [...n].sort((a, b) => (a.medianYear ?? 9999) - (b.medianYear ?? 9999))
        );
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton rows={4} />;
  if (!stats) return null;

  const total = rows.reduce((sum, r) => sum + r.count, 0);

  const statItems = [
    { value: formatNumber(stats.totalProperties), label: "Properties" },
    stats.oldestYear != null ? { value: String(stats.oldestYear), label: "Oldest recorded build year" } : null,
    stats.pre1945Count > 0
      ? { value: formatNumber(stats.pre1945Count), label: "Built before 1945", note: `${stats.pre1945Pct}% of all properties` }
      : null,
    stats.yearBuiltKnown > 0
      ? { value: `${stats.yearBuiltPct}%`, label: "Build year on record" }
      : null,
  ].filter((s): s is { value: string; label: string; note?: string } => s !== null);

  return (
    <div className="space-y-10">
      <p className="text-text-secondary leading-relaxed max-w-prose">{CITY_NARRATIVE}</p>

      <StatGrid columns={4} stats={statItems.slice(0, 4)} />

      <div className="two-col-layout">
        <div>
          <p className="section-heading">Construction by decade</p>
          <ConstructionByDecadeChart rows={rows} />
        </div>
        <div>
          <p className="section-heading">Decade breakdown</p>
          <CoverageTable rows={rows} total={total} />
        </div>
      </div>

      {neighborhoods.length > 0 && (
        <div>
          <p className="section-heading">Development by neighborhood</p>
          <p className="text-sm text-text-muted mb-4">Sorted from oldest to newest median build year.</p>
          <div className="bg-surface-card border border-surface-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">Neighborhood</th>
                  <th className="text-right px-4 py-3 text-text-secondary font-medium">Properties</th>
                  <th className="text-right px-4 py-3 text-text-secondary font-medium">Typical build year</th>
                </tr>
              </thead>
              <tbody>
                {neighborhoods.map((n) => (
                  <tr key={n.id} className="border-b border-surface-border last:border-0">
                    <td className="px-4 py-3">
                      <a
                        href={`/neighborhoods/${encodeURIComponent(n.slug)}`}
                        className="text-text-primary hover:text-accent-purple transition-colors"
                      >
                        {n.label}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-right text-text-secondary tabular-nums">
                      {formatNumber(n.parcelCount)}
                    </td>
                    <td className="px-4 py-3 text-right text-text-secondary tabular-nums">
                      {n.medianYear ?? "Unknown"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
