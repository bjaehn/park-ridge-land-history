import { formatFlags, formatNumber, formatYear } from "../lib/formatters";
import type { ParcelFeature } from "../lib/parcelTypes";

type ParcelDetailPanelProps = {
  parcel: ParcelFeature | null;
  onClearSelection: () => void;
};

export function ParcelDetailPanel({ parcel, onClearSelection }: ParcelDetailPanelProps) {
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
          <dl className="detail-list">
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p className="quiet-note">{properties.source_note || "Cook County assessor and parcel data."}</p>
        </>
      )}
    </section>
  );
}
