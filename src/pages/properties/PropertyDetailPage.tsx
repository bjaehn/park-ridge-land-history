import { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useParkRidgeContext } from "../../contexts/ParkRidgeDataContext";
import { useParcelDetail } from "../../hooks/useParcelDetail";
import { ParcelDetailPanel, type PropertyView } from "../../components/ParcelDetailPanel";
import { buildPhysicalBlock, parcelCollectionFromFeatures } from "../../lib/physicalBlock";
import { buildAreaSummaries } from "../../lib/areaGroups";
import { neighborhoodPath, neighborhoodSlugFromId, ROUTES } from "../../routes/routeConfig";
import type { ParcelFeature, ParcelCollection } from "../../lib/parcelTypes";
import type { AreaSummaryFeature } from "../../lib/areaGroups";

const emptyHotspots = { type: "FeatureCollection" as const, features: [] };

export function PropertyDetailPage() {
  const { pin } = useParams<{ pin: string }>();
  const navigate = useNavigate();
  const { pressureDecoratedParcels } = useParkRidgeContext();
  const decodedPin = pin ? decodeURIComponent(pin) : null;

  const { selectedParcel, isLoadingDetail } = useParcelDetail(
    pressureDecoratedParcels,
    decodedPin
  );

  const [activePropertyView, setActivePropertyView] = useState<PropertyView>("timeline");

  const physicalBlock = useMemo(
    () => (selectedParcel ? buildPhysicalBlock(selectedParcel, pressureDecoratedParcels) : null),
    [selectedParcel, pressureDecoratedParcels]
  );

  const neighborhoodSummaries = useMemo(
    () =>
      pressureDecoratedParcels
        ? buildAreaSummaries(pressureDecoratedParcels, "neighborhoods", emptyHotspots)
        : { type: "FeatureCollection" as const, features: [] },
    [pressureDecoratedParcels]
  );

  const parcelNeighborhood = useMemo(() => {
    if (!decodedPin || !neighborhoodSummaries.features.length) return null;
    return (
      neighborhoodSummaries.features.find((a) =>
        a.properties.parcelPins.includes(decodedPin)
      ) ?? null
    );
  }, [decodedPin, neighborhoodSummaries]);

  const neighborhoodParcels = useMemo((): ParcelFeature[] => {
    if (!decodedPin || !pressureDecoratedParcels) return [];
    if (!parcelNeighborhood) return pressureDecoratedParcels.features;
    const pins = new Set(parcelNeighborhood.properties.parcelPins);
    return pressureDecoratedParcels.features.filter((f) => {
      const p = f.properties.pin_normalized ?? f.properties.pin_original;
      return Boolean(p && pins.has(p));
    });
  }, [decodedPin, pressureDecoratedParcels, parcelNeighborhood]);

  if (!decodedPin) {
    return <MissingEntity message="No property ID provided." />;
  }

  if (!isLoadingDetail && !selectedParcel && pressureDecoratedParcels) {
    return (
      <MissingEntity
        message={`No property found for PIN ${decodedPin}.`}
        hint="Check that the PIN or address is correct."
      />
    );
  }

  const address = selectedParcel?.properties.address ?? decodedPin;
  const neighborhoodLabel = parcelNeighborhood?.properties.label;
  const neighborhoodId = parcelNeighborhood?.properties.id;

  return (
    <div className="detail-page">
      {/* Breadcrumb */}
      <nav className="page-breadcrumb" aria-label="Breadcrumb">
        <Link to={ROUTES.city.path}>Park Ridge</Link>
        <span aria-hidden="true">›</span>
        {neighborhoodLabel && neighborhoodId ? (
          <>
            <Link to={neighborhoodPath(neighborhoodSlugFromId(neighborhoodId))}>
              {neighborhoodLabel}
            </Link>
            <span aria-hidden="true">›</span>
          </>
        ) : (
          <>
            <Link to={ROUTES.neighborhoods.path}>Neighborhoods</Link>
            <span aria-hidden="true">›</span>
          </>
        )}
        <span aria-current="page">{address}</span>
      </nav>

      {/* Page header */}
      <div className="detail-page-header">
        <div className="detail-page-header-inner">
          <h1 className="detail-page-title">{address}</h1>
          <p className="detail-page-subtitle">
            {selectedParcel?.properties.year_built
              ? `Built ${selectedParcel.properties.year_built}`
              : "Year built not confirmed"}
            {neighborhoodLabel ? ` · ${neighborhoodLabel}` : ""}
            {decodedPin ? ` · PIN: ${decodedPin}` : ""}
          </p>
        </div>
        <Link
          to={`${ROUTES.explore.path}`}
          className="explore-map-btn"
          title="View this property in the interactive map explorer"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          Map Explorer
        </Link>
      </div>

      {/* Main content */}
      <div className="detail-page-body">
        <ParcelDetailPanel
          parcel={selectedParcel}
          parcels={pressureDecoratedParcels}
          permitPressureWindow={5}
          isLoadingDetail={isLoadingDetail}
          activeView={activePropertyView}
          blockParcels={physicalBlock?.contextParcels ?? []}
          neighborhoodParcels={neighborhoodParcels}
          onSetActiveView={setActivePropertyView}
          onSelectRelatedParcel={(parcel) => {
            const p = parcel.properties.pin_normalized ?? parcel.properties.pin_original;
            if (p) navigate(`/properties/${encodeURIComponent(p)}`);
          }}
          onClearSelection={() => navigate(ROUTES.home.path)}
        />
        {selectedParcel && (
          <HomeInContextSection
            parcel={selectedParcel}
            neighborhood={parcelNeighborhood}
            allParcels={pressureDecoratedParcels}
          />
        )}
      </div>
    </div>
  );
}

