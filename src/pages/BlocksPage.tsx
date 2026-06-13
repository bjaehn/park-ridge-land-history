import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Grid3x3, Home, Wrench, DollarSign, TrendingUp } from "lucide-react";
import { useParkRidgeContext } from "../contexts/ParkRidgeDataContext";
import { SearchBox } from "../components/search/SearchBox";
import { StatCard } from "../components/cards/StatCard";
import { RankedInsightCard } from "../components/cards/RankedInsightCard";
import { formatNumber } from "../lib/formatters";
import type { ParcelFeature } from "../lib/parcelTypes";
import "./BlocksPage.css";

type BlockSummary = {
  blockId: string;
  label: string;
  parcelCount: number;
  avgPermits: number;
  avgSales: number;
  oldestYear: number | null;
};

export function BlocksPage() {
  const { parcels, isLoading } = useParkRidgeContext();

  const blockSummaries = useMemo((): BlockSummary[] => {
    if (!parcels) return [];
    const byBlock = new Map<string, ParcelFeature[]>();
    for (const f of parcels.features) {
      const id = f.properties.street_block_id || f.properties.street_block_tract;
      if (!id) continue;
      if (!byBlock.has(id)) byBlock.set(id, []);
      byBlock.get(id)!.push(f);
    }
    const summaries: BlockSummary[] = [];
    for (const [id, features] of byBlock) {
      if (features.length < 3) continue;
      const years = features.map((f) => f.properties.year_built).filter((y): y is number => y != null && y >= 1800);
      const totalPermits = features.reduce((s, f) => s + (f.properties.permit_count ?? 0), 0);
      const totalSales = features.reduce((s, f) => s + (f.properties.sale_count ?? 0), 0);
      const sampleAddr = features[0]?.properties.address ?? "";
      const street = sampleAddr.split(" ").slice(1).join(" ") || id;
      summaries.push({
        blockId: id,
        label: street,
        parcelCount: features.length,
        avgPermits: totalPermits / features.length,
        avgSales: totalSales / features.length,
        oldestYear: years.length ? Math.min(...years) : null,
      });
    }
    return summaries.sort((a, b) => b.parcelCount - a.parcelCount).slice(0, 200);
  }, [parcels]);

  const stats = useMemo(() => ({
    totalBlocks: blockSummaries.length,
    totalParcels: parcels?.features.length ?? 0,
    mostActiveBlock: blockSummaries.sort((a, b) => b.avgPermits - a.avgPermits)[0],
  }), [blockSummaries, parcels]);

  const mostPermitActive = useMemo(() =>
    [...blockSummaries]
      .sort((a, b) => b.avgPermits - a.avgPermits)
      .slice(0, 10)
      .map((b, i) => ({
        pin: b.blockId,
        address: b.label,
        value: b.avgPermits,
        valueLabel: `${b.avgPermits.toFixed(1)} avg permits`,
        secondaryLabel: `${b.parcelCount} properties`,
      })),
    [blockSummaries]
  );

  const mostSalesActive = useMemo(() =>
    [...blockSummaries]
      .sort((a, b) => b.avgSales - a.avgSales)
      .slice(0, 10)
      .map((b) => ({
        pin: b.blockId,
        address: b.label,
        value: b.avgSales,
        valueLabel: `${b.avgSales.toFixed(1)} avg sales`,
        secondaryLabel: `${b.parcelCount} properties`,
      })),
    [blockSummaries]
  );

  const oldest = useMemo(() =>
    [...blockSummaries]
      .filter((b) => b.oldestYear != null)
      .sort((a, b) => (a.oldestYear ?? 9999) - (b.oldestYear ?? 9999))
      .slice(0, 10)
      .map((b) => ({
        pin: b.blockId,
        address: b.label,
        value: b.oldestYear ?? 0,
        valueLabel: `Oldest: ${b.oldestYear}`,
        secondaryLabel: `${b.parcelCount} properties`,
      })),
    [blockSummaries]
  );

  return (
    <div className="page-container">
      <div className="page-hero">
        <span className="page-eyebrow">
          <Grid3x3 size={12} strokeWidth={2.5} aria-hidden="true" />
          Streets & Blocks
        </span>
        <h1 className="page-title">Explore by Block</h1>
        <p className="page-subtitle">
          Analyze permit activity, home ages, and development trends block by block
          across Park Ridge.
        </p>
      </div>

      <div className="search-page-input" style={{ maxWidth: 520, marginBottom: 36 }}>
        <SearchBox placeholder="Search a street or address to find a block…" />
      </div>

      <section className="page-section">
        <div className="grid-3">
          <StatCard label="Identified Blocks" value={formatNumber(stats.totalBlocks)} icon={Grid3x3} accent="blue" />
          <StatCard label="Total Properties" value={formatNumber(stats.totalParcels)} icon={Home} accent="cyan" />
          <StatCard label="Most Active Block" value={stats.mostActiveBlock?.label ?? "—"} subValue="By permit activity" icon={Wrench} accent="amber" />
        </div>
      </section>

      {isLoading ? (
        <div className="loading-spinner">
          <div className="spinner-dot" /><div className="spinner-dot" /><div className="spinner-dot" />
          <span>Loading block data…</span>
        </div>
      ) : (
        <>
          <section className="page-section">
            <div className="section-header">
              <div>
                <span className="section-eyebrow">Ranked by activity</span>
                <h2 className="section-title">Block insights</h2>
              </div>
            </div>
            <div className="grid-3">
              <RankedInsightCard title="Most Permit Activity" icon={Wrench} accentColor="#fbbf24" items={mostPermitActive} />
              <RankedInsightCard title="Most Sales Activity" icon={DollarSign} accentColor="#34d399" items={mostSalesActive} />
              <RankedInsightCard title="Oldest Housing Stock" icon={TrendingUp} accentColor="#c4a97a" items={oldest} />
            </div>
          </section>

          <section className="page-section">
            <div className="section-header">
              <h2 className="section-title">All blocks ({formatNumber(blockSummaries.length)})</h2>
            </div>
            <p className="section-note" style={{ marginBottom: 16 }}>
              Search for an address above to navigate directly to a block's detail view.
              Block analysis uses Census tabulation block boundaries.
            </p>
            <div className="blocks-info-card glass-card">
              <Grid3x3 size={20} strokeWidth={1.5} style={{ color: "#60a5fa" }} aria-hidden="true" />
              <div>
                <strong>How blocks are defined</strong>
                <p>
                  Blocks are assembled from Census TIGER/Line tabulation blocks. When a parcel
                  matches a Census block, all parcels in that Census block are grouped together.
                  The maximum block size is 120 parcels.
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
