import { useMemo } from "react";
import { Link } from "react-router-dom";
import { MapPin, Home, Wrench, DollarSign, TrendingUp, ArrowRight, Clock, BarChart2 } from "lucide-react";
import { useParkRidgeContext } from "../contexts/ParkRidgeDataContext";
import { StatCard } from "../components/cards/StatCard";
import { RankedInsightCard } from "../components/cards/RankedInsightCard";
import { buildAreaSummaries } from "../lib/areaGroups";
import { decoratePermitPressure } from "../lib/permitPressure";
import { ROUTES } from "../lib/routes";
import { formatNumber } from "../lib/formatters";
import type { RankedProperty } from "../lib/rankings";
import type { AreaSummaryProperties } from "../lib/areaGroups";
import "./NeighborhoodsPage.css";

const NEIGHBORHOOD_COLORS: Record<string, string> = {
  uptown: "#22d3ee",
  "south park": "#34d399",
  "south_park": "#34d399",
  "northwest park": "#60a5fa",
  "northwest_park": "#60a5fa",
  "northeast park": "#a78bfa",
  "northeast_park": "#a78bfa",
  "southwest woods": "#fbbf24",
  "southwest_woods": "#fbbf24",
  "southeast park": "#f87171",
  "southeast_park": "#f87171",
  "central residential": "#94a3b8",
  "central_residential": "#94a3b8",
};

function neighborhoodColor(n: AreaSummaryProperties): string {
  return NEIGHBORHOOD_COLORS[n.id] ?? NEIGHBORHOOD_COLORS[n.label.toLowerCase()] ?? "#22d3ee";
}

type NeighborhoodWithYears = AreaSummaryProperties & {
  oldestYear?: number | null;
  newestYear?: number | null;
};

function neighborhoodToRanked(
  neighborhoods: NeighborhoodWithYears[],
  sortFn: (a: NeighborhoodWithYears, b: NeighborhoodWithYears) => number,
  valueLabel: (n: NeighborhoodWithYears) => string,
  secondaryLabel: (n: NeighborhoodWithYears) => string,
  limit = 6
): RankedProperty[] {
  return [...neighborhoods]
    .sort(sortFn)
    .slice(0, limit)
    .map((n) => ({
      pin: n.id,
      address: n.label,
      value: 0,
      valueLabel: valueLabel(n),
      secondaryLabel: secondaryLabel(n),
      linkTo: ROUTES.neighborhood(n.id),
    }));
}

