import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useParkRidgeContext } from "../contexts/ParkRidgeDataContext";
import {
  propertyPath, blockPath, neighborhoodPath,
  neighborhoodSlugFromId, ROUTES
} from "../routes/routeConfig";
import { computeTopOldest, computeTopPermitted, computeTopAssessedChange } from "../lib/rankedInsights";
import { RankedInsightSection } from "../components/RankedInsightSection";
import { getNeighborhoodSummaries, getNamedNeighborhoods } from "../lib/data/neighborhoods";
import { getHomePageStats, getHomeCityGrowthRows, getOldestBlocks } from "../lib/data/home";
import type { ParcelFeature } from "../lib/parcelTypes";
import type { BlockSummary } from "../lib/data/blocks";
import type { AreaSummaryFeature, AreaSignal } from "../lib/areaGroups";
import type { HomeCityGrowthRow, HomePageStats } from "../lib/data/home";

// ─── Main page ────────────────────────────────────────────────────────────────

export function HomePage() {
  const { parcels } = useParkRidgeContext();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const features = useMemo(() => parcels?.features ?? [], [parcels]);
  const isLoading = !parcels;

  // ── Search results ──────────────────────────────────────────────────────────
  const normalizedQuery = query.trim().toLowerCase();
  const searchResults = useMemo<ParcelFeature[]>(() => {
    if (normalizedQuery.length < 2) return [];
    return features
      .filter((f) => {
        const addr = (f.properties.address ?? "").toLowerCase();
        const pin = (f.properties.pin_normalized ?? "").toLowerCase();
        return addr.includes(normalizedQuery) || pin.includes(normalizedQuery);
      })
      .slice(0, 8);
  }, [normalizedQuery, features]);
  const showDropdown = isFocused && normalizedQuery.length >= 2;

  function handleSelect(pin: string) {
    setQuery("");
    navigate(propertyPath(pin));
  }

  // ── Derived data (all memoized to run once per load) ────────────────────────
  const stats = useMemo<HomePageStats>(() => getHomePageStats(features), [features]);
  const cityGrowthRows = useMemo<HomeCityGrowthRow[]>(() => getHomeCityGrowthRows(features), [features]);
  const peakDecade = useMemo(() => cityGrowthRows.find((r) => r.isPeak) ?? null, [cityGrowthRows]);
  const maxGrowthCount = useMemo(() => Math.max(1, ...cityGrowthRows.map((r) => r.count)), [cityGrowthRows]);

  const topOldest = useMemo(() => computeTopOldest(features, 10), [features]);
  const topPermitted = useMemo(() => computeTopPermitted(features, 10), [features]);
  const topAssessedChange = useMemo(() => computeTopAssessedChange(features, 10), [features]);
  const oldestBlocks = useMemo<BlockSummary[]>(() => getOldestBlocks(features, 10), [features]);

  const neighborhoodSummaries = useMemo(() => getNeighborhoodSummaries(parcels), [parcels]);
  const neighborhoods = useMemo(() => getNamedNeighborhoods(neighborhoodSummaries), [neighborhoodSummaries]);

  const hasAssessmentData = topAssessedChange.items.length > 0;

  return (
    <div className="home-page">

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="hero-section" aria-label="Welcome">
        <div className="hero-inner">
          <p className="hero-eyebrow">Park Ridge, Illinois</p>
          <h1 className="hero-title">
            Explore the history of every home,<br />
            block, and neighborhood.
          </h1>
          <p className="hero-tagline">
            Discover when homes were built, how blocks developed, how
            neighborhoods changed, and how Park Ridge grew — decade by decade.
            Every fact is tied to a source.
          </p>

          {/* Search */}
          <div className="hero-search-wrap" role="search">
            <label htmlFor="hero-search" className="sr-only">Search a Park Ridge address</label>
            <div className={`hero-search-input-wrap${isFocused ? " is-focused" : ""}`}>
              <svg className="hero-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                id="hero-search"
                className="hero-search-input"
                type="search"
                placeholder="Search an address or PIN…"
                autoComplete="off"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 180)}
                aria-expanded={showDropdown}
                aria-autocomplete="list"
                aria-controls={showDropdown ? "hero-search-results" : undefined}
              />
            </div>
            {showDropdown && searchResults.length > 0 && (
              <ul className="hero-search-results" id="hero-search-results" role="listbox">
                {searchResults.map((f) => {
                  const pin = f.properties.pin_normalized ?? f.properties.pin_original ?? "";
                  return (
                    <li key={pin} role="option" aria-selected={false}>
                      <button type="button" className="hsr-btn" onMouseDown={() => handleSelect(pin)}>
                        <span className="hsr-address">{f.properties.address}</span>
                        <span className="hsr-meta">
                          {f.properties.year_built ? `Built ${f.properties.year_built}` : "Year unknown"}
                          {f.properties.permit_count ? ` · ${f.properties.permit_count} permits` : ""}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {showDropdown && searchResults.length === 0 && (
              <div className="hero-search-empty">
                No matching addresses. Try a street name or the first digits of a PIN.
              </div>
            )}
          </div>

          {/* Hero quick-nav */}
          <div className="hero-quick-nav" aria-label="Quick navigation">
            <Link to={ROUTES.neighborhoods.path} className="hero-quick-btn">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2a7 7 0 017 7c0 4.97-6.22 12.18-6.7 12.76a.4.4 0 01-.6 0C11.22 21.18 5 13.97 5 9a7 7 0 017-7z"/><circle cx="12" cy="9" r="2.5"/>
              </svg>
              Neighborhoods
            </Link>
            <Link to={ROUTES.city.path} className="hero-quick-btn">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="1" y1="22" x2="23" y2="22"/><path d="M2 22V15l5-2v9"/><path d="M7 22V10l5-5v17"/><path d="M12 22V13l5-3v12"/><path d="M17 22V17l4-2v7"/>
              </svg>
              City growth
            </Link>
            <Link to={ROUTES.explore.path} className="hero-quick-btn">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              Map explorer
            </Link>
            <Link to={ROUTES.sources.path} className="hero-quick-btn">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Sources
            </Link>
          </div>

          <p className="hero-trust">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Every claim is sourced. Missing data is shown, not hidden.
            {stats.totalProperties > 0 && ` Covering ${stats.totalProperties.toLocaleString()} Park Ridge properties.`}
          </p>
        </div>
      </section>

      {/* ── Stats strip ────────────────────────────────────────────────────── */}
      {stats.totalProperties > 0 && (
        <div className="home-stats-strip" aria-label="Dataset overview">
          <StatChip value={stats.totalProperties.toLocaleString()} label="Properties indexed" accent />
          <StatChip value={`${stats.yearBuiltKnown.toLocaleString()} (${stats.yearBuiltPct}%)`} label="Known year built" />
          <StatChip value={stats.uniqueBlocks.toLocaleString()} label="Street blocks" />
          <StatChip value={stats.permitRecords.toLocaleString()} label="With permit records" />
          <StatChip value={stats.salesRecords.toLocaleString()} label="With sale records" />
          <StatChip value={stats.historicSurveyCount.toLocaleString()} label="Historic survey matches" />
          {stats.sanbornCount > 0 && (
            <StatChip value={stats.sanbornCount.toLocaleString()} label="Sanborn map snapshots" />
          )}
        </div>
      )}
      {isLoading && (
        <div className="home-stats-strip home-stats-strip--loading" aria-label="Loading dataset stats">
          {[...Array(5)].map((_, i) => <div key={i} className="home-stat-skeleton" />)}
        </div>
      )}

      {/* ── City growth chart ──────────────────────────────────────────────── */}
      <HomeSection
        eyebrow="Park Ridge history"
        title="How did Park Ridge grow?"
        desc={
          peakDecade
            ? `Most known homes were built in the ${peakDecade.decade}s — ${peakDecade.count.toLocaleString()} properties (${peakDecade.percent}% of those with known construction years). Chart shows known construction year records only.`
            : "Decade-by-decade construction based on known year-built records from the Cook County Assessor."
        }
        source="Cook County Assessor year-built field. Records with unknown or suspicious years are excluded."
        linkTo={ROUTES.city.path}
        linkLabel="Full city growth story →"
        isEmpty={cityGrowthRows.length === 0}
        isLoading={isLoading}
      >
        <div className="home-decade-chart" aria-label="Park Ridge homes by decade built">
          {cityGrowthRows.map((row) => (
            <div key={row.decade} className="hdc-row">
              <span className="hdc-label">{row.decade}s</span>
              <span className="hdc-bar-track" aria-hidden="true">
                <span
                  className={`hdc-bar${row.isPeak ? " hdc-bar--peak" : ""}`}
                  style={{ width: `${Math.max(2, (row.count / maxGrowthCount) * 100)}%` }}
                />
              </span>
              <span className="hdc-count">
                {row.count.toLocaleString()}
                {row.isPeak && <span className="hdc-peak-badge">peak</span>}
              </span>
            </div>
          ))}
        </div>
      </HomeSection>

      {/* ── Top 10 Oldest Properties ───────────────────────────────────────── */}
      <HomeSection
        eyebrow="Oldest known homes"
        title="Top 10 oldest properties in Park Ridge"
        desc="Properties with the earliest confirmed construction year from Cook County Assessor records. Year built reflects the current structure, not necessarily the original construction on the site."
        source="Cook County Assessor year-built field. Earliest records only."
        isEmpty={topOldest.items.length === 0}
        isLoading={isLoading}
      >
        <RankedInsightSection
          insight={topOldest}
          onSelectProperty={(pin) => navigate(propertyPath(pin))}
        />
      </HomeSection>

      {/* ── Top 10 Oldest Blocks ───────────────────────────────────────────── */}
      <HomeSection
        eyebrow="Earliest developed areas"
        title="Top 10 oldest known street blocks"
        desc="Street blocks with the earliest known construction year among their properties. Requires at least 2 properties with known year built. Block boundaries are Census-derived, not official city blocks."
        source="Derived from Cook County Assessor year-built records grouped by Census street block ID."
        isEmpty={oldestBlocks.length === 0}
        isLoading={isLoading}
      >
        <OldestBlockList blocks={oldestBlocks} onNavigate={(id) => navigate(blockPath(id))} />
      </HomeSection>

      {/* ── Neighborhood comparison ────────────────────────────────────────── */}
      {neighborhoods.length > 0 && (
        <HomeSection
          eyebrow="Neighborhood overview"
          title="Park Ridge neighborhoods at a glance"
          desc="Approximate local area boundaries based on parcel centroid location. Signal reflects dominant development pattern in available records."
          source="Boundaries are approximate and derived from parcel location data, not official city designations."
          linkTo={ROUTES.neighborhoods.path}
          linkLabel="Explore all neighborhoods →"
        >
          <div className="home-neighborhood-grid">
            {neighborhoods.map((n) => (
              <NeighborhoodCard key={n.properties.id} neighborhood={n} />
            ))}
          </div>
        </HomeSection>
      )}

      {/* ── Top 10 Most Permitted ─────────────────────────────────────────── */}
      <HomeSection
        eyebrow="Most active properties"
        title="Top 10 most permitted properties"
        desc="Properties with the most building permit records on file. High permit counts can reflect active long-term reinvestment, renovations, or additions over many years."
        source="Cook County building permit records. Older permit records may be missing or incomplete."
        isEmpty={topPermitted.items.length === 0}
        isLoading={isLoading}
      >
        <RankedInsightSection
          insight={topPermitted}
          onSelectProperty={(pin) => navigate(propertyPath(pin))}
        />
      </HomeSection>

      {/* ── Top 10 Assessment Value Changes ───────────────────────────────── */}
      {hasAssessmentData && (
        <HomeSection
          eyebrow="Assessment history"
          title="Top 10 largest assessed value changes"
          desc="Properties with the largest percentage increase in assessed value between their earliest and latest assessment records. Large increases may reflect major renovations, new construction, or market-driven reassessment."
          source="Cook County Assessor assessment records. Assessed value is not the same as market value."
        >
          <RankedInsightSection
            insight={topAssessedChange}
            onSelectProperty={(pin) => navigate(propertyPath(pin))}
          />
        </HomeSection>
      )}
      {!hasAssessmentData && !isLoading && (
        <HomeSection
          eyebrow="Assessment history"
          title="Top 10 largest assessed value changes"
          isEmpty
          emptyText="Assessment history comparison is not yet available in the current dataset."
          source=""
        >
          <></>
        </HomeSection>
      )}

      {/* ── Map explorer CTA ──────────────────────────────────────────────── */}
      <div className="home-explore-cta">
        <div className="home-explore-cta-inner">
          <div className="home-explore-cta-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <h2 className="home-explore-cta-title">Explore everything on the map</h2>
          <p className="home-explore-cta-body">
            The interactive map explorer shows all 13,000+ Park Ridge properties colored by age, permit pressure, or development era. Layer in historical map overlays and timeline controls.
          </p>
          <Link to={ROUTES.explore.path} className="home-explore-cta-btn">
            Open map explorer
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </Link>
        </div>
      </div>

      {/* ── Source transparency ────────────────────────────────────────────── */}
      <div className="home-transparency">
        <div className="home-transparency-inner">
          <h2 className="home-transparency-title">Data sources</h2>
          <div className="home-transparency-grid">
            {[
              "Cook County Assessor — year built, assessments",
              "Cook County Recorder — sale history",
              "Cook County Building Permits",
              "Hargis Historic Survey — 109 properties",
              "Sanborn Fire Insurance Maps",
              "Park Ridge civic records",
              "Census street block groupings",
            ].map((source) => (
              <div key={source} className="home-transparency-item">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                {source}
              </div>
            ))}
          </div>
          <p className="home-transparency-note">
            All data is derived from public records. Missing or incomplete records are shown explicitly.
            Claims about historical patterns reflect the current indexed dataset, not a complete historical record.{" "}
            <Link to={ROUTES.sources.path} className="home-transparency-link">
              Full source documentation →
            </Link>
          </p>
        </div>
      </div>

    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function HomeSection({
  eyebrow,
  title,
  desc,
  source,
  children,
  linkTo,
  linkLabel,
  isEmpty = false,
  isLoading = false,
  emptyText,
}: {
  eyebrow: string;
  title: string;
  desc?: string;
  source: string;
  children: React.ReactNode;
  linkTo?: string;
  linkLabel?: string;
  isEmpty?: boolean;
  isLoading?: boolean;
  emptyText?: string;
}) {
  return (
    <section className="home-section">
      <div className="home-section-inner">
        <div className="home-section-header">
          <p className="home-section-eyebrow">{eyebrow}</p>
          <h2 className="home-section-title">{title}</h2>
          {desc && <p className="home-section-desc">{desc}</p>}
        </div>

        {isLoading && (
          <div className="home-section-loading">
            <div className="home-loading-shimmer" />
            <div className="home-loading-shimmer home-loading-shimmer--short" />
          </div>
        )}

        {!isLoading && isEmpty && (
          <p className="home-section-empty">
            {emptyText ?? "No data is available for this section yet."}
          </p>
        )}

        {!isLoading && !isEmpty && children}

        {source && (
          <p className="home-section-source">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            {source}
          </p>
        )}

        {linkTo && linkLabel && (
          <Link to={linkTo} className="home-section-link">{linkLabel}</Link>
        )}
      </div>
    </section>
  );
}

// ─── Stat chip ────────────────────────────────────────────────────────────────

function StatChip({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className={`home-stat-chip${accent ? " home-stat-chip--accent" : ""}`}>
      <span className="home-stat-value">{value}</span>
      <span className="home-stat-label">{label}</span>
    </div>
  );
}

// ─── Oldest block list ────────────────────────────────────────────────────────

function OldestBlockList({
  blocks,
  onNavigate,
}: {
  blocks: BlockSummary[];
  onNavigate: (blockId: string) => void;
}) {
  if (blocks.length === 0) {
    return <p className="home-section-empty">No block data available yet.</p>;
  }

  return (
    <ol className="home-block-list" aria-label="Oldest street blocks">
      {blocks.map((block, i) => (
        <li key={block.blockId} className="hbl-item">
          <span className="hbl-rank" aria-hidden="true">{i + 1}</span>
          <button
            type="button"
            className="hbl-btn"
            onClick={() => onNavigate(block.blockId)}
            aria-label={`${block.label} — oldest known: ${block.oldestYearBuilt}`}
          >
            <span className="hbl-info">
              <span className="hbl-label">{block.label}</span>
              <span className="hbl-meta">{block.propertyCount} properties known</span>
            </span>
            <span className="hbl-values">
              <span className="hbl-value">
                {block.oldestYearBuilt ? `Built ${block.oldestYearBuilt}` : "Year unknown"}
              </span>
              {block.medianYearBuilt && (
                <span className="hbl-count">Median {block.medianYearBuilt}</span>
              )}
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

// ─── Neighborhood card ────────────────────────────────────────────────────────

function NeighborhoodCard({ neighborhood }: { neighborhood: AreaSummaryFeature }) {
  const p = neighborhood.properties;
  const slug = neighborhoodSlugFromId(p.id);

  return (
    <Link to={neighborhoodPath(slug)} className="hnc" aria-label={`${p.label} neighborhood`}>
      <div className="hnc-header">
        <h3 className="hnc-name">{p.label}</h3>
        <span className={`hnc-signal hnc-signal--${p.signal}`}>{p.signalLabel}</span>
      </div>
      <p className="hnc-desc">{p.description}</p>
      <div className="hnc-stats">
        <div className="hnc-stat">
          <span className="hnc-stat-value">{p.parcelCount.toLocaleString()}</span>
          <span className="hnc-stat-label">Properties</span>
        </div>
        {p.olderHomePercent > 0 && (
          <div className="hnc-stat">
            <span className="hnc-stat-value">{p.olderHomePercent}%</span>
            <span className="hnc-stat-label">Older homes</span>
          </div>
        )}
        {p.remodelPercent > 0 && (
          <div className="hnc-stat">
            <span className="hnc-stat-value">{p.remodelPercent}%</span>
            <span className="hnc-stat-label">Remodeled</span>
          </div>
        )}
      </div>
      <span className="hnc-cta" aria-hidden="true">
        Explore {p.label}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </span>
    </Link>
  );
}
