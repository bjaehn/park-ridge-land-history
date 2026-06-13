import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Grid3x3, ChevronRight, Home, Wrench, DollarSign, Clock } from "lucide-react";
import { useParkRidgeContext } from "../contexts/ParkRidgeDataContext";
import { StatCard } from "../components/cards/StatCard";
import { RankedInsightCard } from "../components/cards/RankedInsightCard";
import { ParcelMiniMap } from "../components/map/ParcelMiniMap";
import { ROUTES } from "../lib/routes";
import { formatNumber, formatAddress, formatYear, formatCurrency } from "../lib/formatters";
import type { ParcelFeature } from "../lib/parcelTypes";
import "./BlockDetailPage.css";

function deriveBlockName(features: ParcelFeature[]): string {
  if (features.length === 0) return "Unknown Block";
  const streetCounts: Record<string, number> = {};
  const streetNumbers: Record<string, number[]> = {};
  for (const f of features) {
    const addr = (f.properties.address ?? "").trim();
    const match = addr.match(/^(\d+)\s+(.+)$/);
    if (match) {
      const num = parseInt(match[1]);
      const street = match[2].trim();
      streetCounts[street] = (streetCounts[street] ?? 0) + 1;
      if (!streetNumbers[street]) streetNumbers[street] = [];
      streetNumbers[street].push(num);
    }
  }
  const topStreet = Object.entries(streetCounts).sort(([, a], [, b]) => b - a)[0]?.[0];
  if (!topStreet) return formatAddress(features[0]?.properties.address);
  const nums = streetNumbers[topStreet].sort((a, b) => a - b);
  const min = nums[0];
  const max = nums[nums.length - 1];
  const formatted = topStreet.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  return min === max ? `${min} ${formatted}` : `${min}–${max} ${formatted}`;
}

