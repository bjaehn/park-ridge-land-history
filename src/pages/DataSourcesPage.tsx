import { Database, AlertTriangle, CheckCircle, Clock, ExternalLink } from "lucide-react";
import { useParkRidgeContext } from "../contexts/ParkRidgeDataContext";
import { formatNumber } from "../lib/formatters";
import "./DataSourcesPage.css";

const SOURCES = [
  {
    id: "cook-parcel-universe",
    label: "Cook County Parcel Universe",
    provider: "Cook County Assessor's Office",
    url: "https://datacatalog.cookcountyil.gov/resource/nj4t-kc8j",
    coverage: "All Cook County parcels",
    updateFrequency: "Annual",
    fields: ["PIN", "address", "municipality", "property class"],
    limitations: "Municipality field may contain inconsistencies. Some parcels may lack complete address data.",
    status: "active",
  },
  {
    id: "cook-improvements",
    label: "Cook County Assessor Improvements",
    provider: "Cook County Assessor's Office",
    url: "https://datacatalog.cookcountyil.gov/resource/x54s-btds",
    coverage: "Building characteristics for Cook County properties",
    updateFrequency: "Annual",
    fields: ["year_built", "building_sqft", "land_sqft", "property_class"],
    limitations: "Year built reflects assessor records, which may differ from actual construction date. Multiple improvements per PIN are resolved using transparent selection rules.",
    status: "active",
  },
  {
    id: "cook-permits",
    label: "Cook County Assessor Permits",
    provider: "Cook County Assessor's Office",
    url: "https://datacatalog.cookcountyil.gov/",
    coverage: "Permit records for Cook County properties",
    updateFrequency: "Varies",
    fields: ["permit_number", "permit_type", "date_issued", "description", "status", "estimated_completion"],
    limitations: "Records in this dataset begin 2019. Pre-2019 permit data is not published in the Cook County Assessor's Socrata API. Not all municipalities submit permit data to the county.",
    status: "active",
  },
  {
    id: "cook-sales",
    label: "Cook County Assessor Sales",
    provider: "Cook County Assessor's Office",
    url: "https://datacatalog.cookcountyil.gov/",
    coverage: "Property sales recorded in Cook County",
    updateFrequency: "Quarterly",
    fields: ["sale_date", "sale_price", "deed_type"],
    limitations: "Non-market transfers (family transfers, foreclosures, estate sales) are included in raw data but may be filtered. Sale prices of $0 or very low values may indicate non-market transactions.",
    status: "active",
  },
  {
    id: "cook-assessments",
    label: "Cook County Assessed Values",
    provider: "Cook County Assessor's Office",
    url: "https://datacatalog.cookcountyil.gov/",
    coverage: "Annual assessed values for Cook County properties",
    updateFrequency: "Annual (triennial reassessment cycle)",
    fields: ["year", "certified_total", "certified_land", "certified_building"],
    limitations: "Cook County uses a triennial reassessment cycle. Values between reassessment years may be unchanged. Assessment reductions from appeals are tracked separately.",
    status: "active",
  },
  {
    id: "cook-parcel-geometry",
    label: "Cook County Parcel Boundaries",
    provider: "Cook County GIS",
    url: "https://gis.cookcountyil.gov/",
    coverage: "Parcel polygon geometries for Cook County",
    updateFrequency: "Periodic",
    fields: ["parcel boundary polygon", "PIN"],
    limitations: "Boundary data may not reflect recent parcel splits or merges. Historical boundary changes require separate historical parcel snapshots.",
    status: "active",
  },
  {
    id: "hargis-survey",
    label: "Hargis Historic Architectural Survey",
    provider: "Park Ridge Historic Preservation Commission",
    coverage: "Historic survey records for Park Ridge properties",
    updateFrequency: "Static (survey conducted 1993–1996 approximately)",
    fields: ["architectural style", "materials", "architect", "significance rating", "photos", "PDFs"],
    limitations: "Survey was conducted at a specific point in time. Not all properties were surveyed. Significance ratings reflect the survey era's criteria.",
    status: "active",
  },
  {
    id: "census-blocks",
    label: "Census TIGER/Line Tabulation Blocks",
    provider: "U.S. Census Bureau",
    url: "https://www2.census.gov/geo/tiger/",
    coverage: "Census block boundaries for Illinois",
    updateFrequency: "Decennial (2020 vintage used)",
    fields: ["block ID", "block boundary polygon"],
    limitations: "Census blocks are used as proxies for physical city blocks. Block boundaries follow street centerlines and may not match intuitive neighborhood mental maps.",
    status: "active",
  },
  {
    id: "cook-historical-parcels",
    label: "Cook County Historical Parcel Snapshots",
    provider: "Cook County GIS (via open data archive)",
    coverage: "Parcel boundaries for 2000 and 2021",
    updateFrequency: "Static snapshots",
    fields: ["parcel boundary", "PIN"],
    limitations: "Limited to two time points. Parcel changes between snapshots are computed by spatial comparison, not from an official change log.",
    status: "active",
  },
];

