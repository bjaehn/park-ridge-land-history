import { useState } from "react";
import { formatCurrency, formatFlags, formatNumber, formatYear } from "../lib/formatters";
import type { PermitPressureWindow } from "../lib/permitPressure";
import type { ParcelCollection, ParcelFeature } from "../lib/parcelTypes";
import { HouseRelatives } from "./HouseRelatives";
import { NearbyActivitySummary } from "./NearbyActivitySummary";
import { PropertyTimeline } from "./PropertyTimeline";

export type PropertyView = "timeline" | "relatives";

type ParcelDetailPanelProps = {
  parcel: ParcelFeature | null;
  parcels: ParcelCollection | null;
  permitPressureWindow: PermitPressureWindow;
  isLoadingDetail?: boolean;
  activeView: PropertyView;
  blockParcels?: ParcelFeature[];
  neighborhoodParcels?: ParcelFeature[];
  onSetActiveView: (view: PropertyView) => void;
  onSelectRelatedParcel: (feature: ParcelFeature) => void;
  onClearSelection: () => void;
};

const views: Array<{ id: PropertyView; label: string; icon: JSX.Element }> = [
  {
    id: "timeline",
    label: "Story",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    )
  },
  {
    id: "relatives",
    label: "Related homes",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    )
  }
];

export function ParcelDetailPanel({
  parcel,
  parcels,
  permitPressureWindow,
  isLoadingDetail = false,
  activeView,
  blockParcels = [],
  neighborhoodParcels = [],
  onSetActiveView,
  onSelectRelatedParcel,
  onClearSelection
}: ParcelDetailPanelProps) {
  const [factsOpen, setFactsOpen] = useState(false);
  const properties = parcel?.properties;

  if (!properties) return null;

  const rows: [string, string][] = [
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
    ["Assessment change", formatAssessmentChange(properties.first_assessed_year, properties.latest_assessed_year, properties.assessed_value_change_pct)],
    ["Appeals", formatAppealSummary(properties.appeal_count, properties.latest_appeal_year)],
    ["Selection", properties.primary_building_selection_method || "Unknown"],
    ["Flags", formatFlags(properties.data_quality_flags)]
  ];

  return (
    <section className="parcel-detail-section" aria-label="Property details">

      {/* Header */}
      <div className="parcel-header">
        <div className="parcel-header-main">
          <div className="parcel-header-address">{properties.address || "Selected parcel"}</div>
          <div className="parcel-header-meta">
            {properties.hargis_record_count ? <span className="parcel-chip parcel-chip-green">Historic survey</span> : null}
          </div>
        </div>
        <button className="parcel-clear-btn" type="button" onClick={onClearSelection} aria-label="Clear selection">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {isLoadingDetail && (
        <div className="parcel-loading">
          <span className="parcel-loading-dot" />
          Loading ancestry records…
        </div>
      )}

      {/* View toggle — just 2 views */}
      <div className="property-view-tabs" role="tablist">
        {views.map((view) => (
          <button
            key={view.id}
            className={`property-view-tab${activeView === view.id ? " is-active" : ""}`}
            type="button"
            role="tab"
            aria-selected={activeView === view.id}
            onClick={() => onSetActiveView(view.id)}
          >
            <span className="property-view-tab-icon">{view.icon}</span>
            {view.label}
          </button>
        ))}
      </div>

      {/* Story — the full unified scroll */}
      {activeView === "timeline" && (
        <div className="property-view-content">
          <PropertyTimeline
            properties={properties}
            parcel={parcel}
            blockParcels={blockParcels}
            neighborhoodParcels={neighborhoodParcels}
            allParcels={parcels?.features ?? []}
          />
          <NearbyActivitySummary parcel={parcel} parcels={parcels} permitPressureWindow={permitPressureWindow} />
        </div>
      )}

      {/* Related homes */}
      {activeView === "relatives" && (
        <div className="property-view-content">
          <HouseRelatives parcel={parcel} parcels={parcels} onSelectRelative={onSelectRelatedParcel} />
        </div>
      )}

      {/* Raw data — always accessible, collapsed by default */}
      <details
        className="property-facts-disclosure"
        open={factsOpen}
        onToggle={(e) => setFactsOpen((e.target as HTMLDetailsElement).open)}
      >
        <summary className="property-facts-summary">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          Raw property data
          <svg className="property-facts-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </summary>
        <dl className="detail-list">
          {rows.map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
          ))}
        </dl>
        <p className="quiet-note" style={{ padding: "6px 12px 10px" }}>{properties.source_note || "Cook County assessor and parcel data."}</p>
      </details>

    </section>
  );
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatSaleSummary(year?: number | null, price?: number | null): string {
  const y = formatYear(year); const p = formatCurrency(price);
  if (y === "Unknown" && p === "Unknown") return "Unknown";
  if (p === "Unknown") return y; if (y === "Unknown") return p;
  return `${y} - ${p}`;
}

function formatAssessmentSummary(year?: number | null, value?: number | null): string {
  const y = formatYear(year); const v = formatCurrency(value);
  if (y === "Unknown" && v === "Unknown") return "Unknown";
  if (y === "Unknown") return v; if (v === "Unknown") return y;
  return `${y} - ${v}`;
}

function formatAssessmentChange(firstYear?: number | null, latestYear?: number | null, percent?: number | null): string {
  if (typeof percent !== "number" || Number.isNaN(percent)) return "Unknown";
  const pct = `${Math.round(percent).toLocaleString()}%`;
  if (!firstYear || !latestYear || firstYear === latestYear) return pct;
  return `${pct} since ${firstYear}`;
}

function formatAppealSummary(count?: number | null, latestYear?: number | null): string {
  const n = count ?? 0;
  if (n === 0) return "None found";
  const y = formatYear(latestYear);
  return y === "Unknown" ? `${n.toLocaleString()} found` : `${n.toLocaleString()} found, latest ${y}`;
}

function historicSurveyRows(p: NonNullable<ParcelFeature["properties"]>): [string, string][] {
  if (!p.hargis_record_count) return [];
  const parts = [p.hargis_name || "HARGIS match", p.hargis_survey_date ? `surveyed ${p.hargis_survey_date}` : null, p.hargis_refnum ? `record ${p.hargis_refnum}` : null].filter(Boolean);
  const photos = p.hargis_photo_count ?? 0; const pdfs = p.hargis_pdf_count ?? 0;
  const mediaParts: string[] = [];
  if (photos) mediaParts.push(`${photos} photo${photos === 1 ? "" : "s"}`);
  if (pdfs) mediaParts.push(`${pdfs} PDF${pdfs === 1 ? "" : "s"}`);
  return [
    ["Historic survey", parts.join(" - ")],
    ["Style", p.hargis_arch_class || "Unknown"],
    ["Architect", p.hargis_architect || "Unknown"],
    ["Builder", p.hargis_builder || "Unknown"],
    ["Survey media", mediaParts.length ? mediaParts.join(", ") : "No linked media"]
  ];
}
