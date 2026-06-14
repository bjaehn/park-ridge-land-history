import { Link } from "react-router-dom";
import { ROUTES } from "../../routes/routeConfig";

export function AboutPage() {
  return (
    <div className="content-page">
      <div className="content-page-inner">
        <nav className="page-breadcrumb" aria-label="Breadcrumb">
          <span aria-current="page">About</span>
        </nav>

        <header className="content-page-header">
          <h1 className="content-page-title">About Park Ridge Land History</h1>
          <p className="content-page-subtitle">
            A civic project making Park Ridge property history accessible and understandable to
            ordinary residents.
          </p>
        </header>

        <div className="about-body">
          <section className="about-section">
            <h2 className="about-section-title">What this is</h2>
            <p>
              Park Ridge Land History is a public-facing web app that lets anyone explore the
              development history of properties, blocks, and neighborhoods in Park Ridge, Illinois.
            </p>
            <p>
              The goal is to make public property records understandable: not just raw data
              dumps, but real historical context: when was this house built? Has it been renovated?
              What does the permit record show? How does it compare to other houses on the block?
            </p>
            <p>
              Think of it as "Ancestry.com for homes." A way to understand a property in the
              context of its block, its neighborhood, and the city's development over time.
            </p>
          </section>

          <section className="about-section">
            <h2 className="about-section-title">What this is not</h2>
            <ul className="about-list">
              <li>It is not a real estate valuation tool. Assessment values are public records, not market appraisals.</li>
              <li>It does not give legal advice about property history or title.</li>
              <li>It does not make predictions about future property values.</li>
              <li>It does not invent historical facts. If data is missing, the app says so.</li>
            </ul>
          </section>

          <section className="about-section">
            <h2 className="about-section-title">Data sources</h2>
            <p>
              All data is derived from publicly available Cook County records: assessor records,
              building permits, recorder of deeds sales, GIS parcel boundaries, and where
              available, historic architecture survey data.
            </p>
            <p>
              <Link to={ROUTES.sources.path}>See the full data sources page</Link> for details on
              what data is included, its known limitations, and how records were matched and
              processed.
            </p>
          </section>

          <section className="about-section">
            <h2 className="about-section-title">Anti-hallucination policy</h2>
            <p>
              This app is built on the principle that every historical claim should be traceable
              to a source. If data is unavailable, the app says "data not available" rather than
              generating a plausible-sounding substitute.
            </p>
            <p>
              Confidence levels and source notes appear throughout the app to help users
              understand which facts are from direct records versus which are inferred or
              estimated from available data.
            </p>
          </section>

          <section className="about-section">
            <h2 className="about-section-title">Technology</h2>
            <p>
              Built with React, TypeScript, MapLibre GL JS, and Supabase (PostgreSQL with
              PostGIS). Parcel data is sourced from Cook County GIS and imported into a
              Supabase database for efficient spatial queries.
            </p>
            <p>
              Deployed on Railway. Source data ETL is managed with a Python pipeline.
            </p>
          </section>

          <section className="about-section">
            <h2 className="about-section-title">Explore the app</h2>
            <div className="about-nav-links">
              <Link to={ROUTES.neighborhoods.path} className="about-nav-link">Browse neighborhoods</Link>
              <Link to={ROUTES.city.path} className="about-nav-link">How Park Ridge grew</Link>
              <Link to={ROUTES.maps.path} className="about-nav-link">Historical maps</Link>
              <Link to={ROUTES.sources.path} className="about-nav-link">Data sources</Link>
              <Link to={ROUTES.explore.path} className="about-nav-link">Map Explorer</Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
