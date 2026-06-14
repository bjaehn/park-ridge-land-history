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
import { EmbeddedMap } from "../../components/EmbeddedMap";
import { parcelCollectionFromFeatures } from "../../lib/physicalBlock";
import { formatCurrency, eraLabel } from "../../lib/formatters";
import { colorForDecade } from "../../lib/colorScales";
import type { ParcelFeature } from "../../lib/parcelTypes";

const emptyHotspots = { type: "FeatureCollection" as const, features: [] };

export function BlockDetailPage() {
  const { blockId } = useParams<{ blockId: string }>();
  const navigate = useNavigate();
  const { pressureDecoratedParcels } = useParkRidgeContext();

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

  // Historical stats for the block
  const blockStats = useMemo(() => {
    const years = blockParcels
      .map((f) => f.properties.year_built)
      .filter((y): y is number => typeof y === "number" && y > 1800 && y < 2030)
      .sort((a, b) => a - b);
    if (!years.length) return null;
    const oldest = years[0];
    const newest = years[years.length - 1];
    const median = years[Math.floor(years.length / 2)];
    const decadeCounts = new Map<number, number>();
    years.forEach((y) => {
      const d = Math.floor(y / 10) * 10;
      decadeCounts.set(d, (decadeCounts.get(d) ?? 0) + 1);
    });
    let peakDecadeYear = 0, peakDecadeCount = 0;
    decadeCounts.forEach((count, decade) => {
      if (count > peakDecadeCount) { peakDecadeCount = count; peakDecadeYear = decade; }
    });
    return {
      oldest,
      newest,
      median,
      peakDecade: peakDecadeYear > 0 ? `${peakDecadeYear}s` : null,
      yearCount: years.length,
    };
  }, [blockParcels]);

  const oldestParcel = useMemo(
    () =>
      blockParcels
        .filter((f) => typeof f.properties.year_built === "number")
        .sort((a, b) => (a.properties.year_built ?? 9999) - (b.properties.year_built ?? 9999))[0] ?? null,
    [blockParcels]
  );

  const parcelsByYear = useMemo(
    () =>
      [...blockParcels]
        .filter((f) => typeof f.properties.year_built === "number")
        .sort((a, b) => (a.properties.year_built ?? 9999) - (b.properties.year_built ?? 9999)),
    [blockParcels]
  );

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

  const era = blockStats?.median ? eraLabel(blockStats.median) : null;

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
          <h1 className="detail-page-title">{blockLabel}</h1>
          <p className="detail-page-subtitle">
            {blockStats
              ? `Built ${blockStats.oldest}–${blockStats.newest}`
              : `${blockParcels.length} ${blockParcels.length === 1 ? "property" : "properties"}`}
            {blockNeighborhood ? ` · ${blockNeighborhood.properties.label}` : ""}
            {era ? ` · ${era}` : ""}
          </p>
        </div>
        <Link to={ROUTES.explore.path} className="explore-map-btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          Full Map
        </Link>
      </div>

      {isLoading ? (
        <div className="page-loading">Loading block data…</div>
      ) : (
        <div className="detail-page-body">

          {/* ── Geography caveat ──────────────────────────────────── */}
          <div className="geo-caveat-notice" role="note">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <span>
              This block area is based on Census tabulation geography and may not match how residents
              describe a block. Properties on a physical corner block may appear in different Census
              block groupings.
            </span>
          </div>

          {/* ── Era banner ────────────────────────────────────────── */}
          {blockStats && era && (
            <div className="block-era-banner">
              <div className="beb-top">
                <span className="beb-era">{era}</span>
                <span className="beb-range">
                  {blockStats.oldest}–{blockStats.newest}
                  {blockStats.peakDecade ? ` · Peak: ${blockStats.peakDecade}` : ""}
                </span>
              </div>
              <div className="beb-stats">
                <div className="beb-stat">
                  <span className="beb-stat-value">{blockStats.oldest}</span>
                  <span className="beb-stat-label">Oldest known</span>
                </div>
                <div className="beb-stat">
                  <span className="beb-stat-value">{blockStats.newest}</span>
                  <span className="beb-stat-label">Newest known</span>
                </div>
                <div className="beb-stat">
                  <span className="beb-stat-value">{blockStats.median}</span>
                  <span className="beb-stat-label">Typical year</span>
                </div>
                <div className="beb-stat">
                  <span className="beb-stat-value">{blockParcels.length}</span>
                  <span className="beb-stat-label">Properties</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Block map ─────────────────────────────────────────── */}
          <div className="block-map-section">
            <div className="block-map-header">
              <p className="block-map-title">Block map — colored by decade built</p>
              <span className="block-map-note">Click a parcel to view its full record</span>
            </div>
            <EmbeddedMap
              parcels={blockParcels}
              onSelectParcel={(pin) => navigate(propertyPath(pin))}
              height={260}
            />
          </div>

          {/* ── Build order timeline ──────────────────────────────── */}
          {parcelsByYear.length > 0 && (
            <div className="block-build-timeline">
              <p className="bbt-label">Build order on this block</p>
              <div className="bbt-row">
                {parcelsByYear.map((f) => {
                  const pin = f.properties.pin_normalized ?? f.properties.pin_original ?? "";
                  const year = f.properties.year_built!;
                  const decade = `${Math.floor(year / 10) * 10}s`;
                  const color = colorForDecade(decade);
                  const streetNum = (f.properties.address ?? "").split(" ")[0] ?? "";
                  return (
                    <button
                      key={pin}
                      type="button"
                      className="bbt-chip"
                      style={{ borderColor: color, backgroundColor: `${color}22` }}
                      onClick={() => pin && navigate(propertyPath(pin))}
                      title={f.properties.address ?? ""}
                    >
                      <span className="bbt-chip-year" style={{ color }}>{year}</span>
                      {streetNum && <span className="bbt-chip-addr">{streetNum}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Oldest home on block ──────────────────────────────── */}
          {oldestParcel && (
            <div className="block-oldest-callout">
              <div className="boc-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <div className="boc-body">
                <p className="boc-eyebrow">Oldest known home on this block</p>
                <p className="boc-address">{oldestParcel.properties.address ?? "Unknown address"}</p>
                <p className="boc-year">Built {oldestParcel.properties.year_built}</p>
                <button
                  type="button"
                  className="boc-link"
                  onClick={() => {
                    const pin = oldestParcel.properties.pin_normalized ?? oldestParcel.properties.pin_original;
                    if (pin) navigate(propertyPath(pin));
                  }}
                >
                  View full property record →
                </button>
              </div>
            </div>
          )}

          {/* ── Growth story (existing) ───────────────────────────── */}
          <GrowthStoryPanel parcels={blockCollection} />
          <ChangeStoryCard scope="block" parcels={blockCollection} />

          {/* ── Decade breakdown ─────────────────────────────────── */}
          <DecadeComparisonTable
            parcels={blockCollection}
            title="Properties on This Block by Decade"
            note="Groups properties by when they were built, with permit and sales signals."
          />

          {/* ── Full property table ───────────────────────────────── */}
          <BlockPropertyTable
            parcels={blockParcels}
            onSelectProperty={(pin) => navigate(propertyPath(pin))}
          />

          {/* ── Navigation ───────────────────────────────────────── */}
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
      <h2 className="bpt-title">All Properties on This Block</h2>
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
                  <td>{f.properties.year_built ?? "—"}</td>
                  <td>{f.properties.permit_count ?? "—"}</td>
                  <td>
                    {f.properties.latest_sale_year ? (
                      <>
                        {f.properties.latest_sale_year}
                        {f.properties.latest_sale_price
                          ? ` · ${formatCurrency(f.properties.latest_sale_price)}`
                          : ""}
                      </>
                    ) : "—"}
                  </td>
                  <td>
                    {f.properties.latest_assessed_total
                      ? formatCurrency(f.properties.latest_assessed_total)
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="bpt-note">
        Click any address to view the full property record. Sale prices cover 1999 onward. Assessment values are assessor records, not market value.
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