function HomeInContextSection({
  parcel,
  neighborhood,
  allParcels,
}: {
  parcel: ParcelFeature;
  neighborhood: AreaSummaryFeature | null;
  allParcels: ParcelCollection | null;
}) {
  const yearBuilt = parcel.properties.year_built;
  if (!yearBuilt || !allParcels) return null;

  const decade = Math.floor(yearBuilt / 10) * 10;
  const decadeLabel = `${decade}s`;

  const decadeCount = allParcels.features.filter((f) => {
    const y = f.properties.year_built;
    return typeof y === "number" && Math.floor(y / 10) * 10 === decade;
  }).length;

  const totalWithYear = allParcels.features.filter((f) =>
    typeof f.properties.year_built === "number" && f.properties.year_built > 0
  ).length;

  function eraName(year: number): string {
    if (year < 1920) return "Early Park Ridge";
    if (year < 1945) return "the pre-war era";
    if (year < 1970) return "the postwar boom";
    if (year < 1990) return "the mid-century period";
    return "the modern era";
  }

  const neighborhoodLabel = neighborhood?.properties.label;
  const neighborhoodMedian = neighborhood?.properties.medianYearBuilt;
  const neighborhoodPeak = neighborhood?.properties.peakDecade;

  const contextNote = [
    `This home was built in ${yearBuilt}, during ${eraName(yearBuilt)}.`,
    decadeCount > 0
      ? `${decadeCount.toLocaleString()} of the ${totalWithYear.toLocaleString()} Park Ridge properties with known build years share the ${decadeLabel}.`
      : null,
    neighborhoodLabel && neighborhoodMedian
      ? `The ${neighborhoodLabel} neighborhood has a typical build year of ${neighborhoodMedian}${neighborhoodPeak ? `, with its peak construction in the ${neighborhoodPeak}` : ""}.`
      : null,
  ].filter(Boolean).join(" ");

  return (
    <div className="hic-section">
      <p className="hic-eyebrow">Local history context</p>
      <h2 className="hic-title">This home in Park Ridge's story</h2>
      <div className="hic-stats-row">
        <div className="hic-stat">
          <span className="hic-stat-value">{yearBuilt}</span>
          <span className="hic-stat-label">Year built</span>
        </div>
        <div className="hic-stat">
          <span className="hic-stat-value">{decadeLabel}</span>
          <span className="hic-stat-label">Decade</span>
        </div>
        {decadeCount > 0 && (
          <div className="hic-stat">
            <span className="hic-stat-value">{decadeCount.toLocaleString()}</span>
            <span className="hic-stat-label">Park Ridge homes same decade</span>
          </div>
        )}
        {neighborhoodLabel && (
          <div className="hic-stat">
            <span className="hic-stat-value">{neighborhoodLabel}</span>
            <span className="hic-stat-label">Neighborhood</span>
          </div>
        )}
      </div>
      <p className="hic-narrative">{contextNote}</p>
      <div className="hic-links">
        {neighborhood && (
          <Link to={neighborhoodPath(neighborhoodSlugFromId(neighborhood.properties.id))} className="hic-link">
            {neighborhoodLabel} history →
          </Link>
        )}
        <Link to={ROUTES.city.path} className="hic-link">
          Park Ridge growth story →
        </Link>
        <Link to={ROUTES.explore.path} className="hic-link">
          Find on map →
        </Link>
      </div>
    </div>
  );
}

function MissingEntity({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="content-page">
      <div className="content-page-inner">
        <div className="error-page">
          <h1 className="error-page-title">Property not found</h1>
          <p className="error-page-body">{message}</p>
          {hint && <p className="error-page-hint">{hint}</p>}
          <div className="error-page-links">
            <Link to={ROUTES.home.path} className="error-page-link">Search again</Link>
            <Link to={ROUTES.neighborhoods.path} className="error-page-link">Browse neighborhoods</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
