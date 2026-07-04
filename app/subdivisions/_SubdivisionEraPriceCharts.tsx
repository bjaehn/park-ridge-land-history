"use client";
import { useState, useEffect } from "react";
import { NeighborhoodPriceChart } from "@/components/ui/NeighborhoodPriceChart";
import { EraPortraitChart } from "@/components/ui/EraPortraitChart";
import { LoadingSkeleton } from "@/components/ui/EmptyState";
import { SaleIcon, YearBuiltIcon } from "@/lib/icons";
import {
  fetchSubdivisionPriceComparison,
  fetchSubdivisionEraDistribution,
} from "@/lib/supabase/subdivisionComparisonQueries";
import type {
  SubdivisionPriceRow,
  SubdivisionEraRow,
} from "@/lib/supabase/subdivisionComparisonQueries";
import type { SubdivisionSummary } from "@/lib/subdivisionTypes";

type Props = {
  subdivisions: SubdivisionSummary[];
};

export function SubdivisionEraPriceCharts({ subdivisions }: Props) {
  const [priceData, setPriceData] = useState<SubdivisionPriceRow[]>([]);
  const [eraData, setEraData] = useState<SubdivisionEraRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchSubdivisionPriceComparison(subdivisions),
      fetchSubdivisionEraDistribution(subdivisions),
    ])
      .then(([prices, eras]) => {
        setPriceData(prices);
        setEraData(eras);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <LoadingSkeleton rows={2} />;

  return (
    <div className="space-y-10">
      {eraData.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <YearBuiltIcon size={14} strokeWidth={1.8} className="text-text-muted" aria-hidden="true" />
            <p className="section-heading !mb-0">Era portrait: when each subdivision was built</p>
          </div>
          <p className="text-sm text-text-muted mb-3">
            Each bar shows 100% of homes with known build years, divided by era.
          </p>
          <EraPortraitChart data={eraData} />
        </section>
      )}
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
