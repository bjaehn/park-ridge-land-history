"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge";
import { TeardownBadge } from "@/components/ui/TeardownBadge";
import { ComparisonList } from "@/components/ui/ComparisonList";
import { LoadingSkeleton } from "@/components/ui/EmptyState";
import { InlineSourceNote } from "@/components/ui/SourceNote";
import { PropertyTimeline, buildTimelineEvents } from "@/components/ui/PropertyTimeline";
import { SubdivisionLineageCard } from "@/components/ui/SubdivisionLineageCard";
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
  ExternalLinkIcon,
} from "@/lib/icons";
import {
  formatAddress,
  formatCurrency,
  formatSqft,
  formatYear,
  formatCount,
  confidenceFor,
  CONFIDENCE_TOOLTIP,
} from "@/lib/formatters";
import { NEIGHBORHOOD_ERA_LABELS } from "@/lib/content";
import { getPropertyDetail } from "@/lib/data/properties";
import type { PropertySale, PropertyPermit, HargisRecord, LandLineageEntry, LandAncestryData, AssessmentPoint } from "@/lib/data/properties";
import { SalesPriceChart } from "./_SalesPriceChart";
import { AssessmentChart } from "./_AssessmentChart";
import type { LucideIcon } from "lucide-react";

type Props = { pin: string };

type IconRowItem = {
  icon: LucideIcon;
  label: string;
  value: string | null;
};

