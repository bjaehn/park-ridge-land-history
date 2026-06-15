"use client";

import { useState, useEffect } from "react";
import { StatGrid } from "@/components/ui/StatGrid";
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge";
import { ComparisonList } from "@/components/ui/ComparisonList";
import { EntityCard, UnresolvableEntityCard } from "@/components/ui/EntityCard";
import { LoadingSkeleton } from "@/components/ui/EmptyState";
import { InlineSourceNote } from "@/components/ui/SourceNote";
import {
  formatAddress,
  formatCurrency,
  formatNumber,
  formatSqft,
  formatYear,
  formatCount,
  confidenceFor,
  getChangeSignal,
  SIGNAL_DESCRIPTION,
} from "@/lib/formatters";
import { getPropertyDetail } from "@/lib/data/properties";

type Props = { pin: string };

export function PropertyDetailContent({ pin }: Props) {
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getPropertyDetail>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPropertyDetail(pin)
      .then(setDetail)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [pin]);

  if (loading) return <LoadingSkeleton rows={5} />;
  if (!detail) return <p className="text-text-secondary">Property record not found.</p>;

  const props = detail.properties;
  const confidence = confidenceFor({
    year_built: props.year_built,
    data_quality_flags: props.data_quality_flags,
    source_note: props.source_note,
    improvement_count: props.improvement_count,
  });
  const signal = getChangeSignal({
    permit_count: props.permit_count,
    sale_count: props.sale_count,
    recent_teardown_count: props.nearby_teardown_count,
    recent_permit_count: props.recent_permit_count,
  });

  return (
    <div className="space-y-8">
      {/* What we know */}
      <section>
        <p className="section-heading">What we know</p>
        <div className="flex items-start justify-between mb-3">
          <ConfidenceBadge level={confidence} showDescription />
        </div>
        <StatGrid
          columns={2}
          stats={[
            { value: formatYear(props.year_built), label: "Year built" },
            { value: formatSqft(props.building_sqft), label: "Building size" },
            { value: formatSqft(props.land_sqft), label: "Lot size" },
            { value: formatCurrency(props.latest_assessed_total), label: "Latest assessed value" },
          ]}
        />
      </section>

      {/* Change signal */}
      <section>
        <p className="section-heading">Change activity</p>
        <div className="bg-surface-card border border-surface-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-base font-semibold text-text-primary">{signal}</span>
          </div>
          <p className="text-sm text-text-secondary mb-3">{SIGNAL_DESCRIPTION[signal]}</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-text-muted">Permits: </span>
              <span className="text-text-primary">{formatCount(props.permit_count ?? 0, "permit", "permits")}</span>
            </div>
            <div>
              <span className="text-text-muted">Sales: </span>
              <span className="text-text-primary">{formatCount(props.sale_count ?? 0, "sale", "sales")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Subdivision cross-link */}
      {detail.subdivision && (
        <section>
          <p className="section-heading">Recorded plat</p>
          <EntityCard
            href={`/subdivisions/${encodeURIComponent(detail.subdivision.id)}`}
            eyebrow="This lot was created by"
            title={detail.subdivision.name}
            subtitle={
              detail.subdivision.recorded_year
                ? `Recorded ${detail.subdivision.recorded_year}${detail.subdivision.original_owner ? `. Developer: ${detail.subdivision.original_owner}` : ""}`
                : "Recording date uncertain"
            }
          />
        </section>
      )}

      {/* Comparisons */}
      {detail.comparisons && (
        <section>
          <p className="section-heading">How this property compares</p>
          <ComparisonList
            rows={detail.comparisons}
          />
        </section>
      )}

      {/* Related homes */}
      {detail.relatedHomes && detail.relatedHomes.length > 0 && (
        <section>
          <p className="section-heading">Other homes on this street</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {detail.relatedHomes.slice(0, 4).map((h) => {
              if (!h.address) return <UnresolvableEntityCard key={h.pin} pin={h.pin} />;
              return (
                <EntityCard
                  key={h.pin}
                  href={`/properties/${encodeURIComponent(h.pin)}`}
                  title={formatAddress(h.address)}
                  meta={h.yearBuilt ? `Built ${h.yearBuilt}` : undefined}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Raw data disclosure */}
      <details className="border border-surface-border rounded-lg overflow-hidden">
        <summary className="px-4 py-3 text-sm text-text-secondary cursor-pointer hover:text-text-primary hover:bg-surface-raised transition-colors">
          Raw assessor data
        </summary>
        <div className="px-4 pb-4 pt-2">
          <InlineSourceNote>
            Raw fields from the Cook County assessor dataset. Owner names are omitted.
          </InlineSourceNote>
          <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <div><dt className="text-text-muted">PIN</dt><dd className="font-mono text-text-secondary">{props.pin_normalized ?? props.pin_original ?? "Unknown"}</dd></div>
            <div><dt className="text-text-muted">Year built</dt><dd className="text-text-secondary">{formatYear(props.year_built)}</dd></div>
            <div><dt className="text-text-muted">Municipality</dt><dd className="text-text-secondary">{props.municipality ?? "Unknown"}</dd></div>
            <div><dt className="text-text-muted">Property class</dt><dd className="text-text-secondary">{props.property_class ?? "Unknown"}</dd></div>
            <div><dt className="text-text-muted">Improvement count</dt><dd className="text-text-secondary">{formatNumber(props.improvement_count)}</dd></div>
            <div><dt className="text-text-muted">Source note</dt><dd className="text-text-secondary">{props.source_note ?? "None"}</dd></div>
          </dl>
        </div>
      </details>
    </div>
  );
}
