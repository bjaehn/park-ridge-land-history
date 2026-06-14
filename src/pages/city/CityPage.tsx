import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useParkRidgeContext } from "../../contexts/ParkRidgeDataContext";
import { buildAreaSummaries } from "../../lib/areaGroups";
import { computeDataCoverage } from "../../lib/dataCoverage";
import { GrowthStoryPanel } from "../../components/GrowthStoryPanel";
import { ChangeStoryCard } from "../../components/ChangeStoryCard";
import { DecadeComparisonTable } from "../../components/DecadeComparisonTable";
import { DecadeDistributionChart } from "../../components/DecadeDistributionChart";
import { NeighborhoodComparisonTable } from "../../components/NeighborhoodComparisonTable";
import { RankedInsightSection } from "../../components/RankedInsightSection";
import { DataCoverageNotice } from "../../components/cards/DataCoverageNotice";
import {
  computeTopPermitted,
  computeTopOldest,
  computeTopAssessedChange
} from "../../lib/rankedInsights";
import { neighborhoodPath, neighborhoodSlugFromId, propertyPath, ROUTES } from "../../routes/routeConfig";
import type { ParcelCollection } from "../../lib/parcelTypes";

const emptyHotspots = { type: "FeatureCollection" as const, features: [] };

export function CityPage() {
  const { parcels, pressureDecoratedParcels } = useParkRidgeContext();
  const navigate = useNavigate();

  const cityDataCoverage = useMemo(() => computeDataCoverage(parcels), [parcels]);

  const neighborhoodSummaries = useMemo(
    () =>
      pressureDecoratedParcels
        ? buildAreaSummaries(pressureDecoratedParcels, "neighborhoods", emptyHotspots)
        : { type: "FeatureCollection" as const, features: [] },
    [pressureDecoratedParcels]
  );

  const rankedTopOldest = useMemo(
    () => computeTopOldest(parcels?.features ?? []),
    [parcels]
  );
  const rankedTopPermitted = useMemo(
    () => computeTopPermitted(parcels?.features ?? []),
    [parcels]
  );
  const rankedTopAssessedChange = useMemo(
    () => computeTopAssessedChange(parcels?.features ?? []),
    [parcels]
  );

  const isLoading = !parcels;

  return (
    <div className="content-page">
      <div className="content-page-inner">
        {/* Breadcrumb */}
        <nav className="page-breadcrumb" aria-label="Breadcrumb">
          <span aria-current="page">Park Ridge</span>
        </nav>

        <header className="content-page-header">
          <h1 className="content-page-title">How Park Ridge Grew</h1>
          <p className="content-page-subtitle">
            Citywide development history, decade by decade. All figures are derived from Cook County
            assessor and permit records. Where records are incomplete, gaps are shown explicitly.
          </p>
          <Link to={ROUTES.explore.path} className="explore-map-btn explore-map-btn--inline">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            Open Map Explorer
          </Link>
        </header>

        {isLoading ? (
          <div className="page-loading">Loading city data…</div>
        ) : (
          <>
            <GrowthStoryPanel parcels={parcels} />

            <DevelopmentWaves parcels={parcels} />

            <ChangeStoryCard scope="city" parcels={pressureDecoratedParcels} />

            <DecadeDistributionChart parcels={parcels} />

            <DecadeComparisonTable
              parcels={pressureDecoratedParcels}
              title="Park Ridge by Decade Built"
              note="Every property with a known year built, grouped by decade."
            />

            <div className="city-notable-section">
              <p className="city-notable-eyebrow">Notable records</p>
              <h2 className="city-notable-title">Properties worth exploring</h2>
              <p className="city-notable-desc">
                These lists highlight properties with unusual records. They are starting points for
                exploration, not rankings of value, quality, or desirability.
              </p>
            </div>

            <RankedInsightSection
              insight={rankedTopOldest}
              onSelectProperty={(pin) => navigate(propertyPath(pin))}
            />

            <RankedInsightSection
              insight={rankedTopPermitted}
              onSelectProperty={(pin) => navigate(propertyPath(pin))}
            />

            <RankedInsightSection
              insight={rankedTopAssessedChange}
              onSelectProperty={(pin) => navigate(propertyPath(pin))}
            />

            {/* Neighborhood comparison */}
            {neighborhoodSummaries.features.length > 0 && (
              <section className="city-neighborhoods-section">
                <h2 className="city-section-title">Neighborhoods at a Glance</h2>
                <NeighborhoodComparisonTable neighborhoods={neighborhoodSummaries} />
                <div className="city-neighborhood-links">
                  {neighborhoodSummaries.features
                    .filter((n) => n.properties.id.startsWith("neighborhood:"))
                    .sort((a, b) => a.properties.label.localeCompare(b.properties.label))
                    .map((n) => (
                      <Link
                        key={n.properties.id}
                        to={neighborhoodPath(neighborhoodSlugFromId(n.properties.id))}
                        className="city-neighborhood-link"
                      >
                        {n.properties.label}
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </Link>
                    ))}
                </div>
              </section>
            )}

            <DataCoverageNotice stats={cityDataCoverage} />
          </>
        )}
      </div>
    </div>
  );
}

