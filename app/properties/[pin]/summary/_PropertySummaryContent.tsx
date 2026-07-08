"use client";

import { useState, useEffect } from "react";
import { StatGrid } from "@/components/ui/StatGrid";
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge";
import { TeardownBadge } from "@/components/ui/TeardownBadge";
import { LandmarkBadge } from "@/components/ui/LandmarkBadge";
import { LoadingSkeleton, EmptyState } from "@/components/ui/EmptyState";
import { CopyIcon } from "@/lib/icons";
import {
  formatSqft,
  formatCurrency,
  formatYear,
  formatCount,
  formatAddress,
  compareToScope,
  confidenceFor,
} from "@/lib/formatters";
import { getPropertyDetail } from "@/lib/data/properties";

type Props = { pin: string };

export function PropertySummaryContent({ pin }: Props) {
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getPropertyDetail>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getPropertyDetail(pin)
      .then(setDetail)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [pin]);

  if (loading) return <LoadingSkeleton rows={3} />;
  if (error) return <EmptyState heading="Unable to load property data" body="Try refreshing the page." />;
  if (!detail) return <EmptyState heading="Property record not found" body="This PIN may not exist in our dataset yet." />;

  const props = detail.properties;
  const confidence = confidenceFor({
    year_built: props.year_built,
    data_quality_flags: props.data_quality_flags,
    source_note: props.source_note,
    improvement_count: props.improvement_count,
  });

  const yearBuilt = props.year_built as number | null;
  const buildingSqft = props.building_sqft as number | null;
  const latestSaleYear = props.latest_sale_year as number | null;
  const latestSalePrice = props.latest_sale_price as number | null;
  const latestAssessedTotal = props.latest_assessed_total as number | null;
  const sales = detail.sales ?? [];
  const permits = detail.permits ?? [];
  const hargisRecords = detail.hargisRecords ?? [];
  const isTeardownRebuild = props.is_teardown_rebuild as boolean | null;
  const teardownConfidence = props.teardown_confidence as string | null;

  const vitals = [
    yearBuilt ? { value: formatYear(yearBuilt), label: "Year built" } : null,
    buildingSqft ? { value: formatSqft(buildingSqft), label: "Building" } : null,
    latestSaleYear
      ? {
          value: latestSalePrice ? formatCurrency(latestSalePrice) : formatYear(latestSaleYear),
          label: latestSalePrice ? `Sold ${latestSaleYear}` : "Last sold",
        }
      : null,
    latestAssessedTotal ? { value: formatCurrency(latestAssessedTotal), label: "Assessed" } : null,
  ].filter((v): v is { value: string; label: string } => v !== null);

  // loadComparisons() only ever populates year-built comparisons today (at
  // street/neighborhood/city scope), not the other ComparisonMetric values --
  // word this section accordingly rather than implying broader variety.
  const comparisonSentences = (detail.comparisons ?? [])
    .slice(0, 3)
    .map((row) => compareToScope(row.propertyValue, row.referenceValue, row.scope, row.metric));

  // One highlight fact, in priority order: landmark > teardown/rebuild > HARGIS.
  const highlight = detail.landmarkFact ? (
    <LandmarkBadge year={detail.landmarkFact.dateStart} />
  ) : isTeardownRebuild ? (
    <TeardownBadge confidence={teardownConfidence} />
  ) : hargisRecords.length > 0 ? (
    <p className="text-sm text-text-secondary">
      Documented in the Illinois Historic Architecture Survey.
    </p>
  ) : null;

  const address = formatAddress(props.address as string | null);
  const summaryLines = [
    address,
    yearBuilt ? `Built ${yearBuilt}${buildingSqft ? `, ${formatSqft(buildingSqft)}` : ""}.` : null,
    latestSaleYear ? `Last sold in ${latestSaleYear}${latestSalePrice ? ` for ${formatCurrency(latestSalePrice)}` : ""}.` : null,
    latestAssessedTotal ? `Currently assessed at ${formatCurrency(latestAssessedTotal)}.` : null,
    sales.length > 0 || permits.length > 0
      ? `${formatCount(sales.length, "recorded sale", "recorded sales")}, ${formatCount(permits.length, "permit", "permits")} on file.`
      : null,
    ...comparisonSentences,
    typeof window !== "undefined" ? `${window.location.origin}/properties/${encodeURIComponent(pin)}` : null,
  ].filter((line): line is string => Boolean(line));

  function handleCopy() {
    navigator.clipboard.writeText(summaryLines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-6">
      <ConfidenceBadge level={confidence} showDescription />

      {vitals.length > 0 && <StatGrid columns={Math.max(2, Math.min(vitals.length, 4)) as 2 | 3 | 4} stats={vitals} />}

      {highlight && <div>{highlight}</div>}

      {comparisonSentences.length > 0 && (
        <div>
          <h2 className="section-heading">How it compares by build year</h2>
          <ul className="space-y-1.5">
            {comparisonSentences.map((sentence, i) => (
              <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent-purple shrink-0" aria-hidden="true" />
                {sentence}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(sales.length > 0 || permits.length > 0) && (
        <p className="text-sm text-text-secondary">
          {formatCount(sales.length, "recorded sale", "recorded sales")} and{" "}
          {formatCount(permits.length, "permit", "permits")} on file.
        </p>
      )}

      <div className="print:hidden">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-purple hover:underline"
        >
          <CopyIcon size={16} strokeWidth={1.8} aria-hidden="true" />
          {copied ? "Copied!" : "Copy summary"}
        </button>
      </div>
    </div>
  );
}
