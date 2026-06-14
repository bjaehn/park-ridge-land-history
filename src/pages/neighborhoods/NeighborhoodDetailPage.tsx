import { useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useParkRidgeContext } from "../../contexts/ParkRidgeDataContext";
import { buildAreaSummaries } from "../../lib/areaGroups";
import {
  neighborhoodPath,
  neighborhoodSlugFromId,
  neighborhoodIdFromSlug,
  propertyPath,
  ROUTES
} from "../../routes/routeConfig";
import { GrowthStoryPanel } from "../../components/GrowthStoryPanel";
import { ChangeStoryCard } from "../../components/ChangeStoryCard";
import { DecadeComparisonTable } from "../../components/DecadeComparisonTable";
import { PermitWorkComparisonTable } from "../../components/PermitWorkComparisonTable";
import { parcelCollectionFromFeatures } from "../../lib/physicalBlock";
import type { ParcelFeature } from "../../lib/parcelTypes";
import type { AreaSummaryFeature } from "../../lib/areaGroups";
import { HotspotPanel, type AreaView } from "../../components/HotspotPanel";

const emptyHotspots = { type: "FeatureCollection" as const, features: [] };
const emptyAreas = { type: "FeatureCollection" as const, features: [] };

export function NeighborhoodDetailPage() {
  const { neighborhoodId } = useParams<{ neighborhoodId: string }>();
  const navigate = useNavigate();
  const { pressureDecoratedParcels, parcels } = useParkRidgeContext();

  const areaId = neighborhoodId ? neighborhoodIdFromSlug(decodeURIComponent(neighborhoodId)) : null;

  const allNeighborhoodSummaries = useMemo(
    () =>
      pressureDecoratedParcels
        ? buildAreaSummaries(pressureDecoratedParcels, "neighborhoods", emptyHotspots)
        : emptyAreas,
    [pressureDecoratedParcels]
  );

  const neighborhood = useMemo(
    () => allNeighborhoodSummaries.features.find((n) => n.properties.id === areaId) ?? null,
    [allNeighborhoodSummaries, areaId]
  );

  const neighborhoodParcels = useMemo(() => {
    if (!neighborhood || !pressureDecoratedParcels) return null;
    const pins = new Set(neighborhood.properties.parcelPins);
    return parcelCollectionFromFeatures(
      pressureDecoratedParcels.features.filter((f) => {
        const p = f.properties.pin_normalized ?? f.properties.pin_original;
        return Boolean(p && pins.has(p));
      })
    );
  }, [neighborhood, pressureDecoratedParcels]);

  const [activeAreaView, setActiveAreaView] = useState<AreaView>("age");

  const isLoading = !pressureDecoratedParcels;

  if (!areaId) {
    return <MissingNeighborhood message="No neighborhood ID provided." />;
  }

  if (!isLoading && !neighborhood) {
    return (
      <MissingNeighborhood
        message={`No neighborhood found for "${neighborhoodId}".`}
        hint="This neighborhood may not exist in the current dataset."
      />
    );
  }

  const label = neighborhood?.properties.label ?? "Neighborhood";
  const slug = neighborhoodId ?? "";

  return (
    <div className="detail-page">
      {/* Breadcrumb */}
      <nav className="page-breadcrumb" aria-label="Breadcrumb">
        <Link to={ROUTES.city.path}>Park Ridge</Link>
        <span aria-hidden="true">›</span>
        <Link to={ROUTES.neighborhoods.path}>Neighborhoods</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">{label}</span>
      </nav>

      {/* Header */}
      <div className="detail-page-header">
        <div className="detail-page-header-inner">
          <h1 className="detail-page-title">{label}</h1>
          {neighborhood && (
            <p className="detail-page-subtitle">
              {neighborhood.properties.parcelCount.toLocaleString()} properties
              {" · "}{neighborhood.properties.description}
            </p>
          )}
        </div>
        <Link to={ROUTES.explore.path} className="explore-map-btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          Map Explorer
        </Link>
      </div>

      {isLoading ? (
        <div className="page-loading">Loading neighborhood data…</div>
      ) : (
        <div className="detail-page-body">
          {/* Signal banner */}
          {neighborhood && (
            <div className="neighborhood-signal-banner">
              <strong>{neighborhood.properties.signalLabel}</strong>
              <span>{neighborhood.properties.evaluation}</span>
            </div>
          )}

          {/* Growth story */}
          {neighborhoodParcels && (
            <GrowthStoryPanel parcels={neighborhoodParcels} />
          )}

          {/* Change story */}
          {neighborhoodParcels && (
            <ChangeStoryCard scope="area" parcels={neighborhoodParcels} />
          )}

          {/* Age comparison */}
          {neighborhoodParcels && (
            <DecadeComparisonTable
              parcels={neighborhoodParcels}
              title="Housing Age in This Neighborhood"
              note="Groups properties by decade built and compares development patterns."
            />
          )}

          {/* Permit work */}
          {neighborhoodParcels && (
            <PermitWorkComparisonTable
              parcels={neighborhoodParcels}
              permitPressureWindow={5}
              title="Permit Activity in This Neighborhood"
              note="Groups properties by their strongest permit signal over the past 5 years."
            />
          )}

          {/* Notable properties */}
          {neighborhood && pressureDecoratedParcels && (
            <NotablePropertiesSection
              neighborhood={neighborhood}
              parcels={pressureDecoratedParcels.features}
              onSelectProperty={(pin) => navigate(propertyPath(pin))}
            />
          )}

          {/* Breadcrumb nav to other neighborhoods */}
          <div className="neighborhood-nav-links">
            <Link to={ROUTES.neighborhoods.path} className="back-link">
              ← All neighborhoods
            </Link>
            <Link to={ROUTES.city.path} className="back-link">
              ← Park Ridge overview
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function NotablePropertiesSection({
  neighborhood,
  parcels,
  onSelectProperty,
}: {
  neighborhood: AreaSummaryFeature;
  parcels: ParcelFeature[];
  onSelectProperty: (pin: string) => void;
}) {
  const pins = new Set(neighborhood.properties.parcelPins);
  const neighborhoodFeatures = parcels.filter((f) => {
    const p = f.properties.pin_normalized ?? f.properties.pin_original;
    return Boolean(p && pins.has(p));
  });

  const oldest = [...neighborhoodFeatures]
    .filter((f) => typeof f.properties.year_built === "number")
    .sort((a, b) => (a.properties.year_built ?? 9999) - (b.properties.year_built ?? 9999))
    .slice(0, 5);

  const mostPermitted = [...neighborhoodFeatures]
    .filter((f) => (f.properties.permit_count ?? 0) > 0)
    .sort((a, b) => (b.properties.permit_count ?? 0) - (a.properties.permit_count ?? 0))
    .slice(0, 5);

  if (oldest.length === 0 && mostPermitted.length === 0) return null;

  return (
    <div className="notable-properties-section">
      {oldest.length > 0 && (
        <div className="np-group">
          <h3 className="np-group-title">Oldest properties in {neighborhood.properties.label}</h3>
          <ol className="np-list">
            {oldest.map((f, i) => {
              const pin = f.properties.pin_normalized ?? f.properties.pin_original ?? "";
              return (
                <li key={pin} className="np-item">
                  <span className="np-rank">{i + 1}</span>
                  <button className="np-btn" type="button" onClick={() => pin && onSelectProperty(pin)}>
                    <span className="np-address">{f.properties.address ?? "Unknown address"}</span>
                    <span className="np-value">Built {f.properties.year_built}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}
      {mostPermitted.length > 0 && (
        <div className="np-group">
          <h3 className="np-group-title">Most permitted in {neighborhood.properties.label}</h3>
          <ol className="np-list">
            {mostPermitted.map((f, i) => {
              const pin = f.properties.pin_normalized ?? f.properties.pin_original ?? "";
              return (
                <li key={pin} className="np-item">
                  <span className="np-rank">{i + 1}</span>
                  <button className="np-btn" type="button" onClick={() => pin && onSelectProperty(pin)}>
                    <span className="np-address">{f.properties.address ?? "Unknown address"}</span>
                    <span className="np-value">{f.properties.permit_count} permits</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}

function MissingNeighborhood({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="content-page">
      <div className="content-page-inner">
        <div className="error-page">
          <h1 className="error-page-title">Neighborhood not found</h1>
          <p className="error-page-body">{message}</p>
          {hint && <p className="error-page-hint">{hint}</p>}
          <div className="error-page-links">
            <Link to={ROUTES.neighborhoods.path} className="error-page-link">All neighborhoods</Link>
            <Link to={ROUTES.city.path} className="error-page-link">Park Ridge overview</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
