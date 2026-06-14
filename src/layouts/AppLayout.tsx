import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { primaryNav, referenceNav, ROUTES, propertyPath } from "../routes/routeConfig";
import { useParkRidgeContext } from "../contexts/ParkRidgeDataContext";

export function AppLayout() {
  return (
    <div className="page-shell">
      <TopNav />
      <main className="page-main">
        <Outlet />
      </main>
    </div>
  );
}

function TopNav() {
  const { parcels } = useParkRidgeContext();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ pin: string; address: string; yearBuilt?: number; permitCount?: number }>>([]);
  const [showResults, setShowResults] = useState(false);

  function handleSearch(q: string) {
    setSearchQuery(q);
    if (q.length < 2 || !parcels) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    const normalized = q.toLowerCase();
    const matches = parcels.features
      .filter((f) => {
        const addr = (f.properties.address ?? "").toLowerCase();
        const pin = (f.properties.pin_normalized ?? "").toLowerCase();
        return addr.includes(normalized) || pin.includes(normalized);
      })
      .slice(0, 6)
      .map((f) => ({
        pin: f.properties.pin_normalized ?? f.properties.pin_original ?? "",
        address: f.properties.address ?? "Unknown address",
        yearBuilt: f.properties.year_built ?? undefined,
        permitCount: f.properties.permit_count ?? undefined,
      }));
    setSearchResults(matches);
    setShowResults(matches.length > 0);
  }

  function selectResult(pin: string) {
    setSearchQuery("");
    setShowResults(false);
    navigate(propertyPath(pin));
  }

  return (
    <header className="top-nav" role="banner">
      <div className="top-nav-inner">
        {/* Brand */}
        <Link to="/" className="top-nav-brand" aria-label="Park Ridge Land History home">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5z" />
            <polyline points="9 21 9 12 15 12 15 21" />
          </svg>
          <span>Park Ridge</span>
        </Link>

        {/* Primary nav */}
        <nav className="top-nav-links" aria-label="Main navigation">
          {primaryNav.map((route) => (
            <NavLink
              key={route.path}
              to={route.path}
              className={({ isActive }) => `top-nav-link${isActive ? " is-active" : ""}${route.experimental ? " is-experimental" : ""}`}
            >
              {route.label}
              {route.experimental && <span className="nav-badge">Preview</span>}
            </NavLink>
          ))}
        </nav>

        {/* Inline search */}
        <div className="top-nav-search" role="search">
          <label htmlFor="top-nav-search-input" className="sr-only">Search an address</label>
          <div className="tns-input-wrap">
            <svg className="tns-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              id="top-nav-search-input"
              className="tns-input"
              type="search"
              placeholder="Search an address…"
              value={searchQuery}
              autoComplete="off"
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              onBlur={() => setTimeout(() => setShowResults(false), 180)}
              aria-expanded={showResults}
              aria-autocomplete="list"
              aria-controls="tns-results"
            />
          </div>
          {showResults && (
            <ul className="tns-results" id="tns-results" role="listbox">
              {searchResults.map((r) => (
                <li key={r.pin} role="option" aria-selected={false}>
                  <button
                    type="button"
                    className="tns-result-btn"
                    onMouseDown={() => selectResult(r.pin)}
                  >
                    <span className="tns-result-address">{r.address}</span>
                    <span className="tns-result-meta">
                      {r.yearBuilt ? `Built ${r.yearBuilt}` : "Year unknown"}
                      {r.permitCount ? ` · ${r.permitCount} permits` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Reference links + explore */}
        <div className="top-nav-right">
          {referenceNav.map((route) => (
            <NavLink
              key={route.path}
              to={route.path}
              className={({ isActive }) => `top-nav-link top-nav-link--quiet${isActive ? " is-active" : ""}`}
            >
              {route.label}
            </NavLink>
          ))}
          <NavLink
            to={ROUTES.explore.path}
            className={({ isActive }) => `top-nav-explore-btn${isActive ? " is-active" : ""}`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            Map Explorer
          </NavLink>
        </div>
      </div>
    </header>
  );
}
