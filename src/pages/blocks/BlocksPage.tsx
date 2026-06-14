import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useParkRidgeContext } from "../../contexts/ParkRidgeDataContext";
import { blockPath, propertyPath, ROUTES } from "../../routes/routeConfig";

type BlockSummary = {
  blockId: string;
  propertyCount: number;
  medianYear: number | null;
  totalPermits: number;
  label: string;
};

export function BlocksPage() {
  const { pressureDecoratedParcels } = useParkRidgeContext();
  const navigate = useNavigate();

  const blocks = useMemo((): BlockSummary[] => {
    if (!pressureDecoratedParcels) return [];
    const map = new Map<string, BlockSummary>();
    for (const f of pressureDecoratedParcels.features) {
      const id = f.properties.street_block_id;
      if (!id) continue;
      const existing = map.get(id);
      if (existing) {
        existing.propertyCount += 1;
        existing.totalPermits += f.properties.permit_count ?? 0;
      } else {
        const firstAddr = f.properties.address ?? id;
        const streetName = firstAddr.split(" ").slice(1).join(" ") || firstAddr;
        map.set(id, {
          blockId: id,
          propertyCount: 1,
          medianYear: null,
          totalPermits: f.properties.permit_count ?? 0,
          label: streetName
        });
      }
    }
    // Compute median year for each block
    const features = pressureDecoratedParcels.features;
    for (const [id, block] of map) {
      const years = features
        .filter((f) => f.properties.street_block_id === id && typeof f.properties.year_built === "number")
        .map((f) => f.properties.year_built as number)
        .sort((a, b) => a - b);
      if (years.length > 0) {
        const mid = Math.floor(years.length / 2);
        block.medianYear = years.length % 2 !== 0 ? years[mid] : Math.round((years[mid - 1] + years[mid]) / 2);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.propertyCount - a.propertyCount);
  }, [pressureDecoratedParcels]);

  const topOldest = useMemo(
    () => [...blocks].filter((b) => b.medianYear !== null).sort((a, b) => (a.medianYear ?? 9999) - (b.medianYear ?? 9999)).slice(0, 10),
    [blocks]
  );
  const topPermitted = useMemo(
    () => [...blocks].sort((a, b) => b.totalPermits - a.totalPermits).slice(0, 10),
    [blocks]
  );

  const isLoading = !pressureDecoratedParcels;

  return (
    <div className="content-page">
      <div className="content-page-inner">
        <nav className="page-breadcrumb" aria-label="Breadcrumb">
          <Link to={ROUTES.city.path}>Park Ridge</Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">Blocks</span>
        </nav>

        <header className="content-page-header">
          <h1 className="content-page-title">Park Ridge Blocks</h1>
          <p className="content-page-subtitle">
            Blocks are the building blocks of Park Ridge — groups of properties sharing a street or
            census tract. Explore by age, permit activity, or development pattern.
          </p>
          <p className="content-page-note">
            Block boundaries are derived from Census tract and street-level parcel data. They are
            not official city blocks and may include connected parcel groups rather than
            single-street blocks.
          </p>
        </header>

        {isLoading ? (
          <div className="page-loading">Loading block data…</div>
        ) : blocks.length === 0 ? (
          <div className="page-empty">Block data is not available in the current dataset.</div>
        ) : (
          <>
            <p className="blocks-summary">
              {blocks.length.toLocaleString()} distinct block groups identified across{" "}
              {pressureDecoratedParcels!.features.length.toLocaleString()} properties.
            </p>

            <div className="blocks-ranked-grid">
              <RankedBlockList
                title="Oldest Blocks (by median year built)"
                blocks={topOldest}
                valueKey="medianYear"
                formatValue={(b) => b.medianYear ? `Median: ${b.medianYear}` : "Unknown"}
                onSelect={(id) => navigate(blockPath(id))}
              />
              <RankedBlockList
                title="Most Permitted Blocks"
                blocks={topPermitted}
                valueKey="totalPermits"
                formatValue={(b) => `${b.totalPermits.toLocaleString()} total permits`}
                onSelect={(id) => navigate(blockPath(id))}
              />
            </div>

            <p className="page-caveat">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              Blocks are identified from the <code>street_block_id</code> field derived from Census data. Permit records may be incomplete for older work. Assessment data coverage varies.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function RankedBlockList({
  title,
  blocks,
  formatValue,
  onSelect,
}: {
  title: string;
  blocks: BlockSummary[];
  valueKey: keyof BlockSummary;
  formatValue: (b: BlockSummary) => string;
  onSelect: (blockId: string) => void;
}) {
  if (blocks.length === 0) {
    return (
      <div className="ranked-block-list">
        <h3 className="rbl-title">{title}</h3>
        <p className="rbl-empty">No data available.</p>
      </div>
    );
  }
  return (
    <div className="ranked-block-list">
      <h3 className="rbl-title">{title}</h3>
      <ol className="rbl-items">
        {blocks.map((b, i) => (
          <li key={b.blockId} className="rbl-item">
            <span className="rbl-rank">{i + 1}</span>
            <button
              type="button"
              className="rbl-btn"
              onClick={() => onSelect(b.blockId)}
              title={`View block ${b.blockId}`}
            >
              <span className="rbl-label">{b.label}</span>
              <span className="rbl-values">
                <strong className="rbl-value">{formatValue(b)}</strong>
                <span className="rbl-count">{b.propertyCount} properties</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
