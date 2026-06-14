import { useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useParkRidgeContext } from "../../contexts/ParkRidgeDataContext";
import { buildAreaSummaries } from "../../lib/areaGroups";
import {
  neighborhoodPath,
  neighborhoodSlugFromId,
  propertyPath,
  ROUTES
} from "../../routes/routeConfig";
import { GrowthStoryPanel } from "../../components/GrowthStoryPanel";
import { ChangeStoryCard } from "../../components/ChangeStoryCard";
import { DecadeComparisonTable } from "../../components/DecadeComparisonTable";
import { parcelCollectionFromFeatures } from "../../lib/physicalBlock";
import { formatCurrency } from "../../lib/formatters";
import type { ParcelFeature } from "../../lib/parcelTypes";

const emptyHotspots = { type: "FeatureCollection" as const, features: [] };

export function BlockDetailPage() {
  const { blockId } = useParams<{ blockId: string }>();
  const navigate = useNavigate();
  const { pressureDecoratedParcels, parcels } = useParkRidgeContext();

  const decodedBlockId = blockId ? decodeURIComponent(blockId) : null;

  const blockParcels = useMemo<ParcelFeature[]>(() => {
    if (!decodedBlockId || !pressureDecoratedParcels) return [];
    return pressureDecoratedParcels.features.filter(
      (f) => f.properties.street_block_id === decodedBlockId
    );
  }, [decodedBlockId, pressureDecoratedParcels]);

  const blockCollection = useMemo(
    () => parcelCollectionFromFeatures(blockParcels),
    [blockParcels]
  );

  const neighborhoodSummaries = useMemo(
    () =>
      pressureDecoratedParcels
        ? buildAreaSummaries(pressureDecoratedParcels, "neighborhoods", emptyHotspots)
        : { type: "FeatureCollection" as const, features: [] },
    [pressureDecoratedParcels]
  );

  const blockNeighborhood = useMemo(() => {
    if (!blockParcels.length || !neighborhoodSummaries.features.length) return null;
    const firstPin = blockParcels[0]?.properties.pin_normalized ?? blockParcels[0]?.properties.pin_original;
    if (!firstPin) return null;
    return neighborhoodSummaries.features.find((n) => n.properties.parcelPins.includes(firstPin)) ?? null;
  }, [blockParcels, neighborhoodSummaries]);

  const blockLabel = useMemo(() => {
    if (!blockParcels.length) return decodedBlockId ?? "Unknown block";
    const addr = blockParcels[0]?.properties.address ?? "";
    return addr.split(" ").slice(1).join(" ") || `Block ${decodedBlockId}`;
  }, [blockParcels, decodedBlockId]);

  const isLoading = !pressureDecoratedParcels;

  if (!decodedBlockId) {
    return <MissingBlock message="No block ID provided." />;
  }

  if (!isLoading && blockParcels.length === 0) {
    return (
      <MissingBlock
        message={`No properties found for block "${decodedBlockId}".`}
        hint="This block ID may not exist or data may be missing."
      />
    );
  }

  return (
    <div className="detail-page">
      {/* Breadcrumb */}
      <nav className="page-breadcrumb" aria-label="Breadcrumb">
        <Link to={ROUTES.city.path}>Park Ridge</Link>
        <span aria-hidden="true">›</span>
        {blockNeighborhood ? (
          <>
            <Link to={neighborhoodPath(neighborhoodSlugFromId(blockNeighborhood.properties.id))}>
              {blockNeighborhood.properties.label}
            </Link>
            <span aria-hidden="true">›</span>
          </>
        ) : (
          <>
            <Link to={ROUTES.blocks.path}>Blocks</Link>
            <span aria-hidden="true">›</span>
          </>
        )}
        <span aria-current="page">{blockLabel}</span>
      </nav>

      {/* Header */}
      <div className="detail-page-header">
        <div className="detail-page-header-inner">
          <h1 className="detail-page-title">{blockLabel} Block</h1>
          <p className="detail-page-subtitle">
            {blockParcels.length} {blockParcels.length === 1 ? "property" : "properties"}
            {blockNeighborhood ? ` · ${blockNeighborhood.properties.label}` : ""}
            {decodedBlockId ? ` · Block ID: ${decodedBlockId}` : ""}
          </p>
        </div>
        <Link to={ROUTES.explore.path} className="explore-map-btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          Map Explorer
        </Link>
      </div>

      {isLoading ? (
        <div className="page-loading">Loading block data…</div>
      ) : (
        <div className="detail-page-body">
          <GrowthStoryPanel parcels={blockCollection} />
          <ChangeStoryCard scope="block" parcels={blockCollection} />
          <DecadeComparisonTable
            parcels={blockCollection}
            title="Properties on This Block by Decade"
            note="Groups properties by when they were built, with permit and sales signals."
          />
          <BlockPropertyTable
            parcels={blockParcels}
            onSelectProperty={(pin) => navigate(propertyPath(pin))}
          />
          <div className="neighborhood-nav-links">
            {blockNeighborhood && (
              <Link
                to={neighborhoodPath(neighborhoodSlugFromId(blockNeighborhood.properties.id))}
                className="back-link"
              >
                ← {blockNeighborhood.properties.label}
              </Link>
            )}
            <Link to={ROUTES.city.path} className="back-link">← Park Ridge overview</Link>
          </div>
        </div>
      )}
    </div>
  );
}