export function BlockDetailPage() {
  const { blockId: rawBlockId } = useParams<{ blockId: string }>();
  const { parcels, boundary, isLoading } = useParkRidgeContext();

  const blockId = rawBlockId ? decodeURIComponent(rawBlockId) : null;

  const blockFeatures = useMemo(() => {
    if (!parcels || !blockId) return [];
    return parcels.features.filter(
      (f) => f.properties.street_block_id === blockId || f.properties.street_block_tract === blockId
    );
  }, [parcels, blockId]);

  const blockName = useMemo(() => deriveBlockName(blockFeatures), [blockFeatures]);

  const stats = useMemo(() => {
    const years = blockFeatures.map((f) => f.properties.year_built).filter((y): y is number => y != null && y >= 1800);
    const totalPermits = blockFeatures.reduce((s, f) => s + (f.properties.permit_count ?? 0), 0);
    const totalSales = blockFeatures.reduce((s, f) => s + (f.properties.sale_count ?? 0), 0);
    const avgAssessment = blockFeatures.length > 0
      ? blockFeatures.reduce((s, f) => s + (f.properties.latest_assessed_total ?? 0), 0) / blockFeatures.length
      : 0;
    return {
      parcelCount: blockFeatures.length,
      avgYearBuilt: years.length ? Math.round(years.reduce((a, b) => a + b, 0) / years.length) : null,
      oldestYear: years.length ? Math.min(...years) : null,
      totalPermits,
      totalSales,
      avgAssessment,
    };
  }, [blockFeatures]);

  const highlightPins = useMemo(
    () => new Set(blockFeatures.map((f) => f.properties.pin_normalized || f.properties.pin_original || "")),
    [blockFeatures]
  );

  const mostPermits = useMemo(() =>
    [...blockFeatures]
      .filter((f) => (f.properties.permit_count ?? 0) > 0)
      .sort((a, b) => (b.properties.permit_count ?? 0) - (a.properties.permit_count ?? 0))
      .slice(0, 8)
      .map((f) => {
        const pin = f.properties.pin_normalized || f.properties.pin_original || "";
        return {
          pin,
          address: f.properties.address || "Unknown",
          value: f.properties.permit_count ?? 0,
          valueLabel: `${f.properties.permit_count} permit${(f.properties.permit_count ?? 0) !== 1 ? "s" : ""}`,
          secondaryLabel: f.properties.latest_permit_year ? `Last: ${f.properties.latest_permit_year}` : undefined,
        };
      }),
    [blockFeatures]
  );

  const mostSales = useMemo(() =>
    [...blockFeatures]
      .filter((f) => (f.properties.sale_count ?? 0) > 0)
      .sort((a, b) => (b.properties.sale_count ?? 0) - (a.properties.sale_count ?? 0))
      .slice(0, 8)
      .map((f) => {
        const pin = f.properties.pin_normalized || f.properties.pin_original || "";
        return {
          pin,
          address: f.properties.address || "Unknown",
          value: f.properties.sale_count ?? 0,
          valueLabel: `${f.properties.sale_count} sale${(f.properties.sale_count ?? 0) !== 1 ? "s" : ""}`,
          secondaryLabel: f.properties.latest_sale_price ? formatCurrency(f.properties.latest_sale_price) : undefined,
        };
      }),
    [blockFeatures]
  );

  const oldest = useMemo(() =>
    [...blockFeatures]
      .filter((f) => f.properties.year_built && f.properties.year_built >= 1800)
      .sort((a, b) => (a.properties.year_built ?? 9999) - (b.properties.year_built ?? 9999))
      .slice(0, 8)
      .map((f) => {
        const pin = f.properties.pin_normalized || f.properties.pin_original || "";
        const age = new Date().getFullYear() - (f.properties.year_built ?? 0);
        return {
          pin,
          address: f.properties.address || "Unknown",
          value: f.properties.year_built ?? 0,
          valueLabel: `Built ${f.properties.year_built}`,
          secondaryLabel: `${age} years old`,
        };
      }),
    [blockFeatures]
  );

  if (!blockId) {
    return (
      <div className="page-container">
        <div className="empty-state">No block ID specified.</div>
      </div>
    );
  }

  if (!isLoading && blockFeatures.length === 0) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <p>Block not found.</p>
          <Link to={ROUTES.blocks} className="link-pill" style={{ marginTop: 16 }}>
            Back to blocks
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container-wide block-detail-page">
      {/* ─── Breadcrumb ─── */}
      <nav className="property-breadcrumb" aria-label="Block location">
        <Link to={ROUTES.discover} className="breadcrumb-link">Park Ridge</Link>
        <ChevronRight size={12} strokeWidth={2} aria-hidden="true" />
        <Link to={ROUTES.blocks} className="breadcrumb-link">Blocks</Link>
        <ChevronRight size={12} strokeWidth={2} aria-hidden="true" />
        <span className="breadcrumb-current">{blockName}</span>
      </nav>

      {/* ─── Header ─── */}
      <header className="block-detail-header">
        <div className="block-detail-header-icon">
          <Grid3x3 size={22} strokeWidth={1.8} aria-hidden="true" />
        </div>
        <div>
          <span className="page-eyebrow">
            <Grid3x3 size={11} strokeWidth={2.5} aria-hidden="true" />
            Block
          </span>
          <h1 className="property-title">{isLoading ? "Loading…" : blockName}</h1>
          <p className="property-meta-row" style={{ marginTop: 4 }}>
            Census tabulation block · {formatNumber(stats.parcelCount)} properties
          </p>
        </div>
      </header>

      {isLoading ? (
        <div className="loading-spinner">
          <div className="spinner-dot" /><div className="spinner-dot" /><div className="spinner-dot" />
          <span>Loading block data…</span>
        </div>
      ) : (
        <>
          {/* ─── Stats ─── */}
          <section className="page-section">
            <div className="grid-4">
              <StatCard label="Properties" value={formatNumber(stats.parcelCount)} icon={Home} accent="blue" />
              <StatCard
                label="Avg Year Built"
                value={formatYear(stats.avgYearBuilt)}
                subValue={stats.oldestYear ? `Oldest: ${stats.oldestYear}` : undefined}
                icon={Clock}
                accent="amber"
              />
              <StatCard
                label="Total Permits"
                value={formatNumber(stats.totalPermits)}
                subValue={`${(stats.totalPermits / Math.max(stats.parcelCount, 1)).toFixed(1)} per property`}
                icon={Wrench}
                accent="amber"
              />
              <StatCard
                label="Total Sales"
                value={formatNumber(stats.totalSales)}
                subValue={`${(stats.totalSales / Math.max(stats.parcelCount, 1)).toFixed(1)} per property`}
                icon={DollarSign}
                accent="green"
              />
            </div>
          </section>

          {/* ─── Map + Rankings ─── */}
          <div className="block-detail-layout">
            <div className="block-detail-map">
              <div className="section-header" style={{ marginBottom: 12 }}>
                <h2 className="section-title">Block Map</h2>
              </div>
              <ParcelMiniMap
                allParcels={parcels}
                boundary={boundary}
                highlightPins={highlightPins}
                height={320}
              />
            </div>

            <div className="block-detail-rankings">
              <div className="section-header" style={{ marginBottom: 12 }}>
                <h2 className="section-title">Ranked Properties</h2>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <RankedInsightCard title="Most Permit Activity" icon={Wrench} accentColor="#fbbf24" items={mostPermits} />
                <RankedInsightCard title="Most Sales" icon={DollarSign} accentColor="#34d399" items={mostSales} />
                <RankedInsightCard title="Oldest Homes" icon={Clock} accentColor="#c4a97a" items={oldest} />
              </div>
            </div>
          </div>

          {/* ─── Property List ─── */}
          <section className="page-section">
            <div className="section-header">
              <div>
                <span className="section-eyebrow">All properties</span>
                <h2 className="section-title">On this block ({formatNumber(blockFeatures.length)})</h2>
              </div>
            </div>
            <div className="block-property-grid">
              {blockFeatures
                .slice()
                .sort((a, b) => {
                  const numA = parseInt((a.properties.address ?? "").match(/^\d+/)?.[0] ?? "0");
                  const numB = parseInt((b.properties.address ?? "").match(/^\d+/)?.[0] ?? "0");
                  return numA - numB;
                })
                .map((f) => {
                  const pin = f.properties.pin_normalized || f.properties.pin_original || "";
                  return (
                    <Link key={pin} to={ROUTES.property(pin)} className="block-property-card">
                      <div className="block-property-address">{formatAddress(f.properties.address)}</div>
                      <div className="block-property-meta">
                        {f.properties.year_built && (
                          <span>Built {f.properties.year_built}</span>
                        )}
                        {(f.properties.permit_count ?? 0) > 0 && (
                          <span className="meta-permits">{f.properties.permit_count} permits</span>
                        )}
                        {(f.properties.sale_count ?? 0) > 0 && (
                          <span className="meta-sales">{f.properties.sale_count} sales</span>
                        )}
                      </div>
                    </Link>
                  );
                })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
