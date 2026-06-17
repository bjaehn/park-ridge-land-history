"use client";

import { useState, useEffect } from "react";
import { StatGrid } from "@/components/ui/StatGrid";
import { EntityCard } from "@/components/ui/EntityCard";
import { LoadingSkeleton, EmptyState } from "@/components/ui/EmptyState";
import { formatAddress, formatNumber } from "@/lib/formatters";
import { getPinGroupDetail } from "@/lib/data/pinGroups";

type Props = { prefix: string };

export function PinGroupContent({ prefix }: Props) {
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getPinGroupDetail>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPinGroupDetail(prefix)
      .then(setDetail)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [prefix]);

  if (loading) return <LoadingSkeleton rows={3} />;
  if (!detail || detail.parcels.length === 0) {
    return (
      <EmptyState
        heading="No properties found"
        body={`No parcels match PIN prefix ${prefix}.`}
      />
    );
  }

  return (
    <div className="space-y-10">
      <StatGrid
        columns={2}
        stats={[{ value: formatNumber(detail.parcelCount), label: "Properties" }]}
      />

      <div>
        <p className="section-heading">Properties with this PIN prefix</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {detail.parcels.map((p) => (
            <EntityCard
              key={p.pin}
              href={`/properties/${encodeURIComponent(p.pin)}`}
              title={p.address ? formatAddress(p.address) : `PIN ${p.pin}`}
              meta={p.yearBuilt ? `Built ${p.yearBuilt}` : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