export function DataSourcesPage() {
  const { parcelCount } = useParkRidgeContext();

  return (
    <div className="page-container">
      <div className="page-hero">
        <span className="page-eyebrow">
          <Database size={12} strokeWidth={2.5} aria-hidden="true" />
          Data Sources
        </span>
        <h1 className="page-title">What We Know and Don't Know</h1>
        <p className="page-subtitle">
          Every claim in this app is traceable to a specific source. This page documents
          what data is used, its coverage, known limitations, and update frequency.
        </p>
      </div>

      <div className="glass-card datasources-notice">
        <AlertTriangle size={16} strokeWidth={2} style={{ color: "#fbbf24", flexShrink: 0 }} aria-hidden="true" />
        <div>
          <strong>Data quality commitment</strong>
          <p>
            This app shows what the data says. Where data is missing, incomplete, or uncertain,
            the interface says so rather than filling gaps with assumptions. Assessment year built
            differs from actual construction date. Permit coverage is not 100%. Sales data
            includes both market and non-market transactions. These limitations are documented below.
          </p>
        </div>
      </div>

      <section className="page-section">
        <div className="section-header">
          <div>
            <span className="section-eyebrow">Current coverage</span>
            <h2 className="section-title">At a glance</h2>
          </div>
        </div>
        <div className="grid-3">
          <div className="datasource-stat-card">
            <CheckCircle size={16} style={{ color: "#34d399" }} aria-hidden="true" />
            <div>
              <strong>{formatNumber(parcelCount)}</strong>
              <span>Park Ridge parcels on record</span>
            </div>
          </div>
          <div className="datasource-stat-card">
            <Database size={16} style={{ color: "#60a5fa" }} aria-hidden="true" />
            <div>
              <strong>{SOURCES.length}</strong>
              <span>Data sources integrated</span>
            </div>
          </div>
          <div className="datasource-stat-card">
            <Clock size={16} style={{ color: "#fbbf24" }} aria-hidden="true" />
            <div>
              <strong>{__BUILD_DATE__}</strong>
              <span>Last app build date</span>
            </div>
          </div>
        </div>
      </section>

      <section className="page-section">
        <div className="section-header">
          <h2 className="section-title">Source datasets</h2>
        </div>
        <div className="datasources-list">
          {SOURCES.map((source) => (
            <div key={source.id} className="datasource-card">
              <div className="datasource-card-header">
                <div className="datasource-card-title-row">
                  <strong className="datasource-name">{source.label}</strong>
                  <span className="badge badge-green">Active</span>
                </div>
                <div className="datasource-meta-row">
                  <span>Provider: {source.provider}</span>
                  <span>Updates: {source.updateFrequency}</span>
                </div>
              </div>

              <div className="datasource-card-body">
                <div>
                  <span className="datasource-field-label">Coverage</span>
                  <p className="datasource-field-value">{source.coverage}</p>
                </div>
                <div>
                  <span className="datasource-field-label">Key fields</span>
                  <p className="datasource-field-value">{source.fields.join(", ")}</p>
                </div>
                <div className="datasource-limitation">
                  <AlertTriangle size={11} strokeWidth={2.2} aria-hidden="true" />
                  <p>{source.limitations}</p>
                </div>
              </div>

              {source.url && (
                <div className="datasource-card-footer">
                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="datasource-link">
                    <ExternalLink size={11} strokeWidth={2.2} aria-hidden="true" />
                    View source
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="page-section">
        <div className="glass-card">
          <span className="section-eyebrow">Data pipeline</span>
          <h3 style={{ margin: "8px 0 12px", color: "rgba(255,255,255,0.88)", fontSize: "0.96rem", fontWeight: 500 }}>
            How data gets from source to screen
          </h3>
          {[
            { step: "1. Download", desc: "Python scripts fetch data from Cook County's Socrata API and ArcGIS FeatureServer. Full datasets are downloaded with pagination — no row caps." },
            { step: "2. Normalize", desc: "PINs are normalized to 14-digit format. Addresses are standardized. Multiple records per PIN are resolved using documented selection rules." },
            { step: "3. Enrich", desc: "Parcels are joined with improvements, permits, sales, assessments, proximity data, and Hargis survey records. Each join uses documented matching criteria." },
            { step: "4. Export", desc: "Enriched data is exported as GeoJSON for map display and JSON chunks for property detail lookup. Each chunk covers a 4-digit PIN prefix." },
            { step: "5. Future: Supabase", desc: "The next phase moves data into Supabase for real-time queries, incremental updates, and AI-grounded summaries. The schema and ETL pipeline are prepared." },
          ].map((item) => (
            <div key={item.step} style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: 12, marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <strong style={{ color: "#22d3ee", fontSize: "0.72rem", fontWeight: 700, paddingTop: 2 }}>{item.step}</strong>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.52)", fontSize: "0.78rem", lineHeight: 1.55 }}>{item.desc}</p>
            </div>
          ))}
          <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.22)", fontSize: "0.66rem" }}>
            App built {__BUILD_DATE__}. Data freshness depends on last pipeline run; see Cook County data catalog for upstream update schedules.
          </p>
        </div>
      </section>
    </div>
  );
}
