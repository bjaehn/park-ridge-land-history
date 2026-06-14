import { useMemo } from "react";
import { computePropertyComparisons, type ComparisonSet, type SingleComparison } from "../../lib/comparisons";
import type { ParcelFeature } from "../../lib/parcelTypes";

type ComparisonCardProps = {
  parcel: ParcelFeature;
  blockParcels: ParcelFeature[];
  neighborhoodParcels: ParcelFeature[];
  allParcels: ParcelFeature[];
};

export function ComparisonCard({
  parcel,
  blockParcels,
  neighborhoodParcels,
  allParcels
}: ComparisonCardProps) {
  const comparisons = useMemo(
    () => computePropertyComparisons(parcel, blockParcels, neighborhoodParcels, allParcels),
    [parcel, blockParcels, neighborhoodParcels, allParcels]
  );

  const hasAnyData =
    !comparisons.yearBuilt.block?.insufficient ||
    !comparisons.yearBuilt.neighborhood?.insufficient ||
    !comparisons.yearBuilt.city?.insufficient;

  return (
    <section className="comparison-card" aria-label="How this property compares">
      <h3 className="comparison-card-title">How this property compares</h3>

      <ComparisonGroup
        title="Year built"
        set={comparisons.yearBuilt}
        emptyText="Year built is not available for this property."
      />
      <ComparisonGroup
        title="Permit activity"
        set={comparisons.permits}
        emptyText="Permit data is not available."
        caveat="Permit records may be incomplete for older work."
      />
      <ComparisonGroup
        title="Sales activity"
        set={comparisons.sales}
        emptyText="Sales data is not available."
        caveat="Sales figures cover 1999 onward and may include non-market transfers."
      />
      <ComparisonGroup
        title="Assessed value"
        set={comparisons.assessedValue}
        emptyText="Assessment data is not available."
        caveat="Assessment values are assessor records, not market value."
      />

      {!hasAnyData && (
        <p className="comparison-card-empty">
          Not enough comparable properties are available for block-level comparisons.
        </p>
      )}
    </section>
  );
}

function ComparisonGroup({
  title,
  set,
  emptyText,
  caveat
}: {
  title: string;
  set: ComparisonSet;
  emptyText: string;
  caveat?: string;
}) {
  const rows: Array<{ scope: string; comparison: SingleComparison | null }> = [
    { scope: "Block", comparison: set.block },
    { scope: "Neighborhood", comparison: set.neighborhood },
    { scope: "Park Ridge", comparison: set.city }
  ];

  const allInsufficient = rows.every(r => !r.comparison || r.comparison.insufficient);

  return (
    <div className="cmp-group">
      <h4 className="cmp-group-title">{title}</h4>
      {allInsufficient ? (
        <p className="cmp-group-empty">{emptyText}</p>
      ) : (
        <ul className="cmp-rows">
          {rows.map(({ scope, comparison }) => (
            <li key={scope} className="cmp-row">
              <span className="cmp-scope">{scope}</span>
              <span className={`cmp-label ${comparison?.insufficient ? "cmp-insufficient" : ""}`}>
                {comparison?.label ?? "Not available"}
              </span>
            </li>
          ))}
        </ul>
      )}
      {caveat && !allInsufficient && (
        <p className="cmp-caveat">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          {caveat}
        </p>
      )}
    </div>
  );
}
