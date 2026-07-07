"use client";
import { useState, useEffect } from "react";
import { NeighborhoodPriceChart } from "@/components/ui/NeighborhoodPriceChart";
import { LoadingSkeleton } from "@/components/ui/EmptyState";
import { SaleIcon } from "@/lib/icons";
import { fetchSubdivisionPriceComparison } from "@/lib/supabase/subdivisionComparisonQueries";
import type { SubdivisionPriceRow } from "@/lib/supabase/subdivisionComparisonQueries";
import type { SubdivisionSummary } from "@/lib/subdivisionTypes";

type Props = {
  subdivisions: SubdivisionSummary[];
};

export function SubdivisionEraPriceCharts({ subdivisions }: Props) {
  const [priceData, setPriceData] = useState<SubdivisionPriceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubdivisionPriceComparison(subdivisions)
      .then(setPriceData)
      .catch(() => null)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <LoadingSkeleton rows={1} />;

  return (
    <div className="space-y-10">
      {priceData.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <SaleIcon size={14} strokeWidth={1.8} className="text-text-muted" aria-hidden="true" />
            <p className="section-heading !mb-0">Median sale price by subdivision, 2015 vs. 2024</p>
          </div>
          <NeighborhoodPriceChart data={priceData} />
        </section>
      )}
    </div>
  );
}
