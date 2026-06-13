import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { MapPin, Home, Wrench, DollarSign, ChevronRight, TrendingUp, Grid3x3, BarChart2, Clock } from "lucide-react";
import { useParkRidgeContext } from "../contexts/ParkRidgeDataContext";
import { StatCard } from "../components/cards/StatCard";
import { RankedInsightCard } from "../components/cards/RankedInsightCard";
import { GrowthStoryPanel } from "../components/narrative/GrowthStoryPanel";
import { ParcelMiniMap } from "../components/map/ParcelMiniMap";
import { AISummaryPlaceholder } from "../components/cards/AISummaryPlaceholder";
import { DataCoverageNotice } from "../components/cards/DataCoverageNotice";
import { buildAreaSummaries } from "../lib/areaGroups";
import { decoratePermitPressure } from "../lib/permitPressure";
import { buildBlockSummaries, blockSummariesToRanked } from "../lib/blockSummaries";
import {
  topMostSold, topMostPermits, topOldestHomes, topNewestHomes,
  topLargestAssessmentChange, topMostRedevelopment,
} from "../lib/rankings";
import { ROUTES } from "../lib/routes";
import { formatNumber, formatYear, formatCurrency } from "../lib/formatters";
import "./NeighborhoodDetailPage.css";

export function NeighborhoodDetailPage() {
  const { neighborhoodId } = useParams<{ neighborhoodId: string }>();
  const { parcels, boundary, isLoading } = useParkRidgeContext();

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

  const highlightPins = useMemo(
    () => new Set(neighborhoodParcels.map((f) => f.properties.pin_normalized || f.properties.pin_original || "")),
    [neighborhoodParcels]
  );

  const stats = useMemo(() => {
    const years = neighborhoodParcels
      .map((f) => f.properties.year_built)
      .filter((y): y is number => y != null && y >= 1800 && y <= 2030);
    const totalPermits = neighborhoodParcels.reduce((s, f) => s + (f.properties.permit_count ?? 0), 0);
    const totalSales = neighborhoodParcels.reduce((s, f) => s + (f.properties.sale_count ?? 0), 0);
    const assessedValues = neighborhoodParcels
      .map((f) => f.properties.latest_assessed_total)
      .filter((v): v is number => v != null && v > 0);
    const blockSet = new Set(neighborhoodParcels.map((f) => f.properties.street_block_id).filter(Boolean));
    return {
      count: neighborhoodParcels.length,
      blockCount: blockSet.size,
      oldestYear: years.length ? Math.min(...years) : null,
      newestYear: years.length ? Math.max(...years) : null,
      knownYears: years.length,
      totalPermits,
      totalSales,
      avgAssessment: assessedValues.length
        ? assessedValues.reduce((a, b) => a + b, 0) / assessedValues.length
        : null,
    };
  }, [neighborhoodParcels]);

  const blockSummaries = useMemo(() => buildBlockSummaries(neighborhoodParcels), [neighborhoodParcels]);

  const rankings = useMemo(() => ({
    mostSold: topMostSold(neighborhoodParcels, 8),
    mostPermits: topMostPermits(neighborhoodParcels, 8),
    oldest: topOldestHomes(neighborhoodParcels, 8),
    newest: topNewestHomes(neighborhoodParcels, 8),
    assessChange: topLargestAssessmentChange(neighborhoodParcels, 8),
    redevelopment: topMostRedevelopment(neighborhoodParcels, 8),
    // Block-level rankings within this neighborhood
    oldestBlocks: blockSummariesToRanked(
      blockSummaries, "oldestYear",
      (b) => `Oldest: ${b.oldestYear}`,
      (b) => `${b.parcelCount} properties`,
      "asc"
    ),
    mostPermitBlocks: blockSummariesToRanked(
      blockSummaries, "totalPermits",
      (b) => `${b.totalPermits} total permits`,
      (b) => `${b.avgPermits.toFixed(1)} per property`
    ),
    mostSalesBlocks: blockSummariesToRanked(
      blockSummaries, "totalSales",
      (b) => `${b.totalSales} total sales`,
      (b) => `${b.avgSales.toFixed(1)} per property`
    ),
    redevelopmentBlocks: blockSummariesToRanked(
      blockSummaries, "redevelopmentScore",
      (b) => `Score: ${b.redevelopmentScore}`,
      (b) => `${b.parcelCount} properties`
    ),
  }), [neighborhoodParcels, blockSummaries]);

  if (!id) {
    return <div className="page-container"><div className="empty-state">No neighborhood specified.</div></div>;
  }
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

  const label = neighborhood?.label ?? "…";

  return (
    <div className="page-container-wide neighborhood-detail-page">
      {/* ── Breadcrumb ── */}
      <nav className="property-breadcrumb" aria-label="Breadcrumb">
        <Link to={ROUTES.discover} className="breadcrumb-link">Park Ridge</Link>
        <ChevronRight size={12} strokeWidth={2} aria-hidden="true" />
        <Link to={ROUTES.neighborhoods} className="breadcrumb-link">Neighborhoods</Link>
        <ChevronRight size={12} strokeWidth={2} aria-hidden="true" />
        <span className="breadcrumb-current">{label}</span>
      </nav>

      {/* ── Header ── */}
      <header className="neighborhood-detail-header">
        <div className="neighborhood-detail-icon">
          <MapPin size={22} strokeWidth={1.8} aria-hidden="true" />
        </div>
        <div>
          <span className="page-eyebrow">
            <MapPin size={11} strokeWidth={2.5} aria-hidden="true" />
            Neighborhood
          </span>
          <h1 className="property-title">{isLoading ? "Loading…" : label}</h1>
          <p className="property-meta-row" style={{ marginTop: 4 }}>
            {formatNumber(stats.count)} properties · {formatNumber(stats.blockCount)} blocks ·
            Signal: {neighborhood?.signal?.replace(/_/g, " ")}
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
          <span>Loading neighborhood data…</span>
        </div>
      ) : (
        <>
          {/* ── Stats ── */}
          <section className="page-section">
            <div className="grid-4">
              <StatCard label="Properties" value={formatNumber(stats.count)} icon={Home} accent="cyan" />
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
                subValue={`${(stats.totalPermits / Math.max(stats.count, 1)).toFixed(1)} per property`}
                icon={Wrench}
                accent="amber"
              />
              <StatCard
                label="Total Sales"
                value={formatNumber(stats.totalSales)}
                subValue={`${(stats.totalSales / Math.max(stats.count, 1)).toFixed(1)} per property`}
                icon={DollarSign}
                accent="green"
              />
            </div>
          </section>

          {/* ── Growth Story + Map ── */}
          <div className="neighborhood-detail-layout">
            <div className="neighborhood-detail-story">
              <section className="page-section" style={{ marginBottom: 0 }}>
                <GrowthStoryPanel
                  features={neighborhoodParcels}
                  entityName={label}
                  entityType="neighborhood"
                />
              </section>
            </div>

            <div className="neighborhood-detail-map">
              <div className="section-header" style={{ marginBottom: 12 }}>
                <h2 className="section-title">Neighborhood map</h2>
                <span className="section-note">{formatNumber(stats.count)} parcels</span>
              </div>
              <ParcelMiniMap
                allParcels={parcels}
                boundary={boundary}
                highlightPins={highlightPins}
                height={340}
              />
            </div>
          </div>

          {/* ── Neighborhood Character ── */}
          <section className="page-section">
            <div className="section-header">
              <div>
                <span className="section-eyebrow">Neighborhood character</span>
                <h2 className="section-title">Development signals</h2>
              </div>
            </div>
            <div className="glass-card neighborhood-character-grid">
              <CharacterItem
                label="Pre-1945 homes"
                value={formatNumber(neighborhood?.olderHomeCount ?? 0)}
                sub={`${stats.count > 0 ? Math.round(((neighborhood?.olderHomeCount ?? 0) / stats.count) * 100) : 0}% of properties`}
                color="#c4a97a"
              />
              <CharacterItem
                label="New construction"
                value={formatNumber(neighborhood?.newConstructionCount ?? 0)}
                sub="properties built 2000+"
                color="#22d3ee"
              />
              <CharacterItem
                label="Teardown pressure"
                value={formatNumber(neighborhood?.teardownPressureCount ?? 0)}
                sub="direct teardown signals"
                color="#f87171"
              />
              <CharacterItem
                label="Avg assessment"
                value={stats.avgAssessment ? formatCurrency(stats.avgAssessment) : "—"}
                sub="latest assessed value"
                color="#a78bfa"
              />
            </div>
          </section>

          {/* ── Property Rankings ── */}
          <section className="page-section">
            <div className="section-header">
              <div>
                <span className="section-eyebrow">Notable properties</span>
                <h2 className="section-title">Ranked by activity</h2>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 16 }}>
              <RankedInsightCard title="Most Sales" icon={DollarSign} accentColor="#34d399" items={rankings.mostSold} />
              <RankedInsightCard title="Most Permits" icon={Wrench} accentColor="#fbbf24" items={rankings.mostPermits} />
              <RankedInsightCard title="Largest Assessment Δ" icon={BarChart2} accentColor="#a78bfa" items={rankings.assessChange} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
              <RankedInsightCard title="Oldest Homes" icon={Clock} accentColor="#c4a97a" items={rankings.oldest} />
              <RankedInsightCard title="Newest Builds" icon={Home} accentColor="#22d3ee" items={rankings.newest} />
              <RankedInsightCard title="Redevelopment Signal" icon={TrendingUp} accentColor="#f87171" items={rankings.redevelopment} />
            </div>
          </section>

          {/* ── Block Comparisons ── */}
          {blockSummaries.length > 0 && (
            <section className="page-section">
              <div className="section-header">
                <div>
                  <span className="section-eyebrow">Blocks within {label}</span>
                  <h2 className="section-title">Block comparisons</h2>
                </div>
                <span className="section-note">{formatNumber(stats.blockCount)} blocks</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
                <RankedInsightCard title="Oldest Blocks" icon={Clock} accentColor="#c4a97a" items={rankings.oldestBlocks} />
                <RankedInsightCard title="Most Permit Activity" icon={Wrench} accentColor="#fbbf24" items={rankings.mostPermitBlocks} />
                <RankedInsightCard title="Most Sales Activity" icon={DollarSign} accentColor="#34d399" items={rankings.mostSalesBlocks} />
                <RankedInsightCard title="Redevelopment Signal" icon={Grid3x3} accentColor="#f87171" items={rankings.redevelopmentBlocks} />
              </div>
            </section>
          )}

          {/* ── Data Coverage ── */}
          <section className="page-section">
            <DataCoverageNotice
              message={`Data coverage for ${label}:`}
              items={[
                "Permit records from Cook County Assessor begin 2019. Earlier permit activity is not reflected.",
                `${stats.knownYears} of ${stats.count} properties have a recorded year built (${Math.round((stats.knownYears / Math.max(stats.count, 1)) * 100)}%).`,
                "Neighborhood boundaries are approximate geographic ranges, not official municipal designations.",
              ]}
            />
          </section>

          {/* ── AI Placeholder ── */}
          <section className="page-section">
            <AISummaryPlaceholder entityType="neighborhood" entityName={label} />
          </section>
        </>
      )}
    </div>
  );
}

function CharacterItem({
  label, value, sub, color,
}: {
  label: string; value: string; sub: string; color: string;
}) {
  return (
    <div className="neighborhood-character-item">
      <strong className="neighborhood-character-value" style={{ color }}>{value}</strong>
      <span className="neighborhood-character-label">{label}</span>
      <span className="neighborhood-character-sub">{sub}</span>
    </div>
  );
}
