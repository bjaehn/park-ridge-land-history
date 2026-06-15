"use client";

import { useState, useEffect } from "react";
import { StatGrid } from "@/components/ui/StatGrid";
import { ConstructionByDecadeChart } from "@/components/ui/ConstructionByDecadeChart";
import { CoverageTable } from "@/components/ui/CoverageTable";
import { LoadingSkeleton } from "@/components/ui/EmptyState";
import { formatNumber } from "@/lib/formatters";
import type { DecadeRow } from "@/components/ui/ConstructionByDecadeChart";

type CityStats = {
  total_parcels: number;
  with_year_built: number;
  with_address: number;
  oldest_year: number;
  median_year: number;
};

export function CityContent() {
  const [stats, setStats] = useState<CityStats | null>(null);
  const [rows, setRows] = useState<DecadeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      import("@/lib/supabase/homeQueries").then((m) => m.fetchHomeStats()),
      import("@/lib/supabase/homeQueries").then((m) => m.fetchDecadeDistribution()),
    ])
      .then(([s, d]) => {
        setStats(s as unknown as CityStats);
        setRows(d.map((r) => ({ decade: r.decade, count: r.count })));
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton rows={4} />;
  if (!stats) return null;

  const total = rows.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="space-y-8">
      <StatGrid
        columns={4}
        stats={[
          { value: formatNumber(stats.total_parcels), label: "Properties" },
          { value: formatNumber(stats.with_year_built), label: "With build year", note: `${((stats.with_year_built / stats.total_parcels) * 100).toFixed(0)}% coverage` },
          { value: stats.oldest_year ? String(stats.oldest_year) : "Unknown", label: "Oldest recorded" },
          { value: stats.median_year ? String(stats.median_year) : "Unknown", label: "Median build year" },
        ]}
      />

      <div className="two-col-layout">
        <div>
          <p className="section-heading">Construction by decade</p>
          <ConstructionByDecadeChart rows={rows} />
        </div>
        <div>
          <p className="section-heading">Breakdown</p>
          <CoverageTable rows={rows} total={total} />
        </div>
      </div>
    </div>
  );
}