export function NeighborhoodsPage() {
  const { parcels, isLoading } = useParkRidgeContext();

  const decorated = useMemo(() => decoratePermitPressure(parcels, 5), [parcels]);

  const neighborhoods = useMemo(() => {
    if (!decorated) return [];
    const summaries = buildAreaSummaries(decorated, "neighborhoods", { type: "FeatureCollection", features: [] });
    return summaries.features
      .map((f) => f.properties)
      .filter((n) => n.parcelCount > 0)
      .sort((a, b) => b.parcelCount - a.parcelCount);
  }, [decorated]);

  // Gather oldest years per neighborhood from parcel data
  const neighborhoodYearStats = useMemo(() => {
    if (!decorated) return new Map<string, { oldest: number | null; newest: number | null }>();
    const allSummaries = buildAreaSummaries(decorated, "neighborhoods", { type: "FeatureCollection", features: [] });
    const result = new Map<string, { oldest: number | null; newest: number | null }>();
    for (const area of allSummaries.features) {
      const pins = new Set(area.properties.parcelPins);
      const years = decorated.features
        .filter((f) => {
          const pin = f.properties.pin_normalized || f.properties.pin_original;
          return pin && pins.has(pin);
        })
        .map((f) => f.properties.year_built)
        .filter((y): y is number => y != null && y >= 1800 && y <= 2030);
      result.set(area.properties.id, {
        oldest: years.length ? Math.min(...years) : null,
        newest: years.length ? Math.max(...years) : null,
      });
    }
    return result;
  }, [decorated]);

  const neighborhoodsWithYears = useMemo(() =>
    neighborhoods.map((n) => ({
      ...n,
      oldestYear: neighborhoodYearStats.get(n.id)?.oldest ?? null,
      newestYear: neighborhoodYearStats.get(n.id)?.newest ?? null,
    })),
    [neighborhoods, neighborhoodYearStats]
  );

  const rankings = useMemo(() => ({
    oldest: neighborhoodToRanked(
      neighborhoodsWithYears.filter((n) => n.oldestYear != null),
      (a, b) => (a.oldestYear ?? 9999) - (b.oldestYear ?? 9999),
      (n) => `Oldest: ${n.oldestYear}`,
      (n) => `${formatNumber(n.parcelCount)} properties`
    ),
    newest: neighborhoodToRanked(
      neighborhoodsWithYears.filter((n) => n.newestYear != null),
      (a, b) => (b.newestYear ?? 0) - (a.newestYear ?? 0),
      (n) => `Newest: ${n.newestYear}`,
      (n) => `${formatNumber(n.parcelCount)} properties`
    ),
    mostPermits: neighborhoodToRanked(
      neighborhoods,
      (a, b) => b.remodelCount - a.remodelCount,
      (n) => `${formatNumber(n.remodelCount)} permit records`,
      (n) => `${n.parcelCount > 0 ? Math.round((n.remodelCount / n.parcelCount) * 100) : 0}% of properties`
    ),
    mostSales: neighborhoodToRanked(
      neighborhoods,
      (a, b) => b.soldLastThreeYearsCount - a.soldLastThreeYearsCount,
      (n) => `${formatNumber(n.soldLastThreeYearsCount)} sales (3yr)`,
      (n) => `${formatNumber(n.parcelCount)} properties`
    ),
    mostTeardown: neighborhoodToRanked(
      neighborhoods,
      (a, b) => b.teardownPressureCount - a.teardownPressureCount,
      (n) => `${formatNumber(n.teardownPressureCount)} teardown signals`,
      (n) => `${n.parcelCount > 0 ? Math.round((n.teardownPressureCount / n.parcelCount) * 100) : 0}% of properties`
    ),
    mostNewConstruction: neighborhoodToRanked(
      neighborhoods,
      (a, b) => b.newConstructionCount - a.newConstructionCount,
      (n) => `${formatNumber(n.newConstructionCount)} new builds`,
      (n) => `${formatNumber(n.parcelCount)} properties`
    ),
  }), [neighborhoods, neighborhoodsWithYears]);

  return (
    <div className="page-container">
      <div className="page-hero">
        <span className="page-eyebrow">
          <MapPin size={12} strokeWidth={2.5} aria-hidden="true" />
          Neighborhoods
        </span>
        <h1 className="page-title">Park Ridge Neighborhoods</h1>
        <p className="page-subtitle">
          Explore {neighborhoods.length} distinct neighborhoods — their housing stock,
          permit activity, sales trends, and development character.
        </p>
      </div>

      {/* ── Stats ── */}
      <section className="page-section">
        <div className="grid-3">
          <StatCard label="Neighborhoods" value={neighborhoods.length} icon={MapPin} accent="green" />
          <StatCard label="Total Properties" value={formatNumber(parcels?.features.length ?? 0)} icon={Home} accent="cyan" />
          <StatCard
            label="Largest Neighborhood"
            value={neighborhoods[0]?.label ?? "—"}
            subValue={neighborhoods[0] ? `${formatNumber(neighborhoods[0].parcelCount)} properties` : undefined}
            icon={TrendingUp}
            accent="blue"
          />
        </div>
      </section>

      {isLoading ? (
        <div className="loading-spinner">
          <div className="spinner-dot" /><div className="spinner-dot" /><div className="spinner-dot" />
          <span>Loading neighborhood data…</span>
        </div>
      ) : (
        <>
          {/* ── Neighborhood Comparison Rankings ── */}
          <section className="page-section">
            <div className="section-header">
              <div>
                <span className="section-eyebrow">Neighborhood comparisons</span>
                <h2 className="section-title">Ranked by characteristic</h2>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 16 }}>
              <RankedInsightCard title="Oldest Housing Stock" icon={Clock} accentColor="#c4a97a" items={rankings.oldest} />
              <RankedInsightCard title="Newest Construction" icon={Home} accentColor="#22d3ee" items={rankings.newest} />
              <RankedInsightCard title="Most Permit Activity" icon={Wrench} accentColor="#fbbf24" items={rankings.mostPermits} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
              <RankedInsightCard title="Most Recent Sales" icon={DollarSign} accentColor="#34d399" items={rankings.mostSales} />
              <RankedInsightCard title="New Construction" icon={BarChart2} accentColor="#60a5fa" items={rankings.mostNewConstruction} />
              <RankedInsightCard title="Teardown Pressure" icon={TrendingUp} accentColor="#f87171" items={rankings.mostTeardown} />
            </div>
          </section>

          {/* ── Neighborhood Cards ── */}
          <section className="page-section">
            <div className="section-header">
              <div>
                <span className="section-eyebrow">All neighborhoods</span>
                <h2 className="section-title">Explore by neighborhood</h2>
              </div>
            </div>
            <div className="neighborhoods-grid">
              {neighborhoods.map((n) => {
                const color = neighborhoodColor(n);
                const yearStats = neighborhoodYearStats.get(n.id);
                const remodelPct = n.parcelCount > 0
                  ? Math.round((n.remodelCount / n.parcelCount) * 100)
                  : 0;
                const olderPct = n.parcelCount > 0
                  ? Math.round((n.olderHomeCount / n.parcelCount) * 100)
                  : 0;
                return (
                  <Link
                    key={n.id}
                    to={ROUTES.neighborhood(n.id)}
                    className="neighborhood-card"
                    style={{ "--accent": color } as React.CSSProperties}
                  >
                    <div className="neighborhood-card-stripe" style={{ background: color }} />
                    <div className="neighborhood-card-body">
                      <div className="neighborhood-card-header">
                        <div className="neighborhood-icon" style={{ color, borderColor: `${color}33`, background: `${color}12` }}>
                          <MapPin size={16} strokeWidth={2} aria-hidden="true" />
                        </div>
                        <div>
                          <strong className="neighborhood-name">{n.label}</strong>
                          <span className="neighborhood-count">{formatNumber(n.parcelCount)} properties</span>
                        </div>
                      </div>

                      <div className="neighborhood-stats">
                        <div className="neighborhood-stat">
                          <span className="neighborhood-stat-label">Pre-1945 homes</span>
                          <span className="neighborhood-stat-value">{olderPct}%</span>
                        </div>
                        <div className="neighborhood-stat">
                          <span className="neighborhood-stat-label">With permits</span>
                          <span className="neighborhood-stat-value">{remodelPct}%</span>
                        </div>
                        {yearStats?.oldest && (
                          <div className="neighborhood-stat">
                            <span className="neighborhood-stat-label">Oldest home</span>
                            <span className="neighborhood-stat-value">{yearStats.oldest}</span>
                          </div>
                        )}
                        <div className="neighborhood-stat">
                          <span className="neighborhood-stat-label">Signal</span>
                          <span className="neighborhood-stat-value" style={{ color }}>
                            {n.signal.replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>

                      <div className="neighborhood-card-footer">
                        <span>{n.newConstructionCount} new builds · {n.teardownPressureCount} teardowns</span>
                        <ArrowRight size={14} strokeWidth={2} className="neighborhood-arrow" aria-hidden="true" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* ── About ── */}
          <section className="page-section">
            <div className="glass-card">
              <span className="section-eyebrow">About neighborhood definitions</span>
              <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.48)", fontSize: "0.82rem", lineHeight: 1.6 }}>
                Neighborhood boundaries are defined by geographic coordinate ranges based on
                common understanding of Park Ridge's residential character areas. They are not official
                municipal neighborhood boundaries. Signal classifications (quiet, watch, active, teardown pressure)
                are derived from permit pressure scoring over a 5-year window using Cook County data.
                Redevelopment scores are deterministic formulas — not AI-generated.
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
