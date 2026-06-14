import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useParkRidgeContext } from "../../contexts/ParkRidgeDataContext";
import { buildAreaSummaries } from "../../lib/areaGroups";
import { neighborhoodPath, neighborhoodSlugFromId, ROUTES } from "../../routes/routeConfig";
import { eraLabel } from "../../lib/formatters";
import type { AreaSummaryFeature } from "../../lib/areaGroups";

const emptyHotspots = { type: "FeatureCollection" as const, features: [] };

export function NeighborhoodsPage() {
  const { pressureDecoratedParcels } = useParkRidgeContext();

  const neighborhoods = useMemo(
    () =>
      pressureDecoratedParcels
        ? buildAreaSummaries(pressureDecoratedParcels, "neighborhoods", emptyHotspots).features
        : [],
    [pressureDecoratedParcels]
  );

  const isLoading = !pressureDecoratedParcels;

  return (
    <div className="content-page">
      <div className="content-page-inner">
        {/* Breadcrumb */}
        <nav className="page-breadcrumb" aria-label="Breadcrumb">
          <Link to={ROUTES.city.path}>Park Ridge</Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">Neighborhoods</span>
        </nav>

        <header className="content-page-header">
          <h1 className="content-page-title">Park Ridge Neighborhoods</h1>
          <p className="content-page-subtitle">
            Park Ridge grew neighborhood by neighborhood. Explore when each area developed,
            which eras shaped its homes, and how each area compares today.
          </p>
        </header>

        {isLoading ? (
          <div className="page-loading">Loading neighborhood data…</div>
        ) : neighborhoods.length === 0 ? (
          <div className="page-empty">
            Neighborhood data is not available. Data may still be loading.
          </div>
        ) : (
          <>
            <div className="neighborhood-grid">
              {neighborhoods
                .filter((n) => n.properties.id.startsWith("neighborhood:"))
                .sort((a, b) => {
                  const mya = a.properties.medianYearBuilt ?? 9999;
                  const myb = b.properties.medianYearBuilt ?? 9999;
                  return mya - myb;
                })
                .map((n) => (
                  <NeighborhoodCard key={n.properties.id} neighborhood={n} />
                ))}
            </div>
            <p className="page-caveat">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              Neighborhood boundaries are approximate, derived from parcel locations and common local usage. They do not represent official City of Park Ridge boundaries.
            </p>
          </>
        )}
      </div>
    </div>
  );
}


function NeighborhoodCard({ neighborhood }: { neighborhood: AreaSummaryFeature }) {
  const p = neighborhood.properties;
  const slug = neighborhoodSlugFromId(p.id);
  const href = neighborhoodPath(slug);

  const stats: Array<{ label: string; value: string }> = [
    { label: "Properties", value: p.parcelCount.toLocaleString() },
    ...(p.medianYearBuilt ? [{ label: "Typical build year", value: String(p.medianYearBuilt) }] : []),
    { label: "Older homes", value: `${p.olderHomePercent}%` },
  ];

  return (
    <Link to={href} className="neighborhood-card" aria-label={`${p.label}: ${p.description}`}>
      <div className="nc-header">
        <h2 className="nc-title">{p.label}</h2>
        <span className={`nc-signal nc-signal--${p.signal}`}>{p.signalLabel}</span>
      </div>
      <p className="nc-description">{p.description}</p>
      {p.medianYearBuilt && (
        <span className="nc-era">{eraLabel(p.medianYearBuilt)}{p.peakDecade ? ` · peak ${p.peakDecade}` : ""}</span>
      )}

      <ul className="nc-stats" aria-label="Key stats">
        {stats.map((s) => (
          <li key={s.label} className="nc-stat">
            <span className="nc-stat-value">{s.value}</span>
            <span className="nc-stat-label">{s.label}</span>
          </li>
        ))}
      </ul>
      <span className="nc-cta" aria-hidden="true">
        Explore {p.label}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </span>
    </Link>
  );
}
