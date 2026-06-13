import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { MapPin, Home, Wrench, DollarSign, ChevronRight, TrendingUp } from "lucide-react";
import { useParkRidgeContext } from "../contexts/ParkRidgeDataContext";
import { StatCard } from "../components/cards/StatCard";
import { RankedInsightCard } from "../components/cards/RankedInsightCard";
import { buildAreaSummaries } from "../lib/areaGroups";
import { decoratePermitPressure } from "../lib/permitPressure";
import { topMostSold, topMostPermits, topOldestHomes } from "../lib/rankings";
import { ROUTES } from "../lib/routes";
import { formatNumber, formatYear } from "../lib/formatters";

export function NeighborhoodDetailPage() {
  const { neighborhoodId } = useParams<{ neighborhoodId: string }>();
  const { parcels, isLoading } = useParkRidgeContext();

  const id = neighborhoodId ? decodeURIComponent(neighborhoodId) : null;

  const decorated = useMemo(() => decoratePermitPressure(parcels, 5), [parcels]);

  const { neighborhood, neighborhoodParcels } = useMemo(() => {
    if (!decorated || !id) return { neighborhood: null, neighborhoodParcels: [] };
    const summaries = buildAreaSummaries(decorated, "neighborhoods", { type: "FeatureCollection", features: [] });
    const area = summaries.features.find((f) => f.properties.id === id);
    if (!area) return { neighborhood: null, neighborhoodParcels: [] };
    const pins = new Set(area.properties.parcelPins);
    const np = decorated.features.filter((f) => {
      const pin = f.properties.pin_normalized || f.properties.pin_original;
      return pin && pins.has(pin);
    });
    return { neighborhood: area.properties, neighborhoodParcels: np };
  }, [decorated, id]);

  const rankings = useMemo(() => ({
    mostSold: topMostSold(neighborhoodParcels),
    mostPermits: topMostPermits(neighborhoodParcels),
    oldest: topOldestHomes(neighborhoodParcels),
  }), [neighborhoodParcels]);

  const stats = useMemo(() => {
    const years = neighborhoodParcels.map((f) => f.properties.year_built).filter((y): y is number => y != null && y >= 1800);
    return {
      count: neighborhoodParcels.length,
      oldestYear: years.length ? Math.min(...years) : null,
      newestYear: years.length ? Math.max(...years) : null,
      withPermits: neighborhoodParcels.filter((f) => (f.properties.permit_count ?? 0) > 0).length,
      withSales: neighborhoodParcels.filter((f) => (f.properties.sale_count ?? 0) > 0).length,
    };
  }, [neighborhoodParcels]);

  if (!id) return <div className="page-container"><div className="empty-state">No neighborhood specified.</div></div>;

  if (!isLoading && !neighborhood) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <p>Neighborhood not found.</p>
          <Link to={ROUTES.neighborhoods} className="link-pill" style={{ marginTop: 16 }}>All neighborhoods</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <nav className="property-breadcrumb" aria-label="Breadcrumb">
        <Link to={ROUTES.discover} className="breadcrumb-link">Park Ridge</Link>
        <ChevronRight size={12} strokeWidth={2} aria-hidden="true" />
        <Link to={ROUTES.neighborhoods} className="breadcrumb-link">Neighborhoods</Link>
        <ChevronRight size={12} strokeWidth={2} aria-hidden="true" />
        <span className="breadcrumb-current">{neighborhood?.label ?? "…"}</span>
      </nav>

      <div className="page-hero">
        <span className="page-eyebrow">
          <MapPin size={12} strokeWidth={2.5} aria-hidden="true" />
          Neighborhood
        </span>
        <h1 className="page-title">{neighborhood?.label ?? "Loading…"}</h1>
        <p className="page-subtitle">
          {formatNumber(stats.count)} properties · Oldest home: {formatYear(stats.oldestYear)} · Signal: {neighborhood?.signal?.replace(/_/g, " ")}
        </p>
      </div>

      {isLoading ? (
        <div className="loading-spinner"><div className="spinner-dot" /><div className="spinner-dot" /><div className="spinner-dot" /><span>Loading…</span></div>
      ) : (
        <>
          <section className="page-section">
            <div className="grid-4">
              <StatCard label="Properties" value={formatNumber(stats.count)} icon={Home} accent="cyan" />
              <StatCard label="Oldest Home" value={formatYear(stats.oldestYear)} icon={TrendingUp} accent="amber" />
              <StatCard label="With Permits" value={formatNumber(stats.withPermits)} icon={Wrench} accent="amber" />
              <StatCard label="With Sales" value={formatNumber(stats.withSales)} icon={DollarSign} accent="green" />
            </div>
          </section>

          <section className="page-section">
            <div className="section-header">
              <h2 className="section-title">Top properties in {neighborhood?.label}</h2>
            </div>
            <div className="grid-3">
              <RankedInsightCard title="Most Sales" icon={DollarSign} accentColor="#34d399" items={rankings.mostSold} />
              <RankedInsightCard title="Most Permits" icon={Wrench} accentColor="#fbbf24" items={rankings.mostPermits} />
              <RankedInsightCard title="Oldest Homes" icon={TrendingUp} accentColor="#c4a97a" items={rankings.oldest} />
            </div>
          </section>

          <section className="page-section">
            <div className="glass-card">
              <span className="section-eyebrow">Neighborhood character</span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginTop: 12 }}>
                <div>
                  <strong style={{ color: "rgba(255,255,255,0.80)", fontSize: "0.82rem" }}>Pre-1945 Homes</strong>
                  <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.45)", fontSize: "0.76rem" }}>
                    {formatNumber(neighborhood?.olderHomeCount ?? 0)} of {formatNumber(stats.count)} properties
                    ({stats.count > 0 ? Math.round(((neighborhood?.olderHomeCount ?? 0) / stats.count) * 100) : 0}%)
                  </p>
                </div>
                <div>
                  <strong style={{ color: "rgba(255,255,255,0.80)", fontSize: "0.82rem" }}>New Construction</strong>
                  <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.45)", fontSize: "0.76rem" }}>
                    {formatNumber(neighborhood?.newConstructionCount ?? 0)} properties
                  </p>
                </div>
                <div>
                  <strong style={{ color: "rgba(255,255,255,0.80)", fontSize: "0.82rem" }}>Teardown Pressure</strong>
                  <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.45)", fontSize: "0.76rem" }}>
                    {formatNumber(neighborhood?.teardownPressureCount ?? 0)} properties
                  </p>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
