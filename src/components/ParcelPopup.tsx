import type { ParcelProperties } from "../lib/parcelTypes";
import { formatFlags, formatNumber, formatYear } from "../lib/formatters";

type ParcelPopupProps = {
  properties: ParcelProperties;
};

export function parcelPopupHtml(properties: ParcelPopupProps["properties"]): string {
  const rows = [
    ["PIN", properties.pin_normalized || properties.pin_original || "Unknown"],
    ["Year built", formatYear(properties.year_built)],
    ["Decade", properties.decade_built || "Unknown"],
    ["Building sqft", formatNumber(properties.building_sqft)],
    ["Land sqft", formatNumber(properties.land_sqft)],
    ["Property class", properties.property_class || "Unknown"],
    ["Improvements", formatNumber(properties.improvement_count)],
    ["Flags", formatFlags(properties.data_quality_flags)]
  ];

  return `
    <div class="parcel-popup">
      <h3>${escapeHtml(properties.address || "Parcel details")}</h3>
      <dl>
        ${rows
          .map(
            ([label, value]) => `
              <div>
                <dt>${escapeHtml(label)}</dt>
                <dd>${escapeHtml(value)}</dd>
              </div>
            `
          )
          .join("")}
      </dl>
      <p>${escapeHtml(properties.source_note || "Cook County assessor and parcel data when available.")}</p>
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