function BlockPropertyTable({
  parcels,
  onSelectProperty,
}: {
  parcels: ParcelFeature[];
  onSelectProperty: (pin: string) => void;
}) {
  const sorted = useMemo(
    () =>
      [...parcels].sort(
        (a, b) => (a.properties.year_built ?? 9999) - (b.properties.year_built ?? 9999)
      ),
    [parcels]
  );

  if (sorted.length === 0) return null;

  return (
    <section className="block-property-table-section">
      <h2 className="bpt-title">Properties on This Block</h2>
      <div className="bpt-wrap">
        <table className="bpt-table">
          <thead>
            <tr>
              <th>Address</th>
              <th>Year Built</th>
              <th>Permits</th>
              <th>Latest Sale</th>
              <th>Assessment</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((f) => {
              const pin = f.properties.pin_normalized ?? f.properties.pin_original ?? "";
              return (
                <tr key={pin}>
                  <td>
                    <button
                      type="button"
                      className="bpt-address-btn"
                      onClick={() => pin && onSelectProperty(pin)}
                    >
                      {f.properties.address ?? "Unknown"}
                    </button>
                  </td>
                  <td>{f.properties.year_built ?? "N/A"}</td>
                  <td>{f.properties.permit_count ?? "N/A"}</td>
                  <td>
                    {f.properties.latest_sale_year ? (
                      <>
                        {f.properties.latest_sale_year}
                        {f.properties.latest_sale_price
                          ? ` · ${formatCurrency(f.properties.latest_sale_price)}`
                          : ""}
                      </>
                    ) : "N/A"}
                  </td>
                  <td>
                    {f.properties.latest_assessed_total
                      ? formatCurrency(f.properties.latest_assessed_total)
                      : "N/A"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="bpt-note">
        Click an address to view the full property record. Sale prices cover 1999 onward. Assessment values are assessor records, not market value.
      </p>
    </section>
  );
}

function MissingBlock({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="content-page">
      <div className="content-page-inner">
        <div className="error-page">
          <h1 className="error-page-title">Block not found</h1>
          <p className="error-page-body">{message}</p>
          {hint && <p className="error-page-hint">{hint}</p>}
          <div className="error-page-links">
            <Link to={ROUTES.blocks.path} className="error-page-link">Browse blocks</Link>
            <Link to={ROUTES.city.path} className="error-page-link">Park Ridge overview</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
