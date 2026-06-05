import { formatCurrency, formatFlags, formatNumber, formatYear } from "../lib/formatters";
import type { PermitPressureWindow } from "../lib/permitPressure";
import type { ParcelCollection, ParcelFeature } from "../lib/parcelTypes";
import { BlockStoryCard } from "./BlockStoryCard";
import { HomeSignals } from "./HomeSignals";
import { HouseEvolutionTimeline } from "./HouseEvolutionTimeline";
import { NearbyActivitySummary } from "./NearbyActivitySummary";

type ParcelDetailPanelProps = {
  parcel: ParcelFeature | null;
  parcels: ParcelCollection | null;
  permitPressureWindow: PermitPressureWindow;
  onClearSelection: () => void;
};

export function ParcelDetailPanel({
  parcel,
  parcels,
  permitPressureWindow,
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
        ["Improvements", formatNumber(properties.improvement_count)],
        ["Permits", formatNumber(properties.permit_count)],
        ["Sales since 1999", formatNumber(properties.sale_count)],
        ["Latest sale", formatSaleSummary(properties.latest_sale_year, properties.latest_sale_price)],
        ["Highest sale", formatCurrency(properties.max_sale_price)],
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
          <BlockStoryCard
            parcel={parcel}
            parcels={parcels}
            permitPressureWindow={permitPressureWindow}
          />
          <NearbyActivitySummary
            parcel={parcel}
            parcels={parcels}
            permitPressureWindow={permitPressureWindow}
          />
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
