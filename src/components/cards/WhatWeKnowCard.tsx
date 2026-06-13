import { computePropertyConfidence } from "../../lib/propertyConfidence";
import { formatCurrency, formatNumber, formatYear } from "../../lib/formatters";
import type { ParcelProperties } from "../../lib/parcelTypes";
import { ConfidenceBadge } from "./ConfidenceBadge";

type WhatWeKnowCardProps = {
  properties: ParcelProperties;
};

export function WhatWeKnowCard({ properties }: WhatWeKnowCardProps) {
  const confidence = computePropertyConfidence(properties);

  const yearBuilt = formatYear(properties.year_built);
  const hasYearBuilt = typeof properties.year_built === "number";
  const permitCount = properties.permit_count ?? 0;
  const saleCount = properties.sale_count ?? 0;
  const latestAssessedTotal = properties.latest_assessed_total;
  const latestAssessedYear = properties.latest_assessed_year;
  const latestSalePrice = properties.latest_sale_price;
  const latestSaleYear = properties.latest_sale_year;
  const hasHistoricSurvey = (properties.hargis_record_count ?? 0) > 0;

  const missingItems: string[] = [];
  if (!hasYearBuilt) missingItems.push("year built");
  if (permitCount === 0) missingItems.push("permit records");
  if (saleCount === 0) missingItems.push("sale records");
  if (!latestAssessedTotal) missingItems.push("assessment records");

  return (
    <section className="wwk-card" aria-label="What we know about this property">
      <div className="wwk-header">
        <h3 className="wwk-title">What we know about this property</h3>
        <ConfidenceBadge
          level={confidence.level}
          label={confidence.label}
          explanation={confidence.explanation}
        />
      </div>

      <ul className="wwk-facts" aria-label="Key property facts">
        <li className="wwk-fact">
          <span className="wwk-fact-label">Year built</span>
          <span className="wwk-fact-value">
            {hasYearBuilt ? (
              <>{yearBuilt} <span className="wwk-fact-source">assessor record</span></>
            ) : (
              <span className="wwk-fact-unknown">Not confirmed</span>
            )}
          </span>
        </li>

        <li className="wwk-fact">
          <span className="wwk-fact-label">Permits on file</span>
          <span className="wwk-fact-value">
            {permitCount > 0 ? (
              <>{formatNumber(permitCount)}{properties.latest_permit_year ? `, latest ${properties.latest_permit_year}` : ""}</>
            ) : (
              <span className="wwk-fact-unknown">None found</span>
            )}
          </span>
        </li>

        <li className="wwk-fact">
          <span className="wwk-fact-label">Sales since 1999</span>
          <span className="wwk-fact-value">
            {saleCount > 0 ? (
              <>
                {formatNumber(saleCount)}
                {latestSaleYear ? `, latest ${latestSaleYear}` : ""}
                {latestSalePrice ? ` for ${formatCurrency(latestSalePrice)}` : ""}
              </>
            ) : (
              <span className="wwk-fact-unknown">None found</span>
            )}
          </span>
        </li>

        <li className="wwk-fact">
          <span className="wwk-fact-label">Latest assessment</span>
          <span className="wwk-fact-value">
            {latestAssessedTotal && latestAssessedYear ? (
              <>{formatCurrency(latestAssessedTotal)} in {latestAssessedYear} <span className="wwk-fact-source">assessor record</span></>
            ) : latestAssessedTotal ? (
              <>{formatCurrency(latestAssessedTotal)} <span className="wwk-fact-source">assessor record</span></>
            ) : (
              <span className="wwk-fact-unknown">Not available</span>
            )}
          </span>
        </li>

        {hasHistoricSurvey && (
          <li className="wwk-fact">
            <span className="wwk-fact-label">Historic survey</span>
            <span className="wwk-fact-value wwk-fact-highlight">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              Matched
              {properties.hargis_survey_date ? ` (surveyed ${properties.hargis_survey_date})` : ""}
            </span>
          </li>
        )}
      </ul>

      {missingItems.length > 0 && (
        <p className="wwk-gaps">
          Not found: {missingItems.join(", ")}. Records may exist but have not been linked to this property.
        </p>
      )}

      <p className="wwk-caveat">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        Confidence reflects data coverage only, not property quality or condition.
        {hasYearBuilt && " Year built is from assessor records and may differ from original construction records."}
      </p>
    </section>
  );
}