function IconRow({ items }: { items: IconRowItem[] }) {
  const filtered = items.filter((i) => i.value !== null && i.value !== "");
  if (!filtered.length) return null;
  return (
    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
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

type PinParts = { township: string; section: string; block: string; parcel: string; unit: string };

function parsePinParts(props: { pin_normalized?: string | null; pin_township?: string | null; pin_section?: string | null; pin_block?: string | null; pin_parcel?: string | null; pin_unit?: string | null }): PinParts | null {
  const raw = props.pin_normalized ?? "";
  if (!raw && !props.pin_township) return null;
  return {
    township: props.pin_township ?? raw.slice(0, 2),
    section:  props.pin_section  ?? raw.slice(2, 4),
    block:    props.pin_block    ?? raw.slice(4, 7),
    parcel:   props.pin_parcel   ?? raw.slice(7, 10),
    unit:     props.pin_unit     ?? raw.slice(10, 14),
  };
}

function PinBreakdown({ props }: { props: Record<string, unknown> }) {
  const parts = parsePinParts(props as Parameters<typeof parsePinParts>[0]);
  if (!parts) return null;
  const raw = (props.pin_normalized as string | null | undefined) ?? "";

  const items = [
    { label: "Township", value: parts.township, href: raw.length >= 2  ? `/pin/${raw.slice(0, 2)}`  : null },
    { label: "Section",  value: parts.section,  href: raw.length >= 4  ? `/pin/${raw.slice(0, 4)}`  : null },
    { label: "Block",    value: parts.block,    href: raw.length >= 7  ? `/pin/${raw.slice(0, 7)}`  : null },
    { label: "Parcel",   value: parts.parcel,   href: raw.length >= 10 ? `/pin/${raw.slice(0, 10)}` : null },
    { label: "Unit",     value: parts.unit,     href: null },
  ];

  return (
    <div className="flex gap-2">
      {items.map(({ label, value, href }) => {
        const chip = (
          <div className={[
            "w-full bg-surface-card border border-surface-border rounded-lg px-3 py-4 text-center",
            href ? "hover:border-accent-purple/40 transition-colors" : "",
          ].join(" ")}>
            <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5">{label}</p>
            <p className="font-mono text-lg font-semibold text-text-primary">{value || "-"}</p>
          </div>
        );
        return href
          ? <Link key={label} href={href} className="flex-1">{chip}</Link>
          : <div key={label} className="flex-1">{chip}</div>;
      })}
    </div>
  );
}

function NeighborhoodChip({ label, slug, typeLabel }: { label: string; slug: string; typeLabel: string }) {
  return (
    <Link
      href={`/neighborhoods/${encodeURIComponent(slug)}`}
      className="flex items-center gap-3 bg-surface-card border border-surface-border rounded-lg px-4 py-3 hover:border-accent-purple/40 transition-colors group"
    >
      <StreetIcon size={15} strokeWidth={1.8} className="text-text-muted shrink-0 group-hover:text-accent-purple transition-colors" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">{typeLabel}</p>
        <p className="text-sm font-medium text-text-primary">{label}</p>
      </div>
      <span className="text-text-muted text-xs ml-auto shrink-0">→</span>
    </Link>
  );
}

function SaleHistorySection({ sales, chartSlot }: { sales: PropertySale[]; chartSlot?: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  if (!sales.length) return null;
  const visible = expanded ? sales : sales.slice(0, 3);
  return (
    <section>
      <h2 className="section-heading">Sale history</h2>
      {chartSlot}
      <div className="space-y-2">
        {visible.map((s) => (
          <div key={s.id} className="flex items-start justify-between gap-3 bg-surface-card border border-surface-border rounded-lg px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary">
                {s.sale_date ? new Date(s.sale_date).getFullYear() : s.sale_year ?? "-"}
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
      <h2 className="section-heading">Permit history ({permits.length} on record)</h2>
      <div className="space-y-2">
        {visible.map((p) => (
          <div key={p.id} className="bg-surface-card border border-surface-border rounded-lg px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary">
                  {p.date_issued ? new Date(p.date_issued).getFullYear() : "-"}
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
      <InlineSourceNote className="mt-2">{"City of Park Ridge via Cook County Assessor · Permit records from 2018-present only; earlier history may exist but is not in this dataset"}</InlineSourceNote>
    </section>
  );
}

function LandLineageSection({ lineage }: { lineage: LandLineageEntry[] }) {
  if (!lineage.length) return null;
  const richLineage = lineage.flatMap((entry) => entry.lineage_records ?? []);
  const legacyLineage = lineage.filter((entry) => !(entry.lineage_records?.length));
  return (
    <section>
      <h2 className="section-heading">Subdivision ancestry</h2>
      <div className="space-y-3">
        {richLineage.map((record) => (
          <SubdivisionLineageCard key={record.lineage_key} lineage={record} showAddress />
        ))}

        {legacyLineage.map((entry) => {
          const hasLotBlock = entry.lots.some((l) => l.lot_number || l.block_number);
          const hasMissingLotBlock = entry.lots.some((l) =>
            l.data_quality_flags?.includes("missing_lot_block")
          );
          const isMultiLot = entry.lots.filter((l) => l.lot_number).length > 1;

          return (
            <div
              key={entry.subdivision.id}
              className="bg-surface-card border border-surface-border rounded-lg p-4 space-y-2"
            >
              {/* Parent subdivision / estate */}
              {entry.parent_subdivision && (
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <span className="uppercase tracking-wider">
                    {entry.parent_subdivision.entity_type === "estate" ? "Estate" : "Parent plat"}
                  </span>
                  <span>·</span>
                  <Link
                    href={`/subdivisions/${encodeURIComponent(entry.parent_subdivision.id)}`}
                    className="text-accent-purple hover:underline"
                  >
                    {entry.parent_subdivision.name}
                  </Link>
                </div>
              )}

              {/* Subdivision name */}
              <div className="flex items-baseline gap-2">
                <Link
                  href={`/subdivisions/${encodeURIComponent(entry.subdivision.id)}`}
                  className="text-sm font-semibold text-text-primary hover:text-accent-purple transition-colors"
                >
                  {entry.subdivision.name}
                </Link>
                {entry.year && (
                  <span className="text-xs text-text-muted">{entry.year}</span>
                )}
              </div>

              {/* Historical lots */}
              {entry.lots.length > 0 && (
                <div className="space-y-1 pl-0">
                  {entry.lots.map((lot, i) => (
                    <div key={lot.id + i} className="flex flex-wrap items-baseline gap-x-3 text-xs">
                      <span className="text-text-secondary">
                        {lot.lot_number && lot.block_number
                          ? `Lot ${lot.lot_number}, Block ${lot.block_number}`
                          : lot.lot_number
                          ? `Lot ${lot.lot_number}`
                          : lot.block_number
                          ? `Block ${lot.block_number}`
                          : "Lot / block: needs verification"}
                      </span>
                      {lot.document_date && (
                        <span className="text-text-muted">Doc recorded {lot.document_date}</span>
                      )}
                    </div>
                  ))}
                  {isMultiLot && (
                    <p className="text-xs text-text-muted italic mt-1">
                      Multiple historical lots combined into this modern parcel.
                    </p>
                  )}
                </div>
              )}

              {/* Source + confidence row */}
              <div className="flex flex-wrap gap-x-4 text-xs text-text-muted pt-0.5 border-t border-surface-border">
                {entry.lots[0]?.source_type && (
                  <span>Source: {entry.lots[0].source_type}</span>
                )}
                <span>
                  Confidence: {entry.subdivision.confidence_level}
                  <span
                    className="ml-1 cursor-help select-none"
                    title={CONFIDENCE_TOOLTIP}
                    aria-label={`What does this mean? ${CONFIDENCE_TOOLTIP}`}
                  >
                    (?)
                  </span>
                </span>
              </div>

              {/* Quality warnings */}
              {hasMissingLotBlock && (
                <p className="text-xs text-amber-400/80">
                  Lot and block number not yet captured - needs verification.
                </p>
              )}
              {entry.subdivision.geometry_status === "not_started" && (
                <p className="text-xs text-text-muted italic">
                  Boundary map coming soon.
                </p>
              )}
              {!entry.subdivision.recorded_year && (
                <p className="text-xs text-text-muted italic">
                  Plat recording date: needs verification.
                </p>
              )}
            </div>
          );
        })}
      </div>
      <InlineSourceNote className="mt-2">
        Legal descriptions sourced from deed records. Historic lot numbers reflect original subdivision plats; modern parcel boundaries may differ.
      </InlineSourceNote>
    </section>
  );
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  exact_or_near_exact:        "Exact match",
  parcel_contains_lot:        "Parcel contains lot",
  lot_contains_parcel:        "Lot contains parcel",
  parcel_part_of_lot:         "Partial match",
  parcel_spans_multiple_lots: "Spans multiple lots",
  ambiguous:                  "Approximate match",
};

function LandAncestryPanel({ data }: { data: LandAncestryData }) {
  const lotLabel =
    data.lot_number && data.block_number ? `Lot ${data.lot_number}, Block ${data.block_number}`
    : data.lot_number                    ? `Lot ${data.lot_number}`
    : data.block_number                  ? `Block ${data.block_number}`
    : null;

  // subdivision_id is non-null only when the PAGE_SUBREF has been resolved to a
  // named subdivision. When null, subdivision_name holds the raw PAGE_SUBREF code.
  const isResolved = Boolean(data.subdivision_id);
  const overlapPct = data.overlap_pct_of_parcel != null
    ? Math.round(data.overlap_pct_of_parcel * 10) / 10
    : null;
  const relLabel = data.relationship_type
    ? (RELATIONSHIP_LABELS[data.relationship_type] ?? data.relationship_type)
    : null;

  return (
    <section>
      <h2 className="section-heading">Original plat lot</h2>
      <div className="bg-surface-card border border-surface-border rounded-lg p-4">
        <div className="flex items-start gap-3">
          <SubdivisionIcon size={16} strokeWidth={1.8} className="text-text-muted shrink-0 mt-0.5" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            {lotLabel && (
              <p className="text-sm font-semibold text-text-primary mb-0.5">{lotLabel}</p>
            )}

            {isResolved && data.subdivision_id ? (
              <Link
                href={`/subdivisions/${encodeURIComponent(data.subdivision_id)}`}
                className="text-sm text-accent-purple hover:underline"
              >
                {data.subdivision_name}
              </Link>
            ) : data.subdivision_name ? (
              <p className="text-sm text-text-secondary">
                Plat book ref: <span className="font-mono">{data.normalized_subdivision_name ?? data.subdivision_name}</span>
              </p>
            ) : null}

            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-2 text-xs text-text-muted">
              {overlapPct != null && (
                <span>{overlapPct}% of parcel covered by this lot</span>
              )}
              {relLabel && <span>{relLabel}</span>}
              {data.match_confidence && (
                <span>Confidence: {data.match_confidence}</span>
              )}
            </div>
          </div>
        </div>
      </div>
      <InlineSourceNote className="mt-2">
        {[
          data.source_name ?? "Cook County GIS Lots layer",
          "Spatially matched using PostGIS",
          !isResolved && data.normalized_subdivision_name
            ? "Subdivision name pending Cook County Recorder lookup"
            : null,
        ].filter(Boolean).join(" · ")}
      </InlineSourceNote>
    </section>
  );
}

const NR_EVAL_LABELS: Record<string, string> = {
  C: "Contributing structure",
  NC: "Non-contributing structure",
  IE: "Individually eligible",
};

const ARCH_CLASS_LABELS: Record<string, string> = {
  A: "High architectural significance",
  B: "Notable architectural significance",
  C: "Moderate architectural significance",
};

function HargisSurveySection({ records }: { records: HargisRecord[] }) {
  if (!records.length) return null;
  return (
    <section>
      <h2 className="section-heading">Historic architecture survey</h2>
      <p className="text-xs text-text-muted mb-3">
        From the Illinois Historic Architectural Resources Geographic Information System (HARGIS), Illinois State Historic Preservation Office.
      </p>
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
                  {r.record_name ?? `HARGIS #${r.refnum}`}
                </p>
                {r.location_text && (
                  <p className="text-xs text-text-secondary mt-0.5">
                    Surveyed at: {r.location_text}
                  </p>
                )}
                {r.arch_class && (
                  <p className="text-xs text-text-secondary mt-0.5">
                    {ARCH_CLASS_LABELS[r.arch_class]
                      ? `${ARCH_CLASS_LABELS[r.arch_class]} (class ${r.arch_class})`
                      : `Architectural class: ${r.arch_class}`}
                  </p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                  {r.nr_evaluation && (
                    <span className="text-xs text-text-muted">
                      National Register: {NR_EVAL_LABELS[r.nr_evaluation] ?? `Code ${r.nr_evaluation}`}
                    </span>
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
      <InlineSourceNote className="mt-2">Survey locations are approximate spatial matches; the surveyed structure may be adjacent to this parcel.</InlineSourceNote>
    </section>
  );
}

function buildPropertyStory(
  yearBuilt: number | null,
  subdivisionName: string | null,
  neighborhoodLabel: string | null,
): string | null {
  if (!yearBuilt && !subdivisionName) return null;

  if (yearBuilt) {
    if (subdivisionName) {
      return `This home was built in ${yearBuilt} in the ${subdivisionName} subdivision.`;
    }
    if (neighborhoodLabel) {
      return `This home was built in ${yearBuilt} in the ${neighborhoodLabel} neighborhood.`;
    }
    return `This home was built in ${yearBuilt}.`;
  }

  return `This property is part of the ${subdivisionName} subdivision.`;
}

// Decade ranges within which the neighborhood era label is meaningful for a specific property.
// A home built outside these bounds should fall through to the year-based fallbacks below.
const NEIGHBORHOOD_ERA_YEAR_RANGE: Record<string, [number, number]> = {
  uptown_park_ridge: [1860, 1939],
  northeast:         [1900, 1949],
  central:           [1910, 1969],
  northwest_park:    [1930, 1979],
  south_park:        [1940, 1989],
};

function getEraContextNote(
  yearBuilt: number | null,
  localSlug: string | null,
  officialSlug: string | null,
): string | null {
  if (!yearBuilt) return null;
  const slug = localSlug ?? officialSlug;
  if (slug && NEIGHBORHOOD_ERA_LABELS[slug]) {
    const range = NEIGHBORHOOD_ERA_YEAR_RANGE[slug];
    if (!range || (yearBuilt >= range[0] && yearBuilt <= range[1])) {
      return `Built during the ${NEIGHBORHOOD_ERA_LABELS[slug].toLowerCase()}.`;
    }
  }
  if (yearBuilt < 1890) return "Built during Park Ridge's pioneer era.";
  if (yearBuilt < 1920) return "Built during Park Ridge's early growth period.";
  if (yearBuilt < 1940) return "Built during Park Ridge's interwar period.";
  if (yearBuilt < 1960) return "Built during the postwar era.";
  if (yearBuilt < 1980) return "Built during the mid-century period.";
  if (yearBuilt < 2000) return "Built in the late 20th century.";
  return "Built in the modern era.";
}

function buildQuickSummary({
  address,
  yearBuilt,
  buildingSqft,
  latestSaleYear,
  latestSalePrice,
  subdivisionName,
  neighborhoodLabel,
  hargisCount,
  assessmentTimeline,
}: {
  address: string | null;
  yearBuilt: number | null;
  buildingSqft: number | null;
  latestSaleYear: number | null;
  latestSalePrice: number | null;
  subdivisionName: string | null;
  neighborhoodLabel: string | null;
  hargisCount: number;
  assessmentTimeline: AssessmentPoint[];
}): string | null {
  if (!yearBuilt || !latestSaleYear) return null;
  if (!subdivisionName && !neighborhoodLabel) return null;

  const sqftPart = buildingSqft && buildingSqft > 0 ? `, ${formatSqft(buildingSqft)}` : "";
  const firstLine = address
    ? `${address}, built in ${yearBuilt}${sqftPart}.`
    : `Built in ${yearBuilt}${sqftPart}.`;

  const pricePart = latestSalePrice ? ` for ${formatCurrency(latestSalePrice)}` : "";
  const saleLine = `Most recently sold in ${latestSaleYear}${pricePart}.`;

  let locationLine = "";
  if (subdivisionName && neighborhoodLabel) {
    locationLine = `Part of the ${subdivisionName} subdivision in the ${neighborhoodLabel} neighborhood.`;
  } else if (subdivisionName) {
    locationLine = `Part of the ${subdivisionName} subdivision.`;
  } else {
    locationLine = `Located in the ${neighborhoodLabel} neighborhood.`;
  }

  const parts = [firstLine, saleLine, locationLine];

  if (hargisCount > 0) {
    parts.push("Documented in the Illinois Historic Architecture Survey.");
  }
  if (assessmentTimeline.length >= 2) {
    const first = assessmentTimeline[0];
    const last = assessmentTimeline[assessmentTimeline.length - 1];
    if (first.value && last.value && first.year !== last.year) {
      parts.push(
        `Assessed value changed from ${formatCurrency(first.value)} to ${formatCurrency(last.value)} between ${first.year} and ${last.year}.`
      );
    }
  }

  return parts.join("\n");
}

export function PropertyDetailContent({ pin }: Props) {
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getPropertyDetail>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryCopied, setSummaryCopied] = useState(false);

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
  const sales = detail.sales ?? [];
  const permits = detail.permits ?? [];
  const hargisRecords = detail.hargisRecords ?? [];
  const landLineage = detail.landLineage ?? [];
  const landAncestry = detail.landAncestry ?? null;
  const appealYears = detail.appealYears ?? [];

  // Parse assessed_value_timeline JSONB (may be pre-parsed object or string)
  let assessmentTimeline: AssessmentPoint[] = [];
  const rawTimeline = props.assessed_value_timeline;
  if (rawTimeline) {
    try {
      const parsed = typeof rawTimeline === "string" ? JSON.parse(rawTimeline) : rawTimeline;
      if (Array.isArray(parsed)) assessmentTimeline = parsed as AssessmentPoint[];
    } catch { /* ignore parse errors */ }
  }

  // Use actual event table counts and most-recent values; more complete than parcel aggregates
  const actualSaleCount = sales.length;
  const latestPermitYear = props.latest_permit_year as number | null;
  const mostRecentSale = sales[0] ?? null;
  const latestSaleYear = mostRecentSale?.sale_date
    ? new Date(mostRecentSale.sale_date).getFullYear()
    : (props.latest_sale_year as number | null);
  const latestSalePrice = mostRecentSale?.sale_price ?? (props.latest_sale_price as number | null);

  // Feed timeline the corrected most-recent-sale values
  const propsForTimeline = {
    ...(props as Record<string, unknown>),
    latest_sale_year: latestSaleYear,
    latest_sale_price: latestSalePrice,
  };
  const timeline = buildTimelineEvents(propsForTimeline, detail.subdivision, detail.sales, detail.permits);

  const vitals: IconRowItem[] = [
    { icon: YearBuiltIcon, label: "Year built", value: formatYear(props.year_built) },
    { icon: SizeIcon,      label: "Building size", value: formatSqft(props.building_sqft) },
    { icon: LotIcon,       label: "Lot size", value: formatSqft(props.land_sqft) },
    { icon: AssessmentIcon, label: "Latest assessed value", value: formatCurrency(props.latest_assessed_total) },
  ];

  const missingGaps: string[] = [];
  if (!props.year_built) missingGaps.push("Build year not in assessor records");
  if (!detail.subdivision && !landLineage.length) missingGaps.push("Recorded plat not yet identified");
  if (!permitCount || permitCount === 0) missingGaps.push("No permit history in dataset");
  if (actualSaleCount === 0) missingGaps.push("No recorded sales in dataset");

  const yearBuilt = props.year_built as number | null;
  const subdivisionName = detail.subdivision?.name
    ?? landLineage[0]?.subdivision?.name
    ?? null;
  const neighborhoodLabel = (
    (props.local_neighborhood_label as string | null)
    ?? (props.official_planning_neighborhood_label as string | null)
  );
  const neighborhoodSlug = (
    (props.local_neighborhood_slug as string | null)
    ?? (props.official_planning_neighborhood_slug as string | null)
  );
  const streetDisplayName = typeof props.street_name_normalized === "string"
    ? (props.street_name_normalized as string).toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
    : null;
  const propertyStory = buildPropertyStory(yearBuilt, subdivisionName, neighborhoodLabel ?? null);
  const eraContextNote = getEraContextNote(
    yearBuilt,
    (props.local_neighborhood_slug as string | null),
    (props.official_planning_neighborhood_slug as string | null),
  );
  const quickSummaryText = (yearBuilt && sales.length > 0 && (subdivisionName || neighborhoodLabel))
    ? buildQuickSummary({
        address: props.address ? formatAddress(props.address as string) : null,
        yearBuilt,
        buildingSqft: props.building_sqft as number | null,
        latestSaleYear,
        latestSalePrice,
        subdivisionName,
        neighborhoodLabel: neighborhoodLabel ?? null,
        hargisCount: hargisRecords.length,
        assessmentTimeline,
      })
    : null;

  const currentYear = new Date().getFullYear();
  const recentSaleCount = sales.filter((s) => {
    const year = s.sale_date
      ? new Date(s.sale_date).getFullYear()
      : s.sale_year ?? 0;
    return year >= currentYear - 10;
  }).length;

  const whatThisMeansBullets: string[] = [];
  if (detail.comparisons && detail.comparisons.length > 0) {
    const streetComp =
      detail.comparisons.find((c) => c.metric === "year_built" && c.scope === "street") ??
      detail.comparisons.find((c) => c.metric === "year_built");
    if (streetComp && streetComp.propertyValue !== null && streetComp.referenceValue !== null) {
      const diff = Math.abs(streetComp.propertyValue - streetComp.referenceValue);
      const scopeLabel =
        streetComp.scope === "street"
          ? "this street"
          : streetComp.scope === "neighborhood"
          ? "this neighborhood"
          : "Park Ridge";
      if (diff <= 5) {
        whatThisMeansBullets.push(
          `Built around the same time as most homes on ${scopeLabel} (median ${streetComp.referenceValue}).`
        );
      } else {
        const direction =
          streetComp.propertyValue < streetComp.referenceValue ? "older" : "newer";
        whatThisMeansBullets.push(
          `This home is ${diff} years ${direction} than the typical home on ${scopeLabel} (median ${streetComp.referenceValue}).`
        );
      }
    }
    if (assessmentTimeline.length >= 2) {
      const first = assessmentTimeline[0];
      const last = assessmentTimeline[assessmentTimeline.length - 1];
      if (first.value && last.value && first.year !== last.year) {
        const pct = Math.round(((last.value - first.value) / first.value) * 100);
        const dir = pct >= 0 ? "increased" : "decreased";
        whatThisMeansBullets.push(
          `Assessed value has ${dir} ${Math.abs(pct)}% from ${first.year} to ${last.year}.`
        );
      }
    }
    if (actualSaleCount > 0) {
      whatThisMeansBullets.push(
        `${actualSaleCount} recorded ${actualSaleCount === 1 ? "sale" : "sales"} on file since records began.`
      );
    }
  }

  if (hargisRecords.length > 0) {
    whatThisMeansBullets.push(
      "This property was documented in the Illinois Historic Architecture Survey, which noted its architectural significance."
    );
  }
  if (appealYears.length > 2) {
    whatThisMeansBullets.push(
      `This property has had ${appealYears.length} assessment appeals on record. Assessment appeals are filed by owners who believe the assessed value is too high.`
    );
  }
  if (recentSaleCount > 4) {
    whatThisMeansBullets.push(
      `This property has sold ${actualSaleCount} times since records began, which is above average for the area.`
    );
  }

  const questionsToConsider: string[] = [];
  if (permits.length === 0) {
    questionsToConsider.push(
      "No permits are in this dataset (records are available from 2018 onward). It may be worth asking about renovation history directly."
    );
  }
  if (recentSaleCount > 4) {
    questionsToConsider.push(
      "This property has sold frequently. It may be worth understanding the transaction history."
    );
  }
  if (!yearBuilt) {
    questionsToConsider.push(
      "The build year is not recorded in county data. A title search or building department inquiry may fill this gap."
    );
  }

  return (
    <div className="space-y-10">
      {/* Property story synthesis and era context */}
      {(propertyStory || eraContextNote) && (
        <div className="space-y-1">
          {propertyStory && (
            <p className="text-base text-text-secondary leading-relaxed">{propertyStory}</p>
          )}
          {eraContextNote && (
            <p className="text-sm text-text-muted">
              {eraContextNote}
              <span className="text-xs text-text-muted ml-1">(Inferred)</span>
            </p>
          )}
        </div>
      )}

      {/* Confidence + vitals */}
      <section>
        <div className="mb-4 flex flex-wrap items-start gap-3">
          <ConfidenceBadge level={confidence} showDescription />
          {props.is_teardown_rebuild && (
            <TeardownBadge confidence={props.teardown_confidence} />
          )}
        </div>
        <IconRow items={vitals} />
      </section>

      {/* Quick summary for agents and shareable use */}
      {quickSummaryText && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <h2 className="section-heading !mb-0">Agent summary</h2>
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-accent-purple/10 text-accent-purple px-2 py-0.5 rounded">
              Shareable
            </span>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
              {quickSummaryText}
            </p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(quickSummaryText).then(() => {
                  setSummaryCopied(true);
                  setTimeout(() => setSummaryCopied(false), 2000);
                });
              }}
              className="mt-3 text-xs text-accent-purple hover:underline"
            >
              {summaryCopied ? "Copied!" : "Copy to clipboard"}
            </button>
          </div>
        </section>
      )}

      {/* Street context link */}
      {props.street_name_normalized && (
        <div>
          <Link
            href={`/streets/${encodeURIComponent(props.street_name_normalized as string)}`}
            className="inline-flex items-center gap-1.5 text-sm text-accent-purple hover:underline"
          >
            <StreetIcon size={13} strokeWidth={1.8} aria-hidden="true" />
            View all properties on this street
          </Link>
        </div>
      )}

      {/* PIN decomposition */}
      <section>
        <h2 className="section-heading">Parcel ID (PIN)</h2>
        <PinBreakdown props={props as Record<string, unknown>} />
        <div className="mt-2 flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs text-text-muted">Cook County 14-digit PIN: township · section · block · parcel · unit</p>
          {props.pin_normalized && (
            <a
              href={`https://crs.cookcountyclerkil.gov/Search/ResultByPin?id1=${props.pin_normalized}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-accent-purple hover:underline shrink-0"
            >
              <ExternalLinkIcon size={11} strokeWidth={1.8} aria-hidden="true" />
              Cook County Recorder
            </a>
          )}
        </div>
      </section>

      {/* Neighborhoods */}
      {(props.official_planning_neighborhood_id || props.business_district_id || props.local_neighborhood_id) && (
        <section>
          <h2 className="section-heading">Geographic context</h2>
          <p className="text-sm text-text-secondary mb-3">This property sits within overlapping planning districts, business areas, and local neighborhoods.</p>
          <div className="space-y-2">
            {props.official_planning_neighborhood_id && props.official_planning_neighborhood_slug && (
              <NeighborhoodChip
                label={(props.official_planning_neighborhood_label as string | null) ?? (props.official_planning_neighborhood_id as string)}
                slug={props.official_planning_neighborhood_slug as string}
                typeLabel="Official Planning"
              />
            )}
            {props.business_district_id && props.business_district_slug && (
              <NeighborhoodChip
                label={(props.business_district_label as string | null) ?? (props.business_district_id as string)}
                slug={props.business_district_slug as string}
                typeLabel="Business District"
              />
            )}
            {props.local_neighborhood_id && props.local_neighborhood_slug && (
              <NeighborhoodChip
                label={(props.local_neighborhood_label as string | null) ?? (props.local_neighborhood_id as string)}
                slug={props.local_neighborhood_slug as string}
                typeLabel="Local Name"
              />
            )}
          </div>
        </section>
      )}

      {/* Property timeline */}
      {timeline.length > 0 && (
        <section>
          <h2 className="section-heading">Property timeline</h2>
          <p className="text-sm text-text-muted mb-3">Key moments in this property's recorded history, from the original plat to the most recent transaction.</p>
          <PropertyTimeline events={timeline} />
        </section>
      )}

      {/* Sale history - combined chart and list */}
      <SaleHistorySection
        sales={sales}
        chartSlot={sales.some((s) => s.sale_price != null && s.sale_price > 0) ? <SalesPriceChart sales={sales} /> : undefined}
      />

      {/* Assessment value chart */}
      {assessmentTimeline.length >= 2 && (
        <section>
          <h2 className="section-heading">Assessed value history</h2>
          <AssessmentChart
              timeline={assessmentTimeline}
              appealYears={appealYears}
              totalReduction={props.total_assessment_reduction as number | null}
            />
          <InlineSourceNote className="mt-2">Cook County Assessor certified totals by assessment year</InlineSourceNote>
        </section>
      )}

      {/* Individual permit events */}
      <PermitHistorySection permits={permits} />

      {/* HARGIS historic survey records */}
      <HargisSurveySection records={hargisRecords} />

      {/* Land lineage (deed-sourced lot/block/subdivision data) */}
      {landLineage.length > 0 ? (
        <LandLineageSection lineage={landLineage} />
      ) : detail.subdivision ? (
        /* Fallback: simple recorded plat block when no lineage data yet */
        <section>
          <h2 className="section-heading">Recorded plat</h2>
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
      ) : null}

      {/* GIS plat lot — spatial match from Cook County GIS Lots layer */}
      {landAncestry && <LandAncestryPanel data={landAncestry} />}

      {/* Deed record */}
      {props.deed_notes && (
        <section>
          <h2 className="section-heading">Deed Record</h2>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <p className="text-sm text-text-secondary font-mono leading-relaxed whitespace-pre-wrap">
              {props.deed_notes}
            </p>
          </div>
        </section>
      )}

      {/* How this property compares */}
      {detail.comparisons && detail.comparisons.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ComparisonIcon size={14} strokeWidth={1.8} className="text-text-muted" aria-hidden="true" />
            <h2 className="section-heading !mb-0">How this property compares</h2>
          </div>
          <ComparisonList rows={detail.comparisons} />
        </section>
      )}

      {/* What this means */}
      {whatThisMeansBullets.length > 0 && (
        <section>
          <h2 className="section-heading">What this means</h2>
          <ul className="space-y-2">
            {whatThisMeansBullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-text-secondary">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent-purple shrink-0" aria-hidden="true" />
                {b}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* What we don't know yet */}
      {missingGaps.length > 0 && (
        <section>
          <h2 className="section-heading">What we don't know yet</h2>
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

      {/* Questions to consider */}
      {questionsToConsider.length > 0 && (
        <section>
          <h2 className="section-heading">Questions to consider (based on available records)</h2>
          <ul className="space-y-2">
            {questionsToConsider.map((q, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-text-secondary">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-text-muted shrink-0" aria-hidden="true" />
                {q}
              </li>
            ))}
          </ul>
          <p className="text-xs text-text-muted mt-3 italic">
            These are observations from county records, not legal or appraisal advice.
          </p>
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

      {/* Explore more */}
      {(props.street_name_normalized || (neighborhoodSlug && neighborhoodLabel)) && (
        <section>
          <h2 className="section-heading">Explore more</h2>
          <div className="space-y-2">
            {props.street_name_normalized && (
              <div>
                <Link
                  href={`/streets/${encodeURIComponent(props.street_name_normalized as string)}`}
                  className="text-accent-purple hover:underline"
                >
                  View all properties on {streetDisplayName ?? (props.street_name_normalized as string)} →
                </Link>
              </div>
            )}
            {neighborhoodSlug && neighborhoodLabel && (
              <div>
                <Link
                  href={`/neighborhoods/${encodeURIComponent(neighborhoodSlug)}`}
                  className="text-accent-purple hover:underline"
                >
                  Learn about the {neighborhoodLabel} neighborhood →
                </Link>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
