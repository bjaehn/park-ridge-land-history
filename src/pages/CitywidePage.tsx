import { useMemo } from "react";
import { TrendingUp, Home, Wrench, DollarSign, Clock, BarChart2 } from "lucide-react";
import { useParkRidgeContext } from "../contexts/ParkRidgeDataContext";
import { StatCard } from "../components/cards/StatCard";
import { RankedInsightCard } from "../components/cards/RankedInsightCard";
import {
  topMostSold, topMostPermits, topOldestHomes, topNewestHomes,
  topLargestAssessmentChange
} from "../lib/rankings";
import { formatNumber, formatYear } from "../lib/formatters";
import "./CitywidePage.css";

export function CitywidePage() {
  const { parcels, isLoading } = useParkRidgeContext();
  const features = useMemo(() => parcels?.features ?? [], [parcels]);

  const stats = useMemo(() => {
    const years = features
      .map((f) => f.properties.year_built)
      .filter((y): y is number => y != null && y >= 1800 && y <= 2030);
    const withPermits = features.filter((f) => (f.properties.permit_count ?? 0) > 0).length;
    const withSales = features.filter((f) => (f.properties.sale_count ?? 0) > 0).length;
    const withAssessments = features.filter((f) => (f.properties.assessed_year_count ?? 0) > 0).length;
    const decadeCounts: Record<string, number> = {};
    for (const y of years) {
      const decade = y < 1900 ? "Pre-1900" : `${Math.floor(y / 10) * 10}s`;
      decadeCounts[decade] = (decadeCounts[decade] ?? 0) + 1;
    }
    return {
      total: features.length,
      oldestYear: years.length ? Math.min(...years) : null,
      newestYear: years.length ? Math.max(...years) : null,
      knownYear: years.length,
      withPermits,
      withSales,
      withAssessments,
      decadeCounts,
    };
  }, [features]);

  const rankings = useMemo(() => ({
    mostSold: topMostSold(features, 10),
    mostPermits: topMostPermits(features, 10),
    oldest: topOldestHomes(features, 10),
    newest: topNewestHomes(features, 10),
    assessChange: topLargestAssessmentChange(features, 10),
  }), [features]);

  return (
    <div className="page-container">
      <div className="page-hero">
        <span className="page-eyebrow">
          <TrendingUp size={12} strokeWidth={2.5} aria-hidden="true" />
          Citywide Trends
        </span>
        <h1 className="page-title">Park Ridge Overview</h1>
        <p className="page-subtitle">
          Development patterns, property statistics, and trend analysis across all of
          Park Ridge, Illinois.
        </p>
      </div>

      <section className="page-section">
        <div className="grid-4">
          <StatCard label="Total Properties" value={formatNumber(stats.total)} icon={Home} accent="cyan" />
          <StatCard label="Oldest Home" value={formatYear(stats.oldestYear)} subValue="Earliest year built on record" icon={Clock} accent="amber" />
          <StatCard label="With Permit Records" value={formatNumber(stats.withPermits)} subValue={`${Math.round((stats.withPermits / Math.max(stats.total,1))*100)}% of properties`} icon={Wrench} accent="amber" />
          <StatCard label="With Sale Records" value={formatNumber(stats.withSales)} subValue={`${Math.round((stats.withSales / Math.max(stats.total,1))*100)}% of properties`} icon={DollarSign} accent="green" />
        </div>
      </section>

      {isLoading ? (
        <div className="loading-spinner"><div className="spinner-dot" /><div className="spinner-dot" /><div className="spinner-dot" /><span>Loading data…</span></div>
      ) : (
        <>
          <section className="page-section">
            <div className="section-header">
              <div>
                <span className="section-eyebrow">Construction history</span>
                <h2 className="section-title">Homes built by decade</h2>
              </div>
              <span className="section-note">{formatNumber(stats.knownYear)} properties with known year built</span>
            </div>
            <div className="glass-card">
              <div className="citywide-decade-chart">
                {Object.entries(stats.decadeCounts)
                  .sort(([a], [b]) => {
                    const ya = a === "Pre-1900" ? 1890 : parseInt(a);
                    const yb = b === "Pre-1900" ? 1890 : parseInt(b);
                    return ya - yb;
                  })
                  .map(([decade, count]) => {
                    const max = Math.max(...Object.values(stats.decadeCounts));
                    const pct = max > 0 ? (count / max) * 100 : 0;
                    return (
                      <div key={decade} className="decade-bar-item">
                        <div className="decade-bar-fill" style={{ height: `${Math.max(pct, 2)}%` }} />
                        <span className="decade-bar-label">{decade.replace("Pre-1900", "<1900")}</span>
                        <span className="decade-bar-count">{formatNumber(count)}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </section>

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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
              <RankedInsightCard title="Oldest Homes" icon={Clock} accentColor="#c4a97a" items={rankings.oldest} />
              <RankedInsightCard title="Newest Builds" icon={Home} accentColor="#22d3ee" items={rankings.newest} />
            </div>
          </section>

          <section className="page-section">
            <div className="glass-card">
              <span className="section-eyebrow">Data coverage summary</span>
              <div className="citywide-coverage-grid" style={{ marginTop: 16 }}>
                {[
                  { label: "Properties", count: stats.total, total: stats.total, color: "#22d3ee" },
                  { label: "Known year built", count: stats.knownYear, total: stats.total, color: "#fbbf24" },
                  { label: "With permits", count: stats.withPermits, total: stats.total, color: "#f59e0b" },
                  { label: "With sales", count: stats.withSales, total: stats.total, color: "#34d399" },
                  { label: "With assessments", count: stats.withAssessments, total: stats.total, color: "#a78bfa" },
                ].map((item) => {
                  const pct = item.total > 0 ? Math.round((item.count / item.total) * 100) : 0;
                  return (
                    <div key={item.label} className="citywide-coverage-item">
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.76rem" }}>{item.label}</span>
                        <span style={{ color: item.color, fontSize: "0.76rem", fontWeight: 600 }}>{pct}%</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: item.color, borderRadius: 2, opacity: 0.7 }} />
                      </div>
                      <span style={{ color: "rgba(255,255,255,0.30)", fontSize: "0.66rem", marginTop: 4, display: "block" }}>
                        {formatNumber(item.count)} of {formatNumber(item.total)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
