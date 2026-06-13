import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Home, Grid3x3, MapPin, TrendingUp, Map, Database,
  Clock, DollarSign, Wrench, Star, BarChart2, Activity
} from "lucide-react";
import { SearchBox } from "../components/search/SearchBox";
import { RankedInsightCard } from "../components/cards/RankedInsightCard";
import { StatCard } from "../components/cards/StatCard";
import { useParkRidgeContext } from "../contexts/ParkRidgeDataContext";
import { ROUTES } from "../lib/routes";
import {
  topMostSold,
  topMostPermits,
  topOldestHomes,
  topNewestHomes,
  topLargestAssessmentChange,
  topLargestSalePriceChange,
} from "../lib/rankings";
import { formatNumber, formatAddress } from "../lib/formatters";
import { useRecentlyViewed } from "../lib/hooks/useRecentlyViewed";
import "./DiscoverPage.css";

const NEIGHBORHOODS = [
  { id: "uptown", label: "Uptown", desc: "Metra station, library, civic core", color: "#22d3ee" },
  { id: "south_park", label: "South Park", desc: "South of Touhy corridor", color: "#34d399" },
  { id: "northwest_park", label: "Northwest Park", desc: "Dee Road, Dee Park, western edge", color: "#60a5fa" },
  { id: "northeast_park", label: "Northeast Park", desc: "Greenwood, Busse, northern edge", color: "#a78bfa" },
  { id: "southwest_woods", label: "Southwest Woods", desc: "Forest preserve edge, larger lots", color: "#fbbf24" },
  { id: "southeast_park", label: "Southeast Park", desc: "Cumberland, Devon, Chicago edge", color: "#f87171" },
];

const navCards = [
  {
    icon: Home,
    label: "Property Search",
    desc: "Find any property in Park Ridge by address or PIN",
    to: ROUTES.search,
    accent: "#22d3ee",
  },
  {
    icon: Grid3x3,
    label: "Streets & Blocks",
    desc: "Explore permit activity, ages, and trends by block",
    to: ROUTES.blocks,
    accent: "#60a5fa",
  },
  {
    icon: MapPin,
    label: "Neighborhoods",
    desc: "Compare Park Ridge's distinct neighborhoods",
    to: ROUTES.neighborhoods,
    accent: "#34d399",
  },
  {
    icon: TrendingUp,
    label: "Citywide Trends",
    desc: "Park Ridge development patterns and statistics",
    to: ROUTES.parkRidge,
    accent: "#fbbf24",
  },
  {
    icon: Map,
    label: "Historical Maps",
    desc: "Aerial imagery, parcel snapshots, and survey layers",
    to: ROUTES.maps,
    accent: "#a78bfa",
  },
  {
    icon: Database,
    label: "Data Sources",
    desc: "Coverage, limitations, and data quality notes",
    to: ROUTES.dataSources,
    accent: "#f87171",
  },
];

