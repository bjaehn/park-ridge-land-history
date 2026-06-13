import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Grid3x3, ChevronRight, Home, Wrench, DollarSign, Clock, TrendingUp, MapPin, BarChart2 } from "lucide-react";
import { useParkRidgeContext } from "../contexts/ParkRidgeDataContext";
import { StatCard } from "../components/cards/StatCard";
import { RankedInsightCard } from "../components/cards/RankedInsightCard";
import { GrowthStoryPanel } from "../components/narrative/GrowthStoryPanel";
import { ParcelMiniMap } from "../components/map/ParcelMiniMap";
import { AISummaryPlaceholder } from "../components/cards/AISummaryPlaceholder";
import { DataCoverageNotice } from "../components/cards/DataCoverageNotice";
import { buildAreaSummaries } from "../lib/areaGroups";
import {
  topMostSold, topMostPermits, topOldestHomes, topNewestHomes,
  topLargestAssessmentChange, topMostRedevelopment,
} from "../lib/rankings";
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

  const parentNeighborhood = useMemo(() => {
    if (blockFeatures.length === 0 || !parcels) return null;
    try {
      const mini = { type: "FeatureCollection" as const, features: blockFeatures };
      const summaries = buildAreaSummaries(mini as typeof parcels, "neighborhoods", { type: "FeatureCollection", features: [] });
      return summaries.features
        .sort((a, b) => b.properties.parcelCount - a.properties.parcelCount)[0]
        ?.properties ?? null;
    } catch {
      return null;
    }
  }, [blockFeatures, parcels]);

  const stats = useMemo(() => {
    const years = blockFeatures
      .map((f) => f.properties.year_built)
      .filter((y): y is number => y != null && y >= 1800 && y <= 2030);
    const totalPermits = blockFeatures.reduce((s, f) => s + (f.properties.permit_count ?? 0), 0);
    const totalSales = blockFeatures.reduce((s, f) => s + (f.properties.sale_count ?? 0), 0);
    const assessedValues = blockFeatures
      .map((f) => f.properties.latest_assessed_total)
      .filter((v): v is number => v != null && v > 0);
    return {
      parcelCount: blockFeatures.length,
      oldestYear: years.length ? Math.min(...years) : null,
      newestYear: years.length ? Math.max(...years) : null,
      knownYears: years.length,
      totalPermits,
      totalSales,
      avgAssessment: assessedValues.length
        ? assessedValues.reduce((a, b) => a + b, 0) / assessedValues.length
        : null,
    };
  }, [blockFeatures]);

  const highlightPins = useMemo(
    () => new Set(blockFeatures.map((f) => f.properties.pin_normalized || f.properties.pin_original || "")),
    [blockFeatures]
  );

  const rankings = useMemo(() => ({
    mostPermits: topMostPermits(blockFeatures, 8),
    mostSold: topMostSold(blockFeatures, 8),
    oldest: topOldestHomes(blockFeatures, 8),
    newest: topNewestHomes(blockFeatures, 8),
    assessChange: topLargestAssessmentChange(blockFeatures, 8),
    redevelopment: topMostRedevelopment(blockFeatures, 8),
  }), [blockFeatures]);

  if (!blockId) {
    return (
      <div className="page-container"><div className="empty-state">No block ID specified.</div></div>
    );
  }

  if (!isLoading && blockFeatures.length === 0) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <p>Block not found.</p>
          <Link to={ROUTES.blocks} className="link-pill" style={{ marginTop: 16 }}>Back to blocks</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container-wide block-detail-page">
      {/* ── Breadcrumb ── */}
      <nav className="property-breadcrumb" aria-label="Block location">
        <Link to={ROUTES.discover} className="breadcrumb-link">Park Ridge</Link>
        <ChevronRight size={12} strokeWidth={2} aria-hidden="true" />
        {parentNeighborhood && (
          <>
            <Link to={ROUTES.neighborhood(parentNeighborhood.id)} className="breadcrumb-link">
              {parentNeighborhood.label}
            </Link>
            <ChevronRight size={12} strokeWidth={2} aria-hidden="true" />
          </>
        )}
        <Link to={ROUTES.blocks} className="breadcrumb-link">Blocks</Link>
        <ChevronRight size={12} strokeWidth={2} aria-hidden="true" />
        <span className="breadcrumb-current">{blockName}</span>
      </nav>

      {/* ── Header ── */}
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
            {parentNeighborhood && (
              <>
                {" · "}
                <Link to={ROUTES.neighborhood(parentNeighborhood.id)} style={{ color: "#34d399", textDecoration: "none" }}>
                  <MapPin size={10} strokeWidth={2.5} style={{ display: "inline", verticalAlign: "middle" }} aria-hidden="true" />
                  {" "}{parentNeighborhood.label}
                </Link>
              </>
            )}
          </p>
        </div>
        <Link to={ROUTES.parkRidge} className="property-context-link" style={{ marginLeft: "auto" }}>
          <TrendingUp size={13} strokeWidth={2} aria-hidden="true" />
          Park Ridge
        </Link>
      </header>

      {isLoading ? (
        <div className="loading-spinner">
          <div className="spinner-dot" /><div className="spinner-dot" /><div className="spinner-dot" />
          <span>Loading block data…</span>
        </div>
      ) : (
        <>
          {/* ── Stats ── */}
          <section className="page-section">
            <div className="grid-4">
              <StatCard label="Properties" value={formatNumber(stats.parcelCount)} icon={Home} accent="blue" />
              <StatCard
                label="Development Span"
                value={formatYear(stats.oldestYear)}
                subValue={stats.newestYear ? `to ${formatYear(stats.newestYear)}` : undefined}
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

          {/* ── Growth Story ── */}
          <section className="page-section">
            <GrowthStoryPanel
              features={blockFeatures}
              entityName={blockName}
              entityType="block"
            />
          </section>

          {/* ── Map + Rankings ── */}
          <div className="block-detail-layout">
            <div className="block-detail-map">
              <div className="section-header" style={{ marginBottom: 12 }}>
                <h2 className="section-title">Block map</h2>
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
                <h2 className="section-title">Ranked properties</h2>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <RankedInsightCard title="Most Permit Activity" icon={Wrench} accentColor="#fbbf24" items={rankings.mostPermits} />
                  <p className="block-data-note">Cook County permit records begin 2019.</p>
                </div>
                <RankedInsightCard title="Most Sales" icon={DollarSign} accentColor="#34d399" items={rankings.mostSold} />
                <RankedInsightCard title="Oldest Homes" icon={Clock} accentColor="#c4a97a" items={rankings.oldest} />
              </div>
            </div>
          </div>

          {/* ── Extended Rankings ── */}
          <section className="page-section">
            <div className="section-header">
              <div>
                <span className="section-eyebrow">Additional rankings</span>
                <h2 className="section-title">More comparisons</h2>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
              <RankedInsightCard title="Newest Builds" icon={Home} accentColor="#22d3ee" items={rankings.newest} />
              <RankedInsightCard title="Largest Assessment Δ" icon={BarChart2} accentColor="#a78bfa" items={rankings.assessChange} />
              <RankedInsightCard title="Redevelopment Signal" icon={TrendingUp} accentColor="#f87171" items={rankings.redevelopment} />
            </div>
          </section>

          {/* ── Property List ── */}
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
                        {f.properties.year_built && <span>Built {f.properties.year_built}</span>}
                        {(f.properties.permit_count ?? 0) > 0 && (
                          <span className="meta-permits">{f.properties.permit_count} permits</span>
                        )}
                        {(f.properties.sale_count ?? 0) > 0 && (
                          <span className="meta-sales">{f.properties.sale_count} sales</span>
                        )}
                        {f.properties.latest_assessed_total && (
                          <span className="meta-assessment">{formatCurrency(f.properties.latest_assessed_total)}</span>
                        )}
                      </div>
                    </Link>
                  );
                })}
            </div>
          </section>

          {/* ── Data Coverage ── */}
          <section className="page-section">
            <DataCoverageNotice
              message={`Data coverage for ${blockName}:`}
              items={[
                "Permit records from Cook County Assessor begin 2019. Earlier permit activity is not reflected.",
                `${stats.knownYears} of ${stats.parcelCount} properties have a recorded year built.`,
                "Census block boundaries follow street centerlines and may not match physical block perception.",
              ]}
            />
          </section>

          {/* ── AI Placeholder ── */}
          <section className="page-section">
            <AISummaryPlaceholder entityType="block" entityName={blockName} />
          </section>
        </>
      )}
    </div>
  );
}
