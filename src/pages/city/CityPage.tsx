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
            Citywide development history, decade by decade. Every claim is tied to Cook County
            assessor and permit records.
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

            <ChangeStoryCard scope="city" parcels={pressureDecoratedParcels} />

            <DecadeDistributionChart parcels={parcels} />

            <DecadeComparisonTable
              parcels={pressureDecoratedParcels}
              title="Park Ridge by Decade Built"
              note="Every property with a known year built, grouped by decade."
            />

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
