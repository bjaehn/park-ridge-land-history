"use client";

import { useState, useEffect } from "react";
import { StatGrid } from "@/components/ui/StatGrid";
import { EntityCard, UnresolvableEntityCard } from "@/components/ui/EntityCard";
import { LoadingSkeleton } from "@/components/ui/EmptyState";
import { formatNumber, formatCount, formatAddress } from "@/lib/formatters";
import { fetchSubdivisionParcels } from "@/lib/supabase/subdivisionQueries";

type Props = { subdivisionId: string };

export function SubdivisionDetailContent({ subdivisionId }: Props) {
  const [parcels, setParcels] = useState<Awaited<ReturnType<typeof fetchSubdivisionParcels>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubdivisionParcels(subdivisionId)
      .then(setParcels)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [subdivisionId]);

  if (loading) return <LoadingSkeleton rows={3} />;

  return (
    <div className="space-y-6">
      <StatGrid
        columns={2}
        stats={[
          { value: formatCount(parcels.length, "lot", "lots"), label: "Lots in this plat" },
          { value: parcels.filter((p) => !p.address).length > 0 ? String(parcels.filter((p) => !p.address).length) : "None", label: "Address not on record" },
        ]}
      />

      {parcels.length > 0 && (
        <div>
          <p className="section-heading">Lots in this subdivision</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {parcels.map((p) => {
              if (!p.address) {
                return <UnresolvableEntityCard key={p.pin} pin={p.pin} />;
              }
              return (
                <EntityCard
                  key={p.pin}
                  href={`/properties/${encodeURIComponent(p.pin)}`}
                  title={formatAddress(p.address)}
                  meta={p.year_built ? `Built ${p.year_built}` : undefined}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
