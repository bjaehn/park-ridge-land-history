import { Link } from "react-router-dom";
import { ROUTES } from "../../routes/routeConfig";

type Source = {
  name: string;
  publisher: string;
  coverage: string;
  fields: string[];
  notes?: string;
  url?: string;
};

const sources: Source[] = [
  {
    name: "Cook County Assessor Parcel Data",
    publisher: "Cook County Assessor's Office",
    coverage: "All Park Ridge parcels with address, PIN, year built, assessment history",
    fields: ["year_built", "decade_built", "latest_assessed_total", "first_assessed_total", "assessed_value_change_pct"],
    notes: "Year built reflects the structure as currently assessed. May differ from original construction date. Assessment value is not market value.",
    url: "https://www.cookcountyassessor.com"
  },
  {
    name: "Cook County Building Permits",
    publisher: "Cook County / Park Ridge Building Department",
    coverage: "Building permit records linked to parcels by address matching",
    fields: ["permit_count", "latest_permit_year", "permit_pressure_type"],
    notes: "Older permits may be incomplete or not digitized. Permit pressure scores are computed from available records only."
  },
  {
    name: "Cook County Recorder of Deeds — Sales Records",
    publisher: "Cook County Recorder of Deeds",
    coverage: "Property sales since approximately 1999",
    fields: ["sale_count", "latest_sale_year", "latest_sale_price"],
    notes: "Sales records may include non-market transfers (inheritance, family transfers). Coverage begins approximately 1999."
  },
  {
    name: "Cook County GIS Parcel Boundaries",
    publisher: "Cook County GIS Department",
    coverage: "Parcel polygon geometry for all Park Ridge properties",
    fields: ["geometry", "street_block_id", "street_block_tract"],
    notes: "Boundaries reflect the current assessed parcel. Historical parcel shapes may differ."
  },
  {
    name: "Hargis Historic Architecture Survey",
    publisher: "Hargis Associates / Illinois Historic Preservation Agency",
    coverage: "Historic architecture survey records matched to Park Ridge parcels",
    fields: ["hargis_record_count", "hargis_arch_class", "hargis_architect", "hargis_survey_date"],
    notes: "Survey coverage is not complete for all Park Ridge properties. Match method is documented in data quality flags."
  },
  {
    name: "Cook County Ward Boundaries",
    publisher: "Cook County Elections",
    coverage: "Official Park Ridge election ward polygons",
    fields: ["ward boundaries used in area groupings"],
    notes: "Ward boundaries reflect current electoral districts and may change with redistricting."
  },
  {
    name: "Census Block Groups / Tract Data",
    publisher: "US Census Bureau",
    coverage: "Block group and tract identifiers used for block grouping",
    fields: ["street_block_id", "street_block_tract"],
    notes: "Block identifiers derived from Census 2020 block group boundaries. Not the same as city-defined blocks."
  }
];

export function SourcesPage() {
  return (
    <div className="content-page">
      <div className="content-page-inner">
        <nav className="page-breadcrumb" aria-label="Breadcrumb">
          <span aria-current="page">Data Sources</span>
        </nav>

        <header className="content-page-header">
          <h1 className="content-page-title">Data Sources</h1>
          <p className="content-page-subtitle">
            Every fact in Park Ridge Land History is tied to a public record source. Missing data
            is shown, not hidden. This page documents what data is used, where it comes from, and
            what its known limitations are.
          </p>
        </header>

        <div className="sources-trust-statement">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <strong>Anti-hallucination policy:</strong> This app does not invent historical facts.
          If data is missing for a property, block, or neighborhood, the app says so clearly
          rather than generating a plausible-sounding substitute.
        </div>

        <section className="sources-list" aria-label="Data sources">
          {sources.map((source) => (
            <div key={source.name} className="source-entry">
              <div className="source-entry-header">
                <h2 className="source-name">{source.name}</h2>
                <span className="source-publisher">{source.publisher}</span>
              </div>
              <p className="source-coverage">{source.coverage}</p>
              <div className="source-fields">
                <strong>Fields used:</strong>{" "}
                <span className="source-field-list">{source.fields.join(", ")}</span>
              </div>
              {source.notes && (
                <p className="source-notes">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                  {source.notes}
                </p>
              )}
              {source.url && (
                <a href={source.url} className="source-url" target="_blank" rel="noopener noreferrer">
                  {source.url}
                </a>
              )}
            </div>
          ))}
        </section>

        <section className="sources-methodology">
          <h2 className="sources-section-title">Data Processing Notes</h2>
          <ul className="sources-notes-list">
            <li>All data is derived from publicly available Cook County records.</li>
            <li>Parcel data is imported into a Supabase database with PostGIS geometry for efficient spatial queries.</li>
            <li>Address matching between assessor records and permit/sales records uses normalized address comparison. Match quality varies.</li>
            <li>Permit pressure scoring is a computed signal based on permit count and recency. It is not an official indicator.</li>
            <li>Assessment values reflect the assessor's assessed value, which typically differs from market value.</li>
            <li>Historic survey records from the Hargis survey are matched by address and may not cover all historic properties.</li>
            <li>Block groupings use Census block group identifiers. These are not the same as city-defined street blocks.</li>
          </ul>
        </section>

        <section className="sources-methodology">
          <h2 className="sources-section-title">Known Limitations</h2>
          <ul className="sources-notes-list">
            <li>Permit records may be incomplete for work done before digital records were kept.</li>
            <li>Sales records begin approximately 1999. Earlier sales are not included.</li>
            <li>Year built reflects the current structure as assessed. Demolitions, rebuilds, and significant renovations may shift the year built forward.</li>
            <li>Neighborhood boundaries are approximate and not official City of Park Ridge definitions.</li>
            <li>Historic survey coverage is partial — not all historic structures in Park Ridge have been surveyed.</li>
            <li>Assessment appeals and reassessments may lag behind actual changes.</li>
          </ul>
        </section>

        <p className="sources-footer">
          Questions about the data? See the{" "}
          <Link to={ROUTES.about.path}>About page</Link> or review the{" "}
          <a href="https://github.com" className="sources-url" target="_blank" rel="noopener noreferrer">
            project repository
          </a>
          {" "}for technical documentation.
        </p>
      </div>
    </div>
  );
}
