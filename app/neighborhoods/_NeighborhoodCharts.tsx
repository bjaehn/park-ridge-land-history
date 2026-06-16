"use client";
import { useState, useEffect } from "react";
import { NeighborhoodPriceChart } from "@/components/ui/NeighborhoodPriceChart";
import { EraPortraitChart } from "@/components/ui/EraPortraitChart";
import { LoadingSkeleton } from "@/components/ui/EmptyState";
import { SaleIcon, YearBuiltIcon } from "@/lib/icons";
import {
  fetchNeighborhoodPriceComparison,
  fetchNeighborhoodEraDistribution,
} from "@/lib/supabase/neighborhoodComparisonQueries";
import type { NeighborhoodPriceRow, NeighborhoodEraRow } from "@/lib/supabase/neighborhoodComparisonQueries";

export function NeighborhoodCharts() {
  const [priceData, setPriceData] = useState<NeighborhoodPriceRow[]>([]);
  const [eraData, setEraData] = useState<NeighborhoodEraRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchNeighborhoodPriceComparison(), fetchNeighborhoodEraDistribution()])
      .then(([prices, eras]) => {
        setPriceData(prices);
        setEraData(eras);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton rows={2} />;

  return (
    <div className="space-y-10">
      {priceData.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <SaleIcon size={14} strokeWidth={1.8} className="text-text-muted" aria-hidden="true" />
            <p className="section-heading !mb-0">Median sale price by neighborhood, 2015 vs. 2024</p>
          </div>
          <NeighborhoodPriceChart data={priceData} />
        </section>
      )}
      {eraData.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <YearBuiltIcon size={14} strokeWidth={1.8} className="text-text-muted" aria-hidden="true" />
            <p className="section-heading !mb-0">Era portrait: when each neighborhood was built</p>
          </div>
          <p className="text-sm text-text-muted mb-3">
            Each bar shows 100% of homes with known build years, divided by era.
          </p>
          <EraPortraitChart data={eraData} />
        </section>
      )}
    </div>
  );
}
