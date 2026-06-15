"use client";

import { useState, useEffect } from "react";
import { StatGrid } from "@/components/ui/StatGrid";
import { ConstructionByDecadeChart } from "@/components/ui/ConstructionByDecadeChart";
import { EntityCard, UnresolvableEntityCard } from "@/components/ui/EntityCard";
import { LoadingSkeleton } from "@/components/ui/EmptyState";
import { formatNumber, formatCount, formatAddress } from "@/lib/formatters";
import { getStreetDetail } from "@/lib/data/streets";

type Props = { streetName: string; displayName: string };

export function StreetDetailContent({ streetName, displayName }: Props) {
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getStreetDetail>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStreetDetail(streetName)
      .then(setDetail)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [streetName]);

  if (loading) return <LoadingSkeleton rows={3} />;
  if (!detail) return null;

  return (
    <div className="space-y-8">
      <StatGrid
        columns={3}
        stats={[
          { value: formatNumber(detail.parcelCount), label: "Properties" },
          { value: detail.oldestYear ? String(detail.oldestYear) : "Unknown", label: "Oldest recorded" },
          { value: detail.medianYear ? String(detail.medianYear) : "Unknown", label: "Typical build year" },
        ]}
      />

      <div>
        <p className="section-heading">Construction by decade on {displayName}</p>
        <ConstructionByDecadeChart rows={detail.decadeRows} />
      </div>

      <div>
        <p className="section-heading">Properties on {displayName}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {detail.parcels.map((p) => {
            if (!p.address) {
              return <UnresolvableEntityCard key={p.pin} pin={p.pin} />;
            }
            return (
              <EntityCard
                key={p.pin}
                href={`/properties/${encodeURIComponent(p.pin)}`}
                title={formatAddress(p.address)}
                meta={p.yearBuilt ? `Built ${p.yearBuilt}` : undefined}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
