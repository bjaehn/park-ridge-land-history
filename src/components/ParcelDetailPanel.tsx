import { formatCurrency, formatFlags, formatNumber, formatYear } from "../lib/formatters";
import type { ParcelFeature } from "../lib/parcelTypes";
import { HomeSignals } from "./HomeSignals";
import { HouseEvolutionTimeline } from "./HouseEvolutionTimeline";

type ParcelDetailPanelProps = {
  parcel: ParcelFeature | null;
  onClearSelection: () => void;
};

export function ParcelDetailPanel({
  parcel,
  onClearSelection
}: ParcelDetailPanelProps) {
  const properties = parcel?.properties;
  const rows = properties
    ? [
        ["PIN", properties.pin_normalized || properties.pin_original || "Unknown"],
        ["Municipality", properties.municipality || "Unknown"],
        ["Year built", formatYear(properties.year_built)],
        ["Decade", properties.decade_built || "Unknown"],
        ["Building sqft", formatNumber(properties.building_sqft)],
        ["Land sqft", formatNumber(properties.land_sqft)],
        ["Property class", properties.property_class || "Unknown"],
        ...historicSurveyRows(properties),
        ["Improvements", formatNumber(properties.improvement_count)],
        ["Permits", formatNumber(properties.permit_count)],
        ["Sales since 1999", formatNumber(properties.sale_count)],
        ["Latest sale", formatSaleSummary(properties.latest_sale_year, properties.latest_sale_price)],
        ["Highest sale", formatCurrency(properties.max_sale_price)],
        ["Assessed value", formatAssessmentSummary(properties.latest_assessed_year, properties.latest_assessed_total)],
        [
          "Assessment change",
          formatAssessmentChange(
            properties.first_assessed_year,
            properties.latest_assessed_year,
            properties.assessed_value_change_pct
          )
        ],
        ["Appeals", formatAppealSummary(properties.appeal_count, properties.latest_appeal_year)],
        ["Nearest park", formatNamedDistance(properties.nearest_park_name, properties.nearest_park_dist_ft)],
        ["Nearest Metra", formatNamedDistance(properties.nearest_metra_stop_name, properties.nearest_metra_stop_dist_ft)],
        [
          "Nearest trail",
          formatNamedDistance(properties.nearest_bike_trail_name, properties.nearest_bike_trail_dist_ft)
        ],
        [
          "Nearby distress",
          formatForeclosureContext(
            properties.foreclosure_count_half_mile_5yr,
            properties.foreclosure_per_1000_half_mile_5yr
          )
        ],
        ["Selection", properties.primary_building_selection_method || "Unknown"],
        ["Flags", formatFlags(properties.data_quality_flags)]
      ]
    : [];

  return (
    <section className="panel-section parcel-detail-section" aria-label="Selected parcel details">
      <div className="section-heading">
        <h2>Parcel</h2>
        {parcel && (
          <button className="text-button" type="button" onClick={onClearSelection}>
            Clear
          </button>
        )}
      </div>

      {!properties && <p className="quiet-note parcel-empty">No parcel selected</p>}

      {properties && (
        <>
          <h3 className="detail-title">{properties.address || "Parcel details"}</h3>
          <HomeSignals properties={properties} />
          <dl className="detail-list">
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <HouseEvolutionTimeline properties={properties} />
          <p className="quiet-note">{properties.source_note || "Cook County assessor and parcel data."}</p>
        </>
      )}
    </section>
  );
}

function formatSaleSummary(year?: number | null, price?: number | null): string {
  const yearLabel = formatYear(year);
  const priceLabel = formatCurrency(price);
  if (yearLabel === "Unknown" && priceLabel === "Unknown") return "Unknown";
  if (priceLabel === "Unknown") return yearLabel;
  if (yearLabel === "Unknown") return priceLabel;
  return `${yearLabel} - ${priceLabel}`;
}

function formatAssessmentSummary(year?: number | null, value?: number | null): string {
  const yearLabel = formatYear(year);
  const valueLabel = formatCurrency(value);
  if (yearLabel === "Unknown" && valueLabel === "Unknown") return "Unknown";
  if (yearLabel === "Unknown") return valueLabel;
  if (valueLabel === "Unknown") return yearLabel;
  return `${yearLabel} - ${valueLabel}`;
}

function formatAssessmentChange(
  firstYear?: number | null,
  latestYear?: number | null,
  percent?: number | null
): string {
  if (typeof percent !== "number" || Number.isNaN(percent)) return "Unknown";
  const percentLabel = `${Math.round(percent).toLocaleString()}%`;
  if (!firstYear || !latestYear || firstYear === latestYear) return percentLabel;
  return `${percentLabel} since ${firstYear}`;
}

function formatAppealSummary(count?: number | null, latestYear?: number | null): string {
  const appealCount = count ?? 0;
  if (appealCount === 0) return "None found";
  const latestLabel = formatYear(latestYear);
  if (latestLabel === "Unknown") return `${appealCount.toLocaleString()} found`;
  return `${appealCount.toLocaleString()} found, latest ${latestLabel}`;
}

function formatNamedDistance(name?: string | null, distance?: number | null): string {
  if (typeof distance !== "number" || Number.isNaN(distance)) return name || "Unknown";
  const distanceLabel = formatDistance(distance);
  if (!name) return distanceLabel;
  return `${name} - ${distanceLabel}`;
}

function formatForeclosureContext(count?: number | null, rate?: number | null): string {
  if (typeof count !== "number" && typeof rate !== "number") return "Unknown";
  const countLabel = typeof count === "number" ? `${Math.round(count).toLocaleString()} nearby` : "Unknown count";
  const rateLabel = typeof rate === "number" ? `${rate.toFixed(1)} per 1,000 PINs` : "Unknown rate";
  return `${countLabel} - ${rateLabel}`;
}

function formatDistance(value: number): string {
  if (value >= 5280) return `${(value / 5280).toFixed(1)} mi`;
  return `${Math.round(value).toLocaleString()} ft`;
}

function historicSurveyRows(properties: NonNullable<ParcelFeature["properties"]>): string[][] {
  if (!properties.hargis_record_count) return [];
  return [
    ["Historic survey", formatHistoricSurveySummary(properties)],
    ["Style", properties.hargis_arch_class || "Unknown"],
    ["Architect", properties.hargis_architect || "Unknown"],
    ["Builder", properties.hargis_builder || "Unknown"],
    ["Survey media", formatSurveyMedia(properties.hargis_photo_count, properties.hargis_pdf_count)]
  ];
}

function formatHistoricSurveySummary(properties: NonNullable<ParcelFeature["properties"]>): string {
  const parts = [
    properties.hargis_name || "Illinois HARGIS match",
    properties.hargis_survey_date ? `surveyed ${properties.hargis_survey_date}` : null,
    properties.hargis_refnum ? `record ${properties.hargis_refnum}` : null
  ].filter(Boolean);
  return parts.join(" - ");
}

function formatSurveyMedia(photoCount?: number | null, pdfCount?: number | null): string {
  const photos = photoCount ?? 0;
  const pdfs = pdfCount ?? 0;
  if (!photos && !pdfs) return "No linked media";
  const parts: string[] = [];
  if (photos) parts.push(`${photos.toLocaleString()} photo${photos === 1 ? "" : "s"}`);
  if (pdfs) parts.push(`${pdfs.toLocaleString()} PDF${pdfs === 1 ? "" : "s"}`);
  return parts.join(", ");
}
