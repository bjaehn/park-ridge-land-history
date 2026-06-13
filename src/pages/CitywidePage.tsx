import { useMemo } from "react";
import { TrendingUp, Home, Wrench, DollarSign, Clock, BarChart2, MapPin, Grid3x3 } from "lucide-react";
import { Link } from "react-router-dom";
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
import { formatNumber, formatYear, formatCurrency } from "../lib/formatters";
import { ROUTES } from "../lib/routes";
import "./CitywidePage.css";

const NEIGHBORHOOD_COLORS: Record<string, string> = {
  uptown: "#22d3ee",
  south_park: "#34d399",
  northwest_park: "#60a5fa",
  northeast_park: "#a78bfa",
  southwest_woods: "#fbbf24",
  southeast_park: "#f87171",
  central_residential: "#94a3b8",
};

export function CitywidePage() {
  const { parcels, boundary, isLoading } = useParkRidgeContext();
  const features = useMemo(() => parcels?.features ?? [], [parcels]);

  const decorated = useMemo(() => decoratePermitPressure(parcels, 5), [parcels]);

  const stats = useMemo(() => {
    const years = features
      .map((f) => f.properties.year_built)
      .filter((y): y is number => y != null && y >= 1800 && y <= 2030);
    const withPermits = features.filter((f) => (f.properties.permit_count ?? 0) > 0).length;
    const withSales = features.filter((f) => (f.properties.sale_count ?? 0) > 0).length;
    const withAssessments = features.filter((f) => (f.properties.assessed_year_count ?? 0) > 0).length;
    const totalPermits = features.reduce((s, f) => s + (f.properties.permit_count ?? 0), 0);
    const totalSales = features.reduce((s, f) => s + (f.properties.sale_count ?? 0), 0);
    const blockSet = new Set(features.map((f) => f.properties.street_block_id).filter(Boolean));
    return {
      total: features.length,
      blocks: blockSet.size,
      oldestYear: years.length ? Math.min(...years) : null,
      newestYear: years.length ? Math.max(...years) : null,
      knownYear: years.length,
      withPermits,
      withSales,
      withAssessments,
      totalPermits,
      totalSales,
    };
  }, [features]);

  const neighborhoods = useMemo(() => {
    if (!decorated) return [];
    const summaries = buildAreaSummaries(decorated, "neighborhoods", { type: "FeatureCollection", features: [] });
    return summaries.features
      .map((f) => f.properties)
      .filter((n) => n.parcelCount > 0)
      .sort((a, b) => b.parcelCount - a.parcelCount);
  }, [decorated]);

  const blockSummaries = useMemo(() => buildBlockSummaries(features), [features]);

  const rankings = useMemo(() => ({
    mostSold: topMostSold(features, 10),
    mostPermits: topMostPermits(features, 10),
    oldest: topOldestHomes(features, 10),
    newest: topNewestHomes(features, 10),
    assessChange: topLargestAssessmentChange(features, 10),
    redevelopment: topMostRedevelopment(features, 10),
    oldestBlocks: blockSummariesToRanked(
      blockSummaries, "oldestYear",
      (b) => `Oldest: ${b.oldestYear}`,
      (b) => `${b.parcelCount} properties`,
      "asc"
    ),
    mostPermitBlocks: blockSummariesToRanked(
      blockSummaries, "avgPermits",
      (b) => `${b.avgPermits.toFixed(1)} avg permits`,
      (b) => `${b.totalPermits} total · ${b.parcelCount} properties`
    ),
  }), [features, blockSummaries]);

  return (
    <div className="page-container-wide">
      <div className="page-hero">
        <span className="page-eyebrow">
          <TrendingUp size={12} strokeWidth={2.5} aria-hidden="true" />
          Citywide Trends
        </span>
        <h1 className="page-title">How Park Ridge Grew</h1>
        <p className="page-subtitle">
          Development patterns, construction eras, and change signals across all{" "}
          {formatNumber(stats.total)} properties in Park Ridge, Illinois.
        </p>
      </div>

      {/* ── Quick Stats ── */}
      <section className="page-section">
        <div className="grid-4">
          <StatCard label="Total Properties" value={formatNumber(stats.total)} icon={Home} accent="cyan" />
          <StatCard label="Identified Blocks" value={formatNumber(stats.blocks)} icon={Grid3x3} accent="blue" />
          <StatCard
            label="Development Span"
            value={formatYear(stats.oldestYear)}
            subValue={`to ${formatYear(stats.newestYear)}`}
            icon={Clock}
            accent="amber"
          />
          <StatCard
            label="With Permit Records"
            value={formatNumber(stats.withPermits)}
            subValue={`${Math.round((stats.withPermits / Math.max(stats.total, 1)) * 100)}% of properties`}
            icon={Wrench}
            accent="amber"
          />
        </div>
      </section>

      {isLoading ? (
        <div className="loading-spinner">
          <div className="spinner-dot" /><div className="spinner-dot" /><div className="spinner-dot" />
          <span>Loading citywide data…</span>
        </div>
      ) : (
        <>
          {/* ── Growth Story ── */}
          <section className="page-section">
            <GrowthStoryPanel
              features={features}
              entityName="Park Ridge"
              entityType="city"
            />
          </section>

          {/* ── City Map ── */}
          <section className="page-section">
            <div className="section-header">
              <div>
                <span className="section-eyebrow">Spatial context</span>
                <h2 className="section-title">All Park Ridge parcels</h2>
              </div>
              <span className="section-note">{formatNumber(stats.total)} parcels</span>
            </div>
            <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
              <ParcelMiniMap allParcels={parcels} boundary={boundary} height={360} />
            </div>
          </section>

          {/* ── Neighborhood Comparison ── */}
          {neighborhoods.length > 0 && (
            <section className="page-section">
              <div className="section-header">
                <div>
                  <span className="section-eyebrow">By neighborhood</span>
                  <h2 className="section-title">Neighborhood comparison</h2>
                </div>
                <Link to={ROUTES.neighborhoods} className="link-pill">All neighborhoods</Link>
              </div>
              <div className="citywide-neighborhood-grid">
                {neighborhoods.map((n) => {
                  const color = NEIGHBORHOOD_COLORS[n.id] ?? "#22d3ee";
                  const olderPct = n.parcelCount > 0 ? Math.round((n.olderHomeCount / n.parcelCount) * 100) : 0;
                  const permitPct = n.parcelCount > 0 ? Math.round((n.remodelCount / n.parcelCount) * 100) : 0;
                  return (
                    <Link key={n.id} to={ROUTES.neighborhood(n.id)} className="citywide-neighborhood-card">
                      <div className="citywide-neighborhood-stripe" style={{ background: color }} />
                      <div className="citywide-neighborhood-body">
                        <div className="citywide-neighborhood-name" style={{ color }}>
                          <MapPin size={11} strokeWidth={2.5} aria-hidden="true" />
                          {n.label}
                        </div>
                        <div className="citywide-neighborhood-meta">
                          <span>{formatNumber(n.parcelCount)} properties</span>
                          <span>{olderPct}% pre-1945</span>
                          <span>{permitPct}% with permits</span>
                        </div>
                        <div className="citywide-neighborhood-signal" style={{ color }}>
                          {n.signal.replace(/_/g, " ")}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Property Rankings ── */}
          <section className="page-section">
            <div className="section-header">
              <div>
                <span className="section-eyebrow">Top properties citywide</span>
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

          {/* ── Block Rankings ── */}
          <section className="page-section">
            <div className="section-header">
              <div>
                <span className="section-eyebrow">Block level</span>
                <h2 className="section-title">Block comparisons</h2>
              </div>
              <Link to={ROUTES.blocks} className="link-pill">All blocks</Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
              <RankedInsightCard title="Oldest Blocks" icon={Clock} accentColor="#c4a97a" items={rankings.oldestBlocks} />
              <RankedInsightCard title="Most Permit Activity" icon={Wrench} accentColor="#fbbf24" items={rankings.mostPermitBlocks} />
            </div>
          </section>

          {/* ── Data Coverage ── */}
          <section className="page-section">
            <div className="section-header">
              <h2 className="section-title">Data coverage</h2>
            </div>
            <div className="glass-card">
              <div className="citywide-coverage-grid" style={{ marginBottom: 16 }}>
                {[
                  { label: "Properties", count: stats.total, total: stats.total, color: "#22d3ee" },
                  { label: "Known year built", count: stats.knownYear, total: stats.total, color: "#fbbf24" },
                  { label: "With permits (2019+)", count: stats.withPermits, total: stats.total, color: "#f59e0b" },
                  { label: "With sales (1999+)", count: stats.withSales, total: stats.total, color: "#34d399" },
                  { label: "With assessments", count: stats.withAssessments, total: stats.total, color: "#a78bfa" },
                ].map((item) => {
                  const pct = item.total > 0 ? Math.round((item.count / item.total) * 100) : 0;
                  return (
                    <div key={item.label} className="citywide-coverage-item">
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ color: "rgba(255,255,255,0.60)", fontSize: "0.76rem" }}>{item.label}</span>
                        <span style={{ color: item.color, fontSize: "0.76rem", fontWeight: 600 }}>{pct}%</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: item.color, borderRadius: 2, opacity: 0.7 }} />
                      </div>
                      <span style={{ color: "rgba(255,255,255,0.28)", fontSize: "0.63rem", marginTop: 4, display: "block" }}>
                        {formatNumber(item.count)} of {formatNumber(item.total)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <DataCoverageNotice
                message="Data coverage notes for Park Ridge:"
                items={[
                  "Permit records from Cook County Assessor begin 2019. Pre-2019 activity is not reflected in permit counts.",
                  `~${Math.round(((features.length - stats.knownYear) / Math.max(features.length, 1)) * 100)}% of parcels lack a recorded year built. Rankings based on year built reflect only parcels with this data.`,
                  "Year built reflects assessor records, which may differ from actual construction date.",
                  "Assessment data uses a triennial reassessment cycle. Values may be unchanged between reassessment years.",
                ]}
              />
            </div>
          </section>

          {/* ── AI Placeholder ── */}
          <section className="page-section">
            <div className="section-header">
              <span className="section-eyebrow">Narrative summary</span>
            </div>
            <AISummaryPlaceholder entityType="city" entityName="Park Ridge" />
          </section>
        </>
      )}
    </div>
  );
}
