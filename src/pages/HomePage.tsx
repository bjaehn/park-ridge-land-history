import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useParkRidgeContext } from "../contexts/ParkRidgeDataContext";
import { propertyPath, ROUTES } from "../routes/routeConfig";
import type { ParcelFeature } from "../lib/parcelTypes";

export function HomePage() {
  const { parcels } = useParkRidgeContext();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const normalizedQuery = query.trim().toLowerCase();

  const results = useMemo<ParcelFeature[]>(() => {
    if (!parcels || normalizedQuery.length < 2) return [];
    return parcels.features
      .filter((f) => {
        const addr = (f.properties.address ?? "").toLowerCase();
        const pin = (f.properties.pin_normalized ?? "").toLowerCase();
        return addr.includes(normalizedQuery) || pin.includes(normalizedQuery);
      })
      .slice(0, 8);
  }, [normalizedQuery, parcels]);

  const showDropdown = isFocused && normalizedQuery.length >= 2;

  function handleSelect(pin: string) {
    setQuery("");
    navigate(propertyPath(pin));
  }

  const totalProperties = parcels?.features.length ?? 0;

  return (
    <div className="home-page">
      {/* ── Hero ── */}
      <section className="hero-section" aria-label="Welcome">
        <div className="hero-inner">
          <p className="hero-eyebrow">Park Ridge, Illinois</p>
          <h1 className="hero-title">The history of your home,<br />source by source.</h1>
          <p className="hero-tagline">
            Search any Park Ridge address to see what the public record shows —
            year built, permits, sales, assessments, and historic survey matches.
            Every fact is tied to a source.
          </p>

          {/* Search */}
          <div className="hero-search-wrap" role="search">
            <label htmlFor="hero-search" className="sr-only">Search a Park Ridge address</label>
            <div className={`hero-search-input-wrap${isFocused ? " is-focused" : ""}`}>
              <svg className="hero-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                id="hero-search"
                className="hero-search-input"
                type="search"
                placeholder="Enter an address or PIN number…"
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
            {showDropdown && results.length > 0 && (
              <ul className="hero-search-results" id="hero-search-results" role="listbox">
                {results.map((f) => {
                  const pin = f.properties.pin_normalized ?? f.properties.pin_original ?? "";
                  return (
                    <li key={pin} role="option" aria-selected={false}>
                      <button
                        type="button"
                        className="hsr-btn"
                        onMouseDown={() => handleSelect(pin)}
                      >
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
            {showDropdown && results.length === 0 && (
              <div className="hero-search-empty">
                No matching addresses found. Try a street name or PIN number.
              </div>
            )}
          </div>

          <p className="hero-trust">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Every claim is sourced. Missing data is shown, not hidden.
            {totalProperties > 0 && ` Covering ${totalProperties.toLocaleString()} Park Ridge properties.`}
          </p>
        </div>
      </section>

      {/* ── Three paths ── */}
      <section className="paths-section" aria-label="Explore options">
        <div className="paths-inner">
          <h2 className="paths-heading">Three ways to explore</h2>
          <div className="paths-grid">
            <PathCard
              icon={<IconSearch />}
              title="Search an address"
              body="Look up any Park Ridge address and see what records are available: year built, permits, sales, assessments, and historic survey matches."
              cta="Use the search above"
              ctaHref={null}
            />
            <PathCard
              icon={<IconNeighborhood />}
              title="Explore neighborhoods"
              body="Compare housing age, permit activity, sales, and development patterns across Park Ridge's common neighborhoods."
              cta="Go to Neighborhoods"
              ctaHref={ROUTES.neighborhoods.path}
            />
            <PathCard
              icon={<IconCity />}
              title="See how Park Ridge grew"
              body="Understand the citywide development story by decade: when most homes were built, where reinvestment is visible, and what the data shows."
              cta="Go to Park Ridge"
              ctaHref={ROUTES.city.path}
            />
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="how-section" aria-label="How to use this site">
        <div className="how-inner">
          <h2 className="how-heading">How it works</h2>
          <ol className="how-steps">
            {[
              "Search any address or explore by neighborhood",
              "Review what the public record shows — year built, permits, sales, assessments",
              "Compare the property to its block, neighborhood, and the city",
              "Check sources and confidence levels before drawing conclusions",
            ].map((step, i) => (
              <li key={i} className="how-step">
                <span className="how-step-num" aria-hidden="true">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="how-explore-link">
          <Link to={ROUTES.explore.path} className="explore-link-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            Open the interactive map explorer
          </Link>
          <p className="explore-link-note">Advanced: full map with timeline, permit pressure, and historical layers.</p>
        </div>
      </section>
    </div>
  );
}

function PathCard({
  icon,
  title,
  body,
  cta,
  ctaHref,
}: {
  icon: JSX.Element;
  title: string;
  body: string;
  cta: string;
  ctaHref: string | null;
}) {
  return (
    <div className="path-card">
      <div className="path-card-icon" aria-hidden="true">{icon}</div>
      <h3 className="path-card-title">{title}</h3>
      <p className="path-card-body">{body}</p>
      {ctaHref && (
        <Link to={ctaHref} className="path-card-cta">
          {cta}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </Link>
      )}
      {!ctaHref && (
        <span className="path-card-cta path-card-cta--static">{cta}</span>
      )}
    </div>
  );
}

function IconSearch() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5z"/>
      <polyline points="9 21 9 12 15 12 15 21"/>
    </svg>
  );
}

function IconNeighborhood() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a7 7 0 017 7c0 4.97-6.22 12.18-6.7 12.76a.4.4 0 01-.6 0C11.22 21.18 5 13.97 5 9a7 7 0 017-7z"/>
      <circle cx="12" cy="9" r="2.5"/>
    </svg>
  );
}

function IconCity() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="22" x2="23" y2="22"/>
      <path d="M2 22V15l5-2v9"/><path d="M7 22V10l5-5v17"/>
      <path d="M12 22V13l5-3v12"/><path d="M17 22V17l4-2v7"/>
    </svg>
  );
}
