"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge";
import { ComparisonList } from "@/components/ui/ComparisonList";
import { EntityCard, UnresolvableEntityCard } from "@/components/ui/EntityCard";
import { LoadingSkeleton } from "@/components/ui/EmptyState";
import { InlineSourceNote } from "@/components/ui/SourceNote";
import { PropertyTimeline, buildTimelineEvents } from "@/components/ui/PropertyTimeline";
import {
  YearBuiltIcon,
  SizeIcon,
  LotIcon,
  AssessmentIcon,
  PermitIcon,
  SaleIcon,
  SubdivisionIcon,
  ComparisonIcon,
  MissingIcon,
  StreetIcon,
} from "@/lib/icons";
import {
  formatAddress,
  formatCurrency,
  formatSqft,
  formatYear,
  formatCount,
  confidenceFor,
} from "@/lib/formatters";
import { getPropertyDetail } from "@/lib/data/properties";
import type { PropertySale, PropertyPermit, HargisRecord } from "@/lib/data/properties";
import type { LucideIcon } from "lucide-react";

type Props = { pin: string; streetDisplayName?: string };

type IconRowItem = {
  icon: LucideIcon;
  label: string;
  value: string | null;
};

function IconRow({ items }: { items: IconRowItem[] }) {
  const filtered = items.filter((i) => i.value !== null && i.value !== "");
  if (!filtered.length) return null;
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
      {filtered.map((item) => (
        <div key={item.label} className="flex items-start gap-2.5">
          <item.icon size={15} strokeWidth={1.8} className="text-text-muted mt-0.5 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <dt className="text-xs text-text-muted">{item.label}</dt>
            <dd className="text-sm font-medium text-text-primary">{item.value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

function SaleHistorySection({ sales }: { sales: PropertySale[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!sales.length) return null;
  const visible = expanded ? sales : sales.slice(0, 3);
  return (
    <section>
      <p className="section-heading">Sale history</p>
      <div className="space-y-2">
        {visible.map((s) => (
          <div key={s.id} className="flex items-start justify-between gap-3 bg-surface-card border border-surface-border rounded-lg px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary">
                {s.sale_date ? new Date(s.sale_date).getFullYear() : s.sale_year ?? "—"}
                {s.deed_type ? <span className="font-normal text-text-secondary"> · {s.deed_type}</span> : null}
              </p>
              {s.document_number && (
                <p className="text-xs text-text-muted mt-0.5">Doc #{s.document_number}</p>
              )}
              {!s.is_market_sale && (
                <p className="text-xs text-text-muted mt-0.5 italic">Non-market transfer</p>
              )}
            </div>
            <div className="text-right shrink-0">
              {s.sale_price != null ? (
                <p className="text-sm font-semibold text-text-primary">{formatCurrency(s.sale_price)}</p>
              ) : (
                <p className="text-sm text-text-muted">Price not recorded</p>
              )}
            </div>
          </div>
        ))}
      </div>
      {sales.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs text-text-secondary hover:text-text-primary transition-colors"
        >
          {expanded ? "Show fewer" : `Show all ${sales.length} sales`}
        </button>
      )}
      <InlineSourceNote className="mt-2">Cook County Recorder of Deeds via Cook County Assessor</InlineSourceNote>
    </section>
  );
}

function PermitHistorySection({ permits }: { permits: PropertyPermit[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!permits.length) return null;
  const visible = expanded ? permits : permits.slice(0, 3);
  return (
    <section>
      <p className="section-heading">Permit history</p>
      <div className="space-y-2">
        {visible.map((p) => (
          <div key={p.id} className="bg-surface-card border border-surface-border rounded-lg px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary">
                  {p.date_issued ? new Date(p.date_issued).getFullYear() : "—"}
                  {p.status ? <span className="font-normal text-text-secondary"> · {p.status}</span> : null}
                </p>
                {p.description && (
                  <p className="text-xs text-text-secondary mt-0.5">{p.description}</p>
                )}
                {p.local_permit_number && (
                  <p className="text-xs text-text-muted mt-0.5">#{p.local_permit_number.trim()}</p>
                )}
              </div>
              {p.amount != null && p.amount > 0 && (
                <p className="text-sm font-semibold text-text-primary shrink-0">{formatCurrency(p.amount)}</p>
              )}
            </div>
          </div>
        ))}
      </div>
      {permits.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs text-text-secondary hover:text-text-primary transition-colors"
        >
          {expanded ? "Show fewer" : `Show all ${permits.length} permits`}
        </button>
      )}
      <InlineSourceNote className="mt-2">City of Park Ridge via Cook County Assessor</InlineSourceNote>
    </section>
  );
}

function HargisSurveySection({ records }: { records: HargisRecord[] }) {
  if (!records.length) return null;
  return (
    <section>
      <p className="section-heading">Historic survey (HARGIS)</p>
      <div className="space-y-3">
        {records.map((r) => (
          <div key={r.id} className="bg-surface-card border border-surface-border rounded-lg px-4 py-3">
            <div className="flex items-start gap-3">
              {r.photo_url && (
                <a
                  href={r.photo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 w-16 h-16 bg-surface-raised border border-surface-border rounded overflow-hidden flex items-center justify-center text-xs text-text-muted hover:opacity-80 transition-opacity"
                  title="View HARGIS survey photo"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={r.photo_url}
                    alt={r.record_name ?? r.location_text ?? "Historic survey photo"}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                </a>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary">
                  {r.record_name ?? r.location_text ?? `HARGIS #${r.refnum}`}
                </p>
                {r.arch_class && (
                  <p className="text-xs text-text-secondary mt-0.5">{r.arch_class}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                  {r.nr_evaluation && (
                    <span className="text-xs text-text-muted">NR eval: {r.nr_evaluation}</span>
                  )}
                  {r.begin_year && (
                    <span className="text-xs text-text-muted">Est. {r.begin_year}</span>
                  )}
                  {r.architect && (
                    <span className="text-xs text-text-muted">Arch: {r.architect}</span>
                  )}
                  {r.builder && (
                    <span className="text-xs text-text-muted">Builder: {r.builder}</span>
                  )}
                </div>
                {r.pdf_url && (
                  <a
                    href={r.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent-purple hover:underline mt-1 inline-block"
                  >
                    Survey report (PDF)
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <InlineSourceNote className="mt-2">
        Illinois Historic Architectural Resources Geographic Information System (HARGIS), Illinois SHPO
      </InlineSourceNote>
    </section>
  );
}

export function PropertyDetailContent({ pin, streetDisplayName }: Props) {
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

  const permitCount = props.permit_count as number | null;
  const saleCount = props.sale_count as number | null;
  const latestPermitYear = props.latest_permit_year as number | null;
  const latestSaleYear = props.latest_sale_year as number | null;
  const latestSalePrice = props.latest_sale_price as number | null;

  const sales = detail.sales ?? [];
  const permits = detail.permits ?? [];
  const hargisRecords = detail.hargisRecords ?? [];

  const timeline = buildTimelineEvents(props as Record<string, unknown>, detail.subdivision);

  const vitals: IconRowItem[] = [
    { icon: YearBuiltIcon, label: "Year built", value: formatYear(props.year_built) },
    { icon: SizeIcon,      label: "Building size", value: formatSqft(props.building_sqft) },
    { icon: LotIcon,       label: "Lot size", value: formatSqft(props.land_sqft) },
    { icon: AssessmentIcon, label: "Latest assessed value", value: formatCurrency(props.latest_assessed_total) },
  ];

  const missingGaps: string[] = [];
  if (!props.year_built) missingGaps.push("Build year not in assessor records");
  if (!detail.subdivision) missingGaps.push("Recorded plat not yet identified");
  if (!permitCount || permitCount === 0) missingGaps.push("No permit history in dataset");
  if (!saleCount || saleCount === 0) missingGaps.push("No recorded sales in dataset");

  return (
    <div className="space-y-10">
      {/* Confidence + vitals */}
      <section>
        <div className="mb-4">
          <ConfidenceBadge level={confidence} showDescription />
        </div>
        <IconRow items={vitals} />
      </section>

      {/* Evidence timeline */}
      {timeline.length > 0 && (
        <section>
          <p className="section-heading">Evidence trail</p>
          <PropertyTimeline events={timeline} />
        </section>
      )}

      {/* Permit and sale activity summary */}
      {((permitCount && permitCount > 0) || (saleCount && saleCount > 0)) && (
        <section>
          <p className="section-heading">Activity record</p>
          <div className="grid grid-cols-2 gap-4">
            {permitCount != null && permitCount > 0 && (
              <div className="bg-surface-card border border-surface-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <PermitIcon size={14} strokeWidth={1.8} className="text-confidence-medium" aria-hidden="true" />
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Permits</span>
                </div>
                <p className="text-2xl font-bold text-text-primary leading-none mb-1">{permitCount}</p>
                <p className="text-xs text-text-muted">
                  {latestPermitYear ? `Most recent: ${latestPermitYear}` : "on record"}
                </p>
              </div>
            )}
            {saleCount != null && saleCount > 0 && (
              <div className="bg-surface-card border border-surface-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <SaleIcon size={14} strokeWidth={1.8} className="text-confidence-high" aria-hidden="true" />
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Sales</span>
                </div>
                <p className="text-2xl font-bold text-text-primary leading-none mb-1">{saleCount}</p>
                <p className="text-xs text-text-muted">
                  {latestSaleYear
                    ? latestSalePrice
                      ? `Last sold ${latestSaleYear} for $${latestSalePrice.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
                      : `Most recent: ${latestSaleYear}`
                    : "on record"}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Individual sale events */}
      <SaleHistorySection sales={sales} />

      {/* Individual permit events */}
      <PermitHistorySection permits={permits} />

      {/* HARGIS historic survey records */}
      <HargisSurveySection records={hargisRecords} />

      {/* Recorded plat */}
      {detail.subdivision && (
        <section>
          <p className="section-heading">Recorded plat</p>
          <div className="flex items-start gap-3 bg-surface-card border border-surface-border rounded-lg p-4">
            <SubdivisionIcon size={16} strokeWidth={1.8} className="text-text-muted shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0">
              <Link
                href={`/subdivisions/${encodeURIComponent(detail.subdivision.id)}`}
                className="text-sm font-semibold text-text-primary hover:text-accent-purple transition-colors"
              >
                {detail.subdivision.name}
              </Link>
              <p className="text-xs text-text-secondary mt-0.5">
                {detail.subdivision.recorded_year
                  ? `Recorded ${detail.subdivision.recorded_year}${detail.subdivision.original_owner ? `. Developer: ${detail.subdivision.original_owner}` : ""}`
                  : "Recording date uncertain"}
              </p>
              <p className="text-xs text-text-muted mt-0.5">Cook County Recorder of Deeds</p>
            </div>
          </div>
        </section>
      )}

      {/* How this property compares */}
      {detail.comparisons && detail.comparisons.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ComparisonIcon size={14} strokeWidth={1.8} className="text-text-muted" aria-hidden="true" />
            <p className="section-heading !mb-0">How this property compares</p>
          </div>
          <ComparisonList rows={detail.comparisons} />
        </section>
      )}

      {/* Other homes on this street */}
      {detail.relatedHomes && detail.relatedHomes.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <StreetIcon size={14} strokeWidth={1.8} className="text-text-muted" aria-hidden="true" />
            <p className="section-heading !mb-0">
              {streetDisplayName ? `Other homes on ${streetDisplayName}` : "Other homes on this street"}
            </p>
          </div>
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

      {/* What we don't know yet */}
      {missingGaps.length > 0 && (
        <section>
          <p className="section-heading">What we don't know yet</p>
          <ul className="space-y-2">
            {missingGaps.map((gap) => (
              <li key={gap} className="flex items-start gap-2.5 text-sm text-text-muted">
                <MissingIcon size={14} strokeWidth={1.8} className="shrink-0 mt-0.5" aria-hidden="true" />
                {gap}
              </li>
            ))}
          </ul>
          <InlineSourceNote className="mt-3">
            Missing records may be added as research progresses. If you know something about this property, contact us.
          </InlineSourceNote>
        </section>
      )}

      {/* Raw assessor data */}
      <details className="border border-surface-border rounded-lg overflow-hidden">
        <summary className="px-4 py-3 text-sm text-text-secondary cursor-pointer hover:text-text-primary hover:bg-surface-raised transition-colors">
          Raw assessor record
        </summary>
        <div className="px-4 pb-4 pt-2">
          <InlineSourceNote>
            Raw fields from the Cook County assessor dataset. Owner names are omitted.
          </InlineSourceNote>
          <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <div><dt className="text-text-muted">PIN</dt><dd className="font-mono text-text-secondary">{props.pin_normalized ?? props.pin_original}</dd></div>
            <div><dt className="text-text-muted">Year built</dt><dd className="text-text-secondary">{formatYear(props.year_built)}</dd></div>
            <div><dt className="text-text-muted">Municipality</dt><dd className="text-text-secondary">{(props.municipality as string | null) ?? "Not recorded"}</dd></div>
            <div><dt className="text-text-muted">Property class</dt><dd className="text-text-secondary">{(props.property_class as string | null) ?? "Not recorded"}</dd></div>
            <div><dt className="text-text-muted">Improvement count</dt><dd className="text-text-secondary">{formatCount(props.improvement_count as number | null ?? 0, "improvement", "improvements")}</dd></div>
            <div><dt className="text-text-muted">Source note</dt><dd className="text-text-secondary">{(props.source_note as string | null) ?? "None"}</dd></div>
          </dl>
        </div>
      </details>
    </div>
  );
}
