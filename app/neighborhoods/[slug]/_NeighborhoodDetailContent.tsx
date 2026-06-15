"use client";

import { useState, useEffect } from "react";
import { StatGrid } from "@/components/ui/StatGrid";
import { ConstructionByDecadeChart } from "@/components/ui/ConstructionByDecadeChart";
import { CoverageTable } from "@/components/ui/CoverageTable";
import { EntityCard } from "@/components/ui/EntityCard";
import { LoadingSkeleton } from "@/components/ui/EmptyState";
import { getChangeSignal, formatNumber, formatCount } from "@/lib/formatters";
import { getNeighborhoodDetail } from "@/lib/data/neighborhoods";

type Props = { neighborhoodId: string; label: string };

export function NeighborhoodDetailContent({ neighborhoodId, label }: Props) {
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getNeighborhoodDetail>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNeighborhoodDetail(neighborhoodId)
      .then(setDetail)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [neighborhoodId]);

  if (loading) return <LoadingSkeleton rows={4} />;
  if (!detail) return null;

  const signal = getChangeSignal({
    permit_count: detail.totalPermits,
    sale_count: detail.totalSales,
    recent_teardown_count: detail.recentTeardowns,
  });

  const total = detail.decadeRows.reduce((s, r) => s + r.count, 0);

  return (
    <div className="space-y-8">
      <StatGrid
        columns={4}
        stats={[
          { value: formatNumber(detail.parcelCount), label: "Properties" },
          { value: detail.medianYear ? String(detail.medianYear) : "Unknown", label: "Typical build year" },
          { value: formatCount(detail.totalPermits ?? 0, "permit", "permits"), label: "Total permits on record" },
          { value: signal, label: "Change signal" },
        ]}
      />

      <div className="two-col-layout">
        <div>
          <p className="section-heading">Construction by decade in {label}</p>
          <ConstructionByDecadeChart rows={detail.decadeRows} />
        </div>
        <div>
          <p className="section-heading">Breakdown</p>
          <CoverageTable rows={detail.decadeRows} total={total} />
        </div>
      </div>

      {detail.streets && detail.streets.length > 0 && (
        <div>
          <p className="section-heading">Streets in {label}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {detail.streets.map((street) => (
              <EntityCard
                key={street.name}
                href={`/streets/${encodeURIComponent(street.name)}`}
                title={street.name}
                meta={street.parcelCount ? formatCount(street.parcelCount, "property", "properties") : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
