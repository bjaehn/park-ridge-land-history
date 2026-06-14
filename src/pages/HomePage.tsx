import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useParkRidgeContext } from "../contexts/ParkRidgeDataContext";
import {
  propertyPath, neighborhoodPath,
  neighborhoodSlugFromId, ROUTES
} from "../routes/routeConfig";
import { RankedInsightSection } from "../components/RankedInsightSection";
import { getNeighborhoodSummaries, getNamedNeighborhoods } from "../lib/data/neighborhoods";
import type { AreaSummaryFeature } from "../lib/areaGroups";
import { decadeColors } from "../lib/colorScales";
import type { DecadeBucket } from "../lib/parcelTypes";
import {
  fetchHomeStats, fetchDecadeDistribution, fetchOldestProperties,
  searchParcels,
  type HomeStats, type DecadeRow, type SearchResult,
} from "../lib/supabase/homeQueries";
import type { RankedItem, RankedInsightList } from "../lib/rankedInsights";

function toInsightList(
  title: string,
  description: string,
  sourceNote: string,
  items: RankedItem[],
  emptyText: string
): RankedInsightList {
  return { title, description, sourceNote, items, emptyText };
}

const EXAMPLE_CHIPS = [
  { label: "Prospect", query: "Prospect" },
  { label: "Touhy", query: "Touhy" },
  { label: "Uptown", query: "Uptown" },
  { label: "09-21", query: "09-21" },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export function HomePage() {
  const { parcels } = useParkRidgeContext();
  const navigate = useNavigate();

  // ── Hero search ─────────────────────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      const results = await searchParcels(query, 8);
      setSearchResults(results);
    }, 180);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query]);

  const showDropdown = isFocused && query.trim().length >= 2;

  function handleSelect(pin: string) {
    setQuery("");
    setSearchResults([]);
    navigate(propertyPath(pin));
  }

  function handleChip(chipQuery: string) {
    setQuery(chipQuery);
    inputRef.current?.focus();
  }

  // ── Section state ───────────────────────────────────────────────────────────
  const [stats, setStats] = useState<HomeStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [decades, setDecades] = useState<DecadeRow[]>([]);
  const [decadesLoading, setDecadesLoading] = useState(true);

  const [oldest, setOldest] = useState<RankedItem[]>([]);
  const [oldestLoading, setOldestLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetchHomeStats().then((d) => {
      if (active) { setStats(d); setStatsLoading(false); }
    });
    fetchDecadeDistribution().then((d) => {
      if (active) { setDecades(d); setDecadesLoading(false); }
    });
    fetchOldestProperties(5).then((d) => {
      if (active) { setOldest(d); setOldestLoading(false); }
    });

    return () => { active = false; };
  }, []);

  // ── Neighborhood grid ───────────────────────────────────────────────────────
  const neighborhoodSummaries = useMemo(() => getNeighborhoodSummaries(parcels), [parcels]);
  const neighborhoods = useMemo(() => getNamedNeighborhoods(neighborhoodSummaries), [neighborhoodSummaries]);
  const neighborhoodsLoading = !parcels;

  // ── Decade chart ────────────────────────────────────────────────────────────
  const peakDecade = decades.find((r) => r.isPeak) ?? null;
  const maxGrowthCount = Math.max(1, ...decades.map((r) => r.count));

  return (
    <div className="home-page">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="hero-section" aria-label="Welcome">
        <div className="hero-inner">
          <p className="hero-eyebrow">Park Ridge, Illinois</p>
          <h1 className="hero-title">
            Discover the story of any Park Ridge home
          </h1>
          <p className="hero-tagline">
            Search by address to see year built, permits, sales, assessments,
            historic records, neighborhood context, and source-backed development history.
          </p>

          {/* Search */}
          <div className="hero-search-wrap" role="search" aria-label="Property search">
            <label htmlFor="hero-search" className="sr-only">Search a Park Ridge address or PIN</label>
            <div className={`hero-search-input-wrap${isFocused ? " is-focused" : ""}`}>
              <svg className="hero-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                id="hero-search"
                ref={inputRef}
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
              <ul className="hero-search-results" id="hero-search-results" role="listbox" aria-label="Search results">
                {searchResults.map((r) => (
                  <li key={r.pin} role="option" aria-selected={false}>
                    <button type="button" className="hsr-btn" onMouseDown={() => handleSelect(r.pin)}>
                      <span className="hsr-address">{r.address}</span>
                      <span className="hsr-meta">
                        {r.yearBuilt ? `Built ${r.yearBuilt}` : "Year unknown"}
                        {r.permitCount ? ` · ${r.permitCount} permits` : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {showDropdown && searchResults.length === 0 && (
              <div className="hero-search-empty" role="status">
                No matches found. Try a street name like "Prospect" or the first digits of a PIN.
              </div>
            )}
          </div>

          {/* Example chips */}
          <div className="hero-chips" aria-label="Search examples">
            <span className="hero-chips-label">Try:</span>
            {EXAMPLE_CHIPS.map((chip) => (
              <button
                key={chip.query}
                type="button"
                className="hero-chip"
                onClick={() => handleChip(chip.query)}
                aria-label={`Search for ${chip.label}`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Hero quick-nav */}
          <div className="hero-quick-nav" aria-label="Quick navigation">
            <Link to={ROUTES.neighborhoods.path} className="hero-quick-btn hero-quick-btn--primary">
              Explore neighborhoods
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
            Source-backed and coverage-honest. Missing records are shown explicitly, not hidden.
            {stats && stats.totalProperties > 0 && ` Covering ${stats.totalProperties.toLocaleString()} Park Ridge properties.`}
          </p>
        </div>
      </section>

      {/* ── Start here ───────────────────────────────────────────────────── */}
      <div className="home-start-here">
        <div className="home-start-here-inner">
          <p className="home-start-here-label">How it works</p>
          <ol className="home-start-steps" aria-label="How to use this site">
            <li className="home-start-step">
              <span className="home-start-num" aria-hidden="true">1</span>
              <span className="home-start-text">
                <strong>Search an address</strong> to pull up its property record
              </span>
            </li>
            <li className="home-start-step">
              <span className="home-start-num" aria-hidden="true">2</span>
              <span className="home-start-text">
                <strong>Review what the records say</strong> about year built, permits, sales, and assessments
              </span>
            </li>
            <li className="home-start-step">
              <span className="home-start-num" aria-hidden="true">3</span>
              <span className="home-start-text">
                <strong>Compare the property</strong> to its block, neighborhood, and the city
              </span>
            </li>
            <li className="home-start-step">
              <span className="home-start-num" aria-hidden="true">4</span>
              <span className="home-start-text">
                <strong>Check sources and caveats</strong> before drawing conclusions
              </span>
            </li>
          </ol>
        </div>
      </div>

      {/* ── Stats strip ──────────────────────────────────────────────────── */}
      {(statsLoading || (stats && stats.totalProperties > 0)) && (
        <div className="home-stats-strip" aria-label="Dataset overview">
          <div className="home-stats-strip-inner">
            {statsLoading ? (
              [...Array(5)].map((_, i) => <div key={i} className="home-stat-skeleton" />)
            ) : stats ? (
              <>
                <StatChip value={stats.totalProperties.toLocaleString()} label="Properties indexed" accent />
                <StatChip value={`${stats.yearBuiltKnown.toLocaleString()} (${stats.yearBuiltPct}%)`} label="Known year built" />
                <StatChip value={stats.uniqueBlocks.toLocaleString()} label="Street blocks" />
                <StatChip value={`${stats.withPermits.toLocaleString()} (${stats.permitsPct}%)`} label="With permit records" />
                <StatChip value={`${stats.withSales.toLocaleString()} (${stats.salesPct}%)`} label="With sale records" />
                <StatChip value={stats.historicSurveys.toLocaleString()} label="Historic survey matches" />
                {stats.pre1945Count > 0 && (
                  <StatChip value={`${stats.pre1945Count.toLocaleString()} (${stats.pre1945Pct}%)`} label="Built before 1945" />
                )}
              </>
            ) : null}
          </div>
          <p className="home-stats-note">
            Coverage reflects records linked to this dataset, not a complete historical record.
          </p>
        </div>
      )}

      {/* ── City growth chart ─────────────────────────────────────────────── */}
      <HomeSection
        eyebrow="Park Ridge history"
        title="How did Park Ridge grow?"
        desc={
          peakDecade
            ? `Most homes with known build years were constructed in the ${peakDecade.decade}: ${peakDecade.count.toLocaleString()} properties (${peakDecade.percent}% of records with known years). Chart shows records with confirmed year built only.`
            : "Decade-by-decade construction based on known year-built records from the Cook County Assessor."
        }
        source="Source dataset: Cook County Assessor year-built field. Records with unknown or suspicious years are excluded."
        linkTo={ROUTES.city.path}
        linkLabel="Full city growth story"
        isEmpty={!decadesLoading && decades.length === 0}
        isLoading={decadesLoading}
      >
        <div className="decade-chart" aria-label="Park Ridge homes by decade built">
          {decades.map((row) => (
            <div key={row.decade} className="chart-row">
              <span className="chart-label">{row.decade}</span>
              <span className="chart-track" aria-hidden="true">
                <span
                  className="chart-bar"
                  style={{
                    width: `${Math.max(4, (row.count / maxGrowthCount) * 100)}%`,
                    backgroundColor: decadeColors[row.decade as DecadeBucket] ?? "#9ca3af",
                  }}
                />
              </span>
              <span className="chart-value">
                {row.count.toLocaleString()}
                {row.isPeak && <span className="hdc-peak-badge">peak</span>}
              </span>
            </div>
          ))}
        </div>
      </HomeSection>

      {/* ── Ways to explore ──────────────────────────────────────────────── */}
      <section className="home-discovery" aria-label="Ways to explore">
        <div className="home-discovery-inner">
          <p className="home-discovery-eyebrow">Where do you want to start?</p>
          <h2 className="home-discovery-title">Four ways to explore Park Ridge history</h2>
          <div className="home-discovery-grid home-discovery-grid--four">
            <Link to={ROUTES.city.path} className="disc-card">
              <div className="disc-card-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="1" y1="22" x2="23" y2="22"/><path d="M2 22V15l5-2v9"/><path d="M7 22V10l5-5v17"/><path d="M12 22V13l5-3v12"/><path d="M17 22V17l4-2v7"/>
                </svg>
              </div>
              <h3 className="disc-card-title">How Park Ridge grew</h3>
              <p className="disc-card-body">See the full arc of construction from the 1880s to today. One decade stands out as Park Ridge's peak building era.</p>
              <span className="disc-card-cta">City growth story</span>
            </Link>
            <Link to={ROUTES.neighborhoods.path} className="disc-card">
              <div className="disc-card-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a7 7 0 017 7c0 4.97-6.22 12.18-6.7 12.76a.4.4 0 01-.6 0C11.22 21.18 5 13.97 5 9a7 7 0 017-7z"/><circle cx="12" cy="9" r="2.5"/>
                </svg>
              </div>
              <h3 className="disc-card-title">Neighborhoods by era</h3>
              <p className="disc-card-body">Compare when each neighborhood developed. Pre-war, postwar boom, or modern infill — each area has a distinct building character.</p>
              <span className="disc-card-cta">Browse neighborhoods</span>
            </Link>
            <Link to={ROUTES.explore.path} className="disc-card">
              <div className="disc-card-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </div>
              <h3 className="disc-card-title">Every property on the map</h3>
              <p className="disc-card-body">13,000+ Park Ridge properties, colored by age and development era. Layer in historical maps and timeline controls.</p>
              <span className="disc-card-cta">Open map explorer</span>
            </Link>
            <Link to={ROUTES.sources.path} className="disc-card">
              <div className="disc-card-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <h3 className="disc-card-title">What we know and what's missing</h3>
              <p className="disc-card-body">Where our data comes from, what gaps exist, and how to read uncertainty honestly. Missing records are shown, not hidden.</p>
              <span className="disc-card-cta">See our sources</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── A few oldest homes (compact, 5 only) ─────────────────────────── */}
      <HomeSection
        eyebrow="Oldest known homes"
        title="Some of Park Ridge's earliest recorded properties"
        desc="Properties with the earliest confirmed year built from Cook County Assessor records. Year built may reflect the current structure, not necessarily the original construction on the site."
        source="Source dataset: Cook County Assessor year-built field."
        linkTo={ROUTES.city.path}
        linkLabel="See full list on the city page"
        isEmpty={!oldestLoading && oldest.length === 0}
        isLoading={oldestLoading}
      >
        <RankedInsightSection
          insight={toInsightList(
            "Oldest known homes in Park Ridge",
            "Properties with the earliest confirmed year built from assessor records.",
            "Source dataset: Cook County Assessor year-built field.",
            oldest,
            "No year-built data is available yet."
          )}
          onSelectProperty={(pin) => navigate(propertyPath(pin))}
        />
      </HomeSection>

      {/* ── Neighborhood overview ─────────────────────────────────────────── */}
      <HomeSection
        eyebrow="Neighborhood overview"
        title="Park Ridge neighborhoods at a glance"
        desc="Approximate local area boundaries based on parcel location. Each area's signal reflects its dominant development pattern in available records."
        source="Boundaries are approximate and based on parcel location data, not official city designations."
        linkTo={ROUTES.neighborhoods.path}
        linkLabel="Explore all neighborhoods"
        isEmpty={!neighborhoodsLoading && neighborhoods.length === 0}
        isLoading={neighborhoodsLoading}
      >
        <div className="home-neighborhood-grid">
          {neighborhoods.map((n) => (
            <NeighborhoodCard key={n.properties.id} neighborhood={n} />
          ))}
        </div>
      </HomeSection>

      {/* ── Source transparency ────────────────────────────────────────────── */}
      <div className="home-transparency">
        <div className="home-transparency-inner">
          <h2 className="home-transparency-title">Data sources</h2>
          <div className="home-transparency-grid">
            {[
              "Cook County Assessor (year built, assessments)",
              "Cook County Recorder (sale history)",
              "Cook County Building Permits",
              "Hargis Historic Survey (109 properties)",
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
            All data is derived from public records. Links point to dataset sources, not individual record citations.
            Missing or incomplete records are shown explicitly. Claims about historical patterns reflect the
            current indexed dataset, not a complete historical record.{" "}
            <Link to={ROUTES.sources.path} className="home-transparency-link">
              Full source documentation
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
  source?: string;
  children?: React.ReactNode;
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
          <Link to={linkTo} className="home-section-link">{linkLabel} →</Link>
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
