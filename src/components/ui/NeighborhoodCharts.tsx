"use client";
import { useState, useEffect } from "react";
import { NeighborhoodPriceChart } from "./NeighborhoodPriceChart";
import { EraPortraitChart } from "./EraPortraitChart";
import { LoadingSkeleton } from "./EmptyState";
import { SaleIcon, YearBuiltIcon } from "@/lib/icons";
import {
  fetchNeighborhoodPriceComparison,
  fetchNeighborhoodEraDistribution,
} from "@/lib/supabase/neighborhoodComparisonQueries";
import type { NeighborhoodPriceRow, NeighborhoodEraRow } from "@/lib/supabase/neighborhoodComparisonQueries";
import type { NeighborhoodType } from "@/lib/data/neighborhoods";

export function NeighborhoodCharts({ neighborhoodTypes }: { neighborhoodTypes: NeighborhoodType[] }) {
  const [priceData, setPriceData] = useState<NeighborhoodPriceRow[]>([]);
  const [eraData, setEraData] = useState<NeighborhoodEraRow[]>([]);
  const [loading, setLoading] = useState(true);
  const typesKey = neighborhoodTypes.join(",");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchNeighborhoodPriceComparison(neighborhoodTypes),
      fetchNeighborhoodEraDistribution(neighborhoodTypes),
    ])
      .then(([prices, eras]) => {
        setPriceData(prices);
        setEraData(eras);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typesKey]);

  if (loading) return <LoadingSkeleton rows={2} />;

  return (
    <div className="space-y-10">
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
      {priceData.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <SaleIcon size={14} strokeWidth={1.8} className="text-text-muted" aria-hidden="true" />
            <p className="section-heading !mb-0">Median sale price by neighborhood, 2015 vs. 2024</p>
          </div>
          <NeighborhoodPriceChart data={priceData} />
        </section>
      )}
    </div>
  );
}
