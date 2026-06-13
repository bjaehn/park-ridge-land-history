import { useMemo } from "react";
import { Grid3x3, Home, Wrench, DollarSign, TrendingUp, Clock, BarChart2 } from "lucide-react";
import { useParkRidgeContext } from "../contexts/ParkRidgeDataContext";
import { SearchBox } from "../components/search/SearchBox";
import { StatCard } from "../components/cards/StatCard";
import { RankedInsightCard } from "../components/cards/RankedInsightCard";
import { DataCoverageNotice } from "../components/cards/DataCoverageNotice";
import { buildBlockSummaries, blockSummariesToRanked } from "../lib/blockSummaries";
import { formatNumber } from "../lib/formatters";
import "./BlocksPage.css";

export function BlocksPage() {
  const { parcels, isLoading } = useParkRidgeContext();
  const features = useMemo(() => parcels?.features ?? [], [parcels]);

  const blockSummaries = useMemo(() => buildBlockSummaries(features), [features]);

  const stats = useMemo(() => {
    const totalParcels = features.length;
    const totalPermits = features.reduce((s, f) => s + (f.properties.permit_count ?? 0), 0);
    const totalSales = features.reduce((s, f) => s + (f.properties.sale_count ?? 0), 0);
    const mostActiveBlock = [...blockSummaries].sort((a, b) => b.avgPermits - a.avgPermits)[0];
    return { totalBlocks: blockSummaries.length, totalParcels, totalPermits, totalSales, mostActiveBlock };
  }, [blockSummaries, features]);

  const rankings = useMemo(() => ({
    mostPermitActive: blockSummariesToRanked(
      blockSummaries, "avgPermits",
      (b) => `${b.avgPermits.toFixed(1)} avg permits`,
      (b) => `${b.totalPermits} total · ${b.parcelCount} properties`
    ),
    mostSalesActive: blockSummariesToRanked(
      blockSummaries, "avgSales",
      (b) => `${b.avgSales.toFixed(1)} avg sales`,
      (b) => `${b.totalSales} total · ${b.parcelCount} properties`
    ),
    oldest: blockSummariesToRanked(
      blockSummaries, "oldestYear",
      (b) => `Oldest: ${b.oldestYear}`,
      (b) => `${b.parcelCount} properties`,
      "asc"
    ),
    newest: blockSummariesToRanked(
      blockSummaries, "newestYear",
      (b) => `Newest: ${b.newestYear}`,
      (b) => `${b.parcelCount} properties`,
      "desc"
    ),
    mostAssessmentChange: blockSummariesToRanked(
      blockSummaries.filter((b) => b.avgAssessmentChange != null),
      "avgAssessmentChange",
      (b) => `${b.avgAssessmentChange != null && b.avgAssessmentChange > 0 ? "+" : ""}${(b.avgAssessmentChange ?? 0).toFixed(1)}% avg change`,
      (b) => `${b.parcelCount} properties`
    ),
    mostRedevelopment: blockSummariesToRanked(
      blockSummaries, "redevelopmentScore",
      (b) => `Score: ${b.redevelopmentScore}`,
      (b) => `${b.totalPermits} permits · ${b.parcelCount} properties`
    ),
  }), [blockSummaries]);

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
          across Park Ridge. Blocks are grouped by Census tabulation boundaries.
        </p>
      </div>

      <div className="search-page-input" style={{ maxWidth: 520, marginBottom: 36 }}>
        <SearchBox placeholder="Search a street or address to find a block…" />
      </div>

      {/* ── Stats ── */}
      <section className="page-section">
        <div className="grid-4">
          <StatCard label="Identified Blocks" value={formatNumber(stats.totalBlocks)} icon={Grid3x3} accent="blue" />
          <StatCard label="Total Properties" value={formatNumber(stats.totalParcels)} icon={Home} accent="cyan" />
          <StatCard
            label="Total Permit Records"
            value={formatNumber(stats.totalPermits)}
            subValue="Cook County, 2019+"
            icon={Wrench}
            accent="amber"
          />
          <StatCard
            label="Total Sale Records"
            value={formatNumber(stats.totalSales)}
            subValue="Cook County, 1999+"
            icon={DollarSign}
            accent="green"
          />
        </div>
      </section>

      {isLoading ? (
        <div className="loading-spinner">
          <div className="spinner-dot" /><div className="spinner-dot" /><div className="spinner-dot" />
          <span>Loading block data…</span>
        </div>
      ) : (
        <>
          {/* ── Primary Rankings ── */}
          <section className="page-section">
            <div className="section-header">
              <div>
                <span className="section-eyebrow">Ranked by activity</span>
                <h2 className="section-title">Block insights</h2>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 16 }}>
              <RankedInsightCard title="Most Permit Activity" icon={Wrench} accentColor="#fbbf24" items={rankings.mostPermitActive} />
              <RankedInsightCard title="Most Sales Activity" icon={DollarSign} accentColor="#34d399" items={rankings.mostSalesActive} />
              <RankedInsightCard title="Redevelopment Signal" icon={TrendingUp} accentColor="#f87171" items={rankings.mostRedevelopment} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
              <RankedInsightCard title="Oldest Housing Stock" icon={Clock} accentColor="#c4a97a" items={rankings.oldest} />
              <RankedInsightCard title="Newest Construction" icon={Home} accentColor="#22d3ee" items={rankings.newest} />
              <RankedInsightCard title="Largest Assessment Δ" icon={BarChart2} accentColor="#a78bfa" items={rankings.mostAssessmentChange} />
            </div>
          </section>

          {/* ── What is a block ── */}
          <section className="page-section">
            <div className="glass-card blocks-info-card">
              <Grid3x3 size={20} strokeWidth={1.5} style={{ color: "#60a5fa" }} aria-hidden="true" />
              <div>
                <strong>How blocks are defined in this app</strong>
                <p>
                  Blocks are assembled from U.S. Census TIGER/Line tabulation block IDs (15-digit GEOIDs).
                  Each parcel that matches a Census block GEOID is grouped with others in that block.
                  A block typically contains 5–30 residential parcels. Only blocks with 3 or more parcels
                  are shown. Block boundaries follow street centerlines and may not match your intuitive
                  sense of a neighborhood block.
                </p>
                <p style={{ marginTop: 8 }}>
                  Redevelopment scores are computed from permit pressure type, permit count, and nearby teardown signals.
                  They are deterministic — not AI-generated — and reflect available public records only.
                </p>
              </div>
            </div>
          </section>

          {/* ── Data Coverage ── */}
          <section className="page-section">
            <DataCoverageNotice
              message="Data availability for block analysis:"
              items={[
                "Permit records from Cook County Assessor begin 2019. Older permit activity is not captured.",
                "Sales data from Cook County goes back to approximately 1999.",
                "Assessment data covers multiple years but the depth varies by parcel.",
                `${formatNumber(stats.totalBlocks)} blocks shown with 3 or more parcels out of all Census blocks in Park Ridge.`,
              ]}
            />
          </section>
        </>
      )}
    </div>
  );
}