export function DiscoverPage() {
  const { parcels, isLoading, parcelCount, parcelsByPin } = useParkRidgeContext();
  const recentPins = useRecentlyViewed();

  const features = useMemo(() => parcels?.features ?? [], [parcels]);

  const cityStats = useMemo(() => {
    const yearBuilts = features
      .map((f) => f.properties.year_built)
      .filter((y): y is number => typeof y === "number" && y >= 1800 && y <= 2030);
    const withPermits = features.filter((f) => (f.properties.permit_count ?? 0) > 0).length;
    const withSales = features.filter((f) => (f.properties.sale_count ?? 0) > 0).length;
    return {
      totalParcels: parcelCount,
      oldestYear: yearBuilts.length ? Math.min(...yearBuilts) : null,
      newestYear: yearBuilts.length ? Math.max(...yearBuilts) : null,
      withKnownYear: yearBuilts.length,
      withPermits,
      withSales,
    };
  }, [features, parcelCount]);

  const rankings = useMemo(() => ({
    mostSold: topMostSold(features),
    mostPermits: topMostPermits(features),
    oldest: topOldestHomes(features),
    newest: topNewestHomes(features),
    assessmentChange: topLargestAssessmentChange(features),
    salePriceChange: topLargestSalePriceChange(features),
  }), [features]);

  return (
    <div className="discover-page">
      {/* ─── Hero ─── */}
      <section className="discover-hero">
        <div className="discover-hero-inner">
          <div className="discover-hero-copy">
            <p className="discover-eyebrow">Park Ridge, Illinois · Est. 1873</p>
            <h1 className="discover-title">
              The History of<br />Park Ridge Land
            </h1>
            <p className="discover-subtitle">
              Explore 12,000+ properties through permits, sales, assessments, and
              development patterns. Every claim traced to source data.
            </p>
          </div>

          <div className="discover-search-wrap">
            <p className="discover-search-label">Search by address or PIN</p>
            <SearchBox
              placeholder="e.g. 123 Main St or 09-21-100-001-0000"
              autoFocus
            />
            <p className="discover-search-hint">
              Exact match goes directly to the property page.
              Partial address shows matching results.
            </p>
          </div>
        </div>
      </section>

      <div className="page-container">
        {/* ─── City Stats ─── */}
        <section className="page-section">
          <div className="section-header">
            <div>
              <span className="section-eyebrow">By the numbers</span>
              <h2 className="section-title">Park Ridge at a glance</h2>
            </div>
          </div>
          <div className="grid-4">
            <StatCard
              label="Total Properties"
              value={formatNumber(cityStats.totalParcels)}
              subValue="Parcels on record"
              icon={Home}
              accent="cyan"
            />
            <StatCard
              label="Oldest Home"
              value={cityStats.oldestYear ? String(cityStats.oldestYear) : "—"}
              subValue="Earliest year built"
              icon={Clock}
              accent="amber"
            />
            <StatCard
              label="With Permit Data"
              value={formatNumber(cityStats.withPermits)}
              subValue={`${((cityStats.withPermits / Math.max(cityStats.totalParcels, 1)) * 100).toFixed(0)}% of properties`}
              icon={Wrench}
              accent="amber"
            />
            <StatCard
              label="With Sale Records"
              value={formatNumber(cityStats.withSales)}
              subValue="Properties with sales data"
              icon={DollarSign}
              accent="green"
            />
          </div>
        </section>

        {/* ─── Recently Viewed ─── */}
        {recentPins.length > 0 && (
          <section className="page-section">
            <div className="section-header">
              <div>
                <span className="section-eyebrow">Your history</span>
                <h2 className="section-title">Recently viewed</h2>
              </div>
            </div>
            <div className="discover-recent-grid">
              {recentPins.map((pin) => {
                const parcel = parcelsByPin.get(pin);
                const addr = parcel ? formatAddress(parcel.properties.address) : pin;
                return (
                  <Link key={pin} to={ROUTES.property(pin)} className="discover-recent-card">
                    <Home size={13} strokeWidth={2} style={{ color: "#22d3ee", flexShrink: 0 }} aria-hidden="true" />
                    <span className="discover-recent-addr">{addr}</span>
                    {parcel?.properties.year_built && (
                      <span className="discover-recent-year">{parcel.properties.year_built}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── Neighborhood Quick-Links ─── */}
        <section className="page-section">
          <div className="section-header">
            <div>
              <span className="section-eyebrow">6 neighborhoods</span>
              <h2 className="section-title">Explore by neighborhood</h2>
            </div>
            <Link to={ROUTES.neighborhoods} className="link-pill">All neighborhoods</Link>
          </div>
          <div className="discover-neighborhood-grid">
            {NEIGHBORHOODS.map((n) => (
              <Link key={n.id} to={ROUTES.neighborhood(n.id)} className="discover-neighborhood-card">
                <div className="discover-neighborhood-stripe" style={{ background: n.color }} />
                <div className="discover-neighborhood-body">
                  <strong className="discover-neighborhood-label">{n.label}</strong>
                  <p className="discover-neighborhood-desc">{n.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ─── Navigation Cards ─── */}
        <section className="page-section">
          <div className="section-header">
            <div>
              <span className="section-eyebrow">Explore</span>
              <h2 className="section-title">What would you like to explore?</h2>
            </div>
          </div>
          <div className="discover-nav-grid">
            {navCards.map((card) => (
              <Link key={card.to} to={card.to} className="discover-nav-card">
                <div className="discover-nav-icon" style={{
                  color: card.accent,
                  borderColor: `${card.accent}33`,
                  background: `${card.accent}12`,
                }}>
                  <card.icon size={20} strokeWidth={1.8} aria-hidden="true" />
                </div>
                <div>
                  <strong className="discover-nav-label">{card.label}</strong>
                  <p className="discover-nav-desc">{card.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ─── Ranked Insights ─── */}
        <section className="page-section">
          <div className="section-header">
            <div>
              <span className="section-eyebrow">Ranked Insights</span>
              <h2 className="section-title">Top properties in Park Ridge</h2>
            </div>
          </div>

          {isLoading ? (
            <div className="loading-spinner">
              <div className="spinner-dot" />
              <div className="spinner-dot" />
              <div className="spinner-dot" />
              <span>Loading property data…</span>
            </div>
          ) : (
            <div className="discover-rankings-grid">
              <RankedInsightCard
                title="Most Frequently Sold"
                icon={DollarSign}
                accentColor="#34d399"
                items={rankings.mostSold}
              />
              <RankedInsightCard
                title="Most Permit Activity"
                icon={Wrench}
                accentColor="#fbbf24"
                items={rankings.mostPermits}
              />
              <RankedInsightCard
                title="Oldest Homes"
                icon={Clock}
                accentColor="#c4a97a"
                items={rankings.oldest}
              />
              <RankedInsightCard
                title="Newest Construction"
                icon={Star}
                accentColor="#22d3ee"
                items={rankings.newest}
              />
              <RankedInsightCard
                title="Largest Assessment Change"
                icon={BarChart2}
                accentColor="#a78bfa"
                items={rankings.assessmentChange}
              />
              <RankedInsightCard
                title="Highest Peak Sale Price"
                icon={Activity}
                accentColor="#f87171"
                items={rankings.salePriceChange}
              />
            </div>
          )}
        </section>

        {/* ─── About ─── */}
        <section className="page-section">
          <div className="discover-about glass-card">
            <div className="discover-about-copy">
              <span className="section-eyebrow">About this project</span>
              <h2 className="section-title">Ancestry.com for Park Ridge homes</h2>
              <p>
                This site traces every available record for Park Ridge properties — permits, sales,
                assessed values, historic survey data, and development patterns. Data is sourced from
                Cook County open datasets and cross-referenced against local archives.
              </p>
              <p>
                Every fact is cited. Every claim is traceable. Where data is absent or uncertain,
                the site says so rather than guessing.
              </p>
            </div>
            <div className="discover-about-links">
              <Link to={ROUTES.dataSources} className="link-pill">
                <Database size={13} strokeWidth={2} aria-hidden="true" />
                View data sources
              </Link>
              <Link to={ROUTES.search} className="link-pill">
                <Home size={13} strokeWidth={2} aria-hidden="true" />
                Search properties
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
