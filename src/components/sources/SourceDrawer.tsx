import { useState } from "react";
import { X, ExternalLink, Database } from "lucide-react";
import type { ParcelFeature } from "../../lib/parcelTypes";
import { formatPin } from "../../lib/formatters";
import "./SourceDrawer.css";

type Source = {
  id: string;
  label: string;
  description: string;
  url?: string;
  recordCount?: number;
  lastUpdated?: string;
};

function getPropertySources(parcel: ParcelFeature): Source[] {
  const props = parcel.properties;
  const sources: Source[] = [];

  if (props.permit_count != null) {
    sources.push({
      id: "cook-permits",
      label: "Cook County Assessor Permits",
      description: `${props.permit_count} permit records on file (2019–present). Cook County Assessor's Socrata API does not publish pre-2019 permit data.`,
      url: "https://datacatalog.cookcountyil.gov/",
      recordCount: props.permit_count ?? undefined,
    });
  }

  if (props.sale_count != null && props.sale_count > 0) {
    sources.push({
      id: "cook-sales",
      label: "Cook County Assessor Sales",
      description: `${props.sale_count} sale records on file. Sourced from Cook County Open Data.`,
      url: "https://datacatalog.cookcountyil.gov/",
      recordCount: props.sale_count ?? undefined,
    });
  }

  if (props.assessed_year_count != null && props.assessed_year_count > 0) {
    sources.push({
      id: "cook-assessments",
      label: "Cook County Assessor Valuations",
      description: `${props.assessed_year_count} assessment years on file. Covers assessed value from ${props.first_assessed_year ?? "?"} to ${props.latest_assessed_year ?? "?"}.`,
      url: "https://datacatalog.cookcountyil.gov/",
      recordCount: props.assessed_year_count ?? undefined,
    });
  }

  if (props.hargis_record_count != null && props.hargis_record_count > 0) {
    sources.push({
      id: "hargis-survey",
      label: "Hargis Historic Architectural Survey",
      description: `${props.hargis_record_count} historic survey record(s) matched to this property. Survey conducted by the Park Ridge Historic Preservation Commission.`,
      recordCount: props.hargis_record_count ?? undefined,
    });
  }

  if (props.paper_trail_record_count != null && props.paper_trail_record_count > 0) {
    sources.push({
      id: "cook-recorder",
      label: "Cook County Recorder of Deeds",
      description: `${props.paper_trail_record_count} deed/recorder record(s) researched for this property.`,
      url: "https://www.cookcountyil.gov/agency/clerk",
    });
  }

  if (props.civic_record_count != null && props.civic_record_count > 0) {
    sources.push({
      id: "civic-records",
      label: "Park Ridge Civic Records",
      description: `${props.civic_record_count} civic record(s) including design review, landmarks, and city records.`,
    });
  }

  if (!sources.length) {
    sources.push({
      id: "cook-parcel",
      label: "Cook County Parcel Universe",
      description: "Base parcel record from Cook County Assessor's Office parcel universe dataset.",
      url: "https://datacatalog.cookcountyil.gov/",
    });
  }

  return sources;
}

type Props = {
  parcel: ParcelFeature;
  open: boolean;
  onClose: () => void;
};

export function SourceDrawer({ parcel, open, onClose }: Props) {
  if (!open) return null;

  const sources = getPropertySources(parcel);
  const pin = parcel.properties.pin_normalized || parcel.properties.pin_original || "—";

  return (
    <div className="source-drawer-overlay" onClick={onClose}>
      <div
        className="source-drawer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Data sources"
        aria-modal="true"
      >
        <div className="source-drawer-header">
          <div className="source-drawer-title-group">
            <Database size={16} strokeWidth={2} aria-hidden="true" />
            <div>
              <h3 className="source-drawer-title">Data Sources</h3>
              <p className="source-drawer-subtitle">PIN {formatPin(pin)}</p>
            </div>
          </div>
          <button className="source-drawer-close" onClick={onClose} aria-label="Close sources panel">
            <X size={16} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>

        <div className="source-drawer-body">
          <p className="source-drawer-intro">
            Every fact shown on this page is drawn from the sources below. Claims not supported
            by these sources are not shown.
          </p>

          <div className="source-list">
            {sources.map((source) => (
              <div key={source.id} className="source-item">
                <div className="source-item-header">
                  <strong className="source-item-label">{source.label}</strong>
                  {source.url && (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="source-item-link"
                      aria-label={`Open ${source.label} (opens in new tab)`}
                    >
                      <ExternalLink size={12} strokeWidth={2.2} aria-hidden="true" />
                    </a>
                  )}
                </div>
                <p className="source-item-desc">{source.description}</p>
                {source.recordCount != null && (
                  <span className="source-item-count">{source.recordCount} records</span>
                )}
              </div>
            ))}
          </div>

          <p className="source-drawer-disclaimer">
            Data limitations: Assessment years may have gaps. Permit records may be incomplete
            for older permits. Sale prices may be missing for non-market transfers.
            Year built data may reflect assessment records, not construction records.
          </p>
        </div>
      </div>
    </div>
  );
}

export function CitationBadge({ onClick }: { onClick: () => void }) {
  return (
    <button className="citation-badge" onClick={onClick} aria-label="View data sources">
      <Database size={9} strokeWidth={2.5} aria-hidden="true" />
      sources
    </button>
  );
}

export function useSourceDrawer() {
  const [open, setOpen] = useState(false);
  return {
    open,
    openDrawer: () => setOpen(true),
    closeDrawer: () => setOpen(false),
  };
}
