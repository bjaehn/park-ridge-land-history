import type { HotspotFeature } from "./hotspots";
import { parcelChangeLabels, type ParcelChangeFeature, type ParcelChangeType } from "./parcelChangeTypes";

export function parcelChangePopupHtml(properties: ParcelChangeFeature["properties"]): string {
  const changeType = properties.change_type as ParcelChangeType | undefined;
  const label = changeType ? parcelChangeLabels[changeType] ?? String(changeType) : "Unknown";
  return `
    <div class="parcel-popup">
      <h3>${escapeHtml(label)}</h3>
      <dl>
        ${popupRow("Old PIN", properties.old_pin || "None")}
        ${popupRow("New PIN", properties.new_pin || "None")}
        ${popupRow("Confidence", formatConfidence(properties.confidence))}
        ${popupRow("Years", formatChangeYears(properties.old_year, properties.new_year))}
        ${popupRow("Area change", formatAreaChange(properties.area_change_pct))}
      </dl>
    </div>
  `;
}

export function hotspotPopupHtml(properties: HotspotFeature["properties"]): string {
  return `
    <div class="parcel-popup">
      <h3>${escapeHtml(properties.title)}</h3>
      <p>${escapeHtml(properties.description)}</p>
      <dl>
        ${popupRow("Parcels", String(properties.parcel_count))}
        ${popupRow("Score", Math.round(properties.score).toLocaleString())}
      </dl>
    </div>
  `;
}

function popupRow(label: string, value: string): string {
  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function formatConfidence(confidence: string | null | undefined): string {
  if (!confidence) return "Unknown";
  return confidence.charAt(0).toUpperCase() + confidence.slice(1);
}

function formatChangeYears(oldYear: number | null | undefined, newYear: number | null | undefined): string {
  const oldLabel = typeof oldYear === "number" ? String(oldYear) : "Unknown";
  const newLabel = typeof newYear === "number" ? String(newYear) : "Unknown";
  return `${oldLabel} to ${newLabel}`;
}

function formatAreaChange(areaChangePct: number | null | undefined): string {
  if (typeof areaChangePct !== "number") return "Unknown";
  return `${areaChangePct.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
