import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../routes/routeConfig";
import { fetchSubdivisionIndex, fetchSubdivisionDecadeDistribution } from "../../lib/supabase/subdivisionQueries";
import { ConfidenceBadge } from "../../components/cards/ConfidenceBadge";
import { SourceBadge } from "../../components/cards/SourceBadge";
import {
  subdivisionPath,
  recordedYearDisplay,
  toConfidenceBadgeLevel,
  confidenceLevelLabel,
} from "../../lib/subdivisionTypes";
import type { SubdivisionSummary } from "../../lib/subdivisionTypes";

const DECADE_OPTIONS = [
  { label: "All eras", value: 0 },
  { label: "Before 1900", value: -1 },
  { label: "1900s", value: 1900 },
  { label: "1910s", value: 1910 },
  { label: "1920s", value: 1920 },
  { label: "1930s", value: 1930 },
  { label: "1940s", value: 1940 },
  { label: "1950s", value: 1950 },
  { label: "1960s–present", value: 1960 },
  { label: "Date unknown", value: -2 },
];

export function SubdivisionsPage() {
  const [subdivisions, setSubdivisions] = useState<SubdivisionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDecade, setSelectedDecade] = useState(0);
  const [selectedConfidence, setSelectedConfidence] = useState<string>("all");

  useEffect(() => {
    fetchSubdivisionIndex().then((data) => {
      setSubdivisions(data);
      setIsLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    let results = subdivisions;

    if (searchQuery.trim().length >= 2) {
      const q = searchQuery.trim().toUpperCase();
      results = results.filter(
        (s) =>
          s.normalized_name.includes(q) ||
          s.name.toUpperCase().includes(q) ||
          (s.original_owner ?? "").toUpperCase().includes(q) ||
          (s.developer ?? "").toUpperCase().includes(q)
      );
    }

    if (selectedDecade === -1) {
      results = results.filter((s) => s.recorded_year != null && s.recorded_year < 1900);
    } else if (selectedDecade === -2) {
      results = results.filter((s) => s.recorded_year == null);
    } else if (selectedDecade >= 1900) {
      results = results.filter(
        (s) =>
          s.recorded_year != null &&
          s.recorded_year >= selectedDecade &&
          (selectedDecade === 1960 ? s.recorded_year >= 1960 : s.recorded_year < selectedDecade + 10)
      );
    }

    if (selectedConfidence !== "all") {
      results = results.filter((s) => s.confidence_level === selectedConfidence);
    }

    return results;
  }, [subdivisions, searchQuery, selectedDecade, selectedConfidence]);

  return (
    <div className="content-page">
      <div className="content-page-inner">
        <nav className="page-breadcrumb" aria-label="Breadcrumb">
          <Link to={ROUTES.city.path}>Park Ridge</Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">Subdivisions</span>
        </nav>

        <header className="content-page-header">
          <h1 className="content-page-title">Park Ridge Subdivisions</h1>
          <p className="content-page-subtitle">
            Most Park Ridge homes trace back to a recorded subdivision plat —
            a legal map that divided farmland and large tracts into streets, blocks,
            and individual lots. Explore how the city's neighborhoods took shape.
          </p>
        </header>

        {/* Controls */}
        <div className="subdivision-controls">
          <div className="subdivision-search-wrap">
            <label className="sr-only" htmlFor="subdivision-search">
              Search subdivisions
            </label>
            <input
              id="subdivision-search"
              className="subdivision-search-input"
              type="search"
              placeholder="Search by name, owner, or developer…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search subdivisions"
            />
          </div>
          <div className="subdivision-filter-row">
            <label className="subdivision-filter-label" htmlFor="decade-filter">
              Era recorded
            </label>
            <select
              id="decade-filter"
              className="subdivision-filter-select"
              value={selectedDecade}
              onChange={(e) => setSelectedDecade(Number(e.target.value))}
            >
              {DECADE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <label className="subdivision-filter-label" htmlFor="confidence-filter">
              Confidence
            </label>
            <select
              id="confidence-filter"
              className="subdivision-filter-select"
              value={selectedConfidence}
              onChange={(e) => setSelectedConfidence(e.target.value)}
            >
              <option value="all">All levels</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="page-loading">Loading subdivision records…</div>
        ) : subdivisions.length === 0 ? (
          <SubdivisionsEmptyState />
        ) : filtered.length === 0 ? (
          <div className="page-empty">
            No subdivisions match your search or filters.
            <button
              className="text-btn"
              onClick={() => {
                setSearchQuery("");
                setSelectedDecade(0);
                setSelectedConfidence("all");
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <p className="subdivision-result-count">
              {filtered.length === subdivisions.length
                ? `${subdivisions.length.toLocaleString()} subdivisions`
                : `${filtered.length.toLocaleString()} of ${subdivisions.length.toLocaleString()} subdivisions`}
            </p>
            <div className="subdivision-grid">
              {filtered.map((s) => (
                <SubdivisionCard key={s.id} subdivision={s} />
              ))}
            </div>
          </>
        )}

        <p className="page-caveat">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          Subdivision data is a work in progress. Recording dates require manual research
          in the Cook County Recorder's plat index and are not yet confirmed for most
          subdivisions. Confidence labels indicate how each record was sourced.{" "}
          <Link to={ROUTES.sources.path}>Learn more about our sources.</Link>
        </p>
      </div>
    </div>
  );
}

function SubdivisionCard({ subdivision: s }: { subdivision: SubdivisionSummary }) {
  const badgeLevel = toConfidenceBadgeLevel(s.confidence_level);
  const badgeLabel = confidenceLevelLabel(s.confidence_level);

  return (
    <Link to={subdivisionPath(s.id)} className="subdivision-card" aria-label={`View ${s.name} subdivision`}>
      <div className="subdivision-card-header">
        <h2 className="subdivision-card-name">{s.name}</h2>
        {s.recorded_year ? (
          <span className="subdivision-card-year">Recorded {s.recorded_year}</span>
        ) : (
          <span className="subdivision-card-year unknown">Recording date unknown</span>
        )}
      </div>

      <div className="subdivision-card-meta">
        {(s.parcel_count ?? 0) > 0 && (
          <span className="subdivision-card-parcels">
            ~{(s.parcel_count ?? 0).toLocaleString()} current parcels
          </span>
        )}
        {s.original_owner && (
          <span className="subdivision-card-owner">Developed by {s.original_owner}</span>
        )}
      </div>

      <div className="subdivision-card-footer">
        <ConfidenceBadge
          level={badgeLevel}
          label={badgeLabel}
          explanation={s.confidence_reason ?? ""}
        />
        {s.source_name && <SourceBadge source={s.source_name} />}
      </div>
    </Link>
  );
}

function SubdivisionsEmptyState() {
  return (
    <div className="subdivision-empty-state">
      <div className="subdivision-empty-icon" aria-hidden="true">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </div>
      <h2 className="subdivision-empty-title">Subdivision data is being built</h2>
      <p className="subdivision-empty-body">
        Subdivision history for Park Ridge requires research in the Cook County Recorder's
        recorded plat index and Cook County GIS data. The data pipeline has not yet been run,
        or no subdivision records were found for Park Ridge.
      </p>
      <p className="subdivision-empty-body">
        Once the pipeline runs, this page will show all known Park Ridge subdivisions
        with their recording dates, original owners, and parcel counts.
      </p>
      <div className="subdivision-empty-links">
        <p className="subdivision-empty-sources">
          Learn how subdivision data is being built:{" "}
          <Link to={ROUTES.sources.path}>Data sources and methodology</Link>
        </p>
      </div>
    </div>
  );
}