function DevelopmentWaves({ parcels }: { parcels: ParcelCollection }) {
  const waves = useMemo(() => {
    const features = parcels?.features ?? [];
    const total = features.filter((f) => {
      const y = f.properties.year_built;
      return typeof y === "number" && y > 1800 && y < 2026;
    }).length;
    function waveCount(from: number, to: number) {
      return features.filter((f) => {
        const y = f.properties.year_built;
        return typeof y === "number" && y >= from && y < to;
      }).length;
    }
    const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;
    return [
      { era: "Early Park Ridge", range: "Before 1920", count: waveCount(0, 1920), pct: pct(waveCount(0, 1920)), desc: "The city's earliest settled homes, many near the original railroad depot and Uptown core." },
      { era: "Pre-war growth", range: "1920 – 1945", count: waveCount(1920, 1945), pct: pct(waveCount(1920, 1945)), desc: "Steady residential expansion through the 1920s boom, Depression, and the years before WWII." },
      { era: "Postwar boom", range: "1945 – 1970", count: waveCount(1945, 1970), pct: pct(waveCount(1945, 1970)), desc: "The largest single wave of construction in Park Ridge history. Veterans returning home fueled rapid neighborhood buildout." },
      { era: "Modern era", range: "1970 onward", count: waveCount(1970, 2026), pct: pct(waveCount(1970, 2026)), desc: "Infill, teardown rebuilds, and selective new construction in an already-built city." },
    ];
  }, [parcels]);

  const maxCount = Math.max(1, ...waves.map((w) => w.count));

  return (
    <div className="dev-waves">
      <p className="dev-waves-eyebrow">Park Ridge through time</p>
      <h2 className="dev-waves-title">Four waves of development</h2>
      <p className="dev-waves-intro">Park Ridge did not grow all at once. It grew in distinct bursts, each shaped by national trends, transportation access, and the families who chose to build here.</p>
      <div className="dev-waves-grid">
        {waves.map((wave) => (
          <div key={wave.era} className="dev-wave">
            <div className="dev-wave-header">
              <span className="dev-wave-era">{wave.era}</span>
              <span className="dev-wave-range">{wave.range}</span>
            </div>
            <div className="dev-wave-bar-track" aria-hidden="true">
              <div className="dev-wave-bar" style={{ width: `${Math.max(4, (wave.count / maxCount) * 100)}%` }} />
            </div>
            <div className="dev-wave-count">
              <strong>{wave.count.toLocaleString()}</strong> homes ({wave.pct}% of known records)
            </div>
            <p className="dev-wave-desc">{wave.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
