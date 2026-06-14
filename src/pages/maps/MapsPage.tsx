import { Link } from "react-router-dom";
import { ROUTES } from "../../routes/routeConfig";

export function MapsPage() {
  return (
    <div className="content-page">
      <div className="content-page-inner">
        <nav className="page-breadcrumb" aria-label="Breadcrumb">
          <Link to={ROUTES.city.path}>Park Ridge</Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">Maps</span>
        </nav>

        <header className="content-page-header">
          <h1 className="content-page-title">Historical Maps</h1>
          <p className="content-page-subtitle">
            Historical aerial imagery, parcel change detection, and development-era overlays for Park Ridge.
          </p>
          <span className="preview-badge">Preview</span>
        </header>

        <div className="stub-section">
          <p className="stub-body">
            Full historical map visualization is available in the interactive Map Explorer. This
            dedicated Maps page will be expanded in a future release to include:
          </p>
          <ul className="stub-list">
            <li>Historical aerial imagery layers (1960s, 1980s, 2000s, present)</li>
            <li>Parcel change detection overlays</li>
            <li>Development-era heat maps</li>
            <li>Permit activity clusters</li>
            <li>Assessment change maps</li>
            <li>Neighborhood boundary visualizations</li>
          </ul>
          <Link to={ROUTES.explore.path} className="stub-cta-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            Open Map Explorer now
          </Link>
          <p className="stub-note">
            The Map Explorer includes historical imagery switching, permit pressure overlays, buildout animation, and a road/parcel change timeline.
          </p>
        </div>

        <div className="data-coverage-notice">
          <p>
            <strong>Available historical layers include:</strong> Cook County parcel shapefile
            (2000, 2021), historical aerial photography (where georeferenced), and Sanborn fire
            insurance maps (historical survey matches only).
          </p>
          <p>
            Historical map layers are available based on the{" "}
            <Link to={ROUTES.sources.path}>data sources</Link> currently georeferenced. Additional
            layers will be added as they are processed.
          </p>
        </div>
      </div>
    </div>
  );
}
