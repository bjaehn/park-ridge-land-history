import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Search, Menu, X } from "lucide-react";
import { ROUTES } from "../../lib/routes";
import { useParkRidgeContext } from "../../contexts/ParkRidgeDataContext";
import "./Header.css";

const navItems = [
  { label: "Discover", to: ROUTES.discover },
  { label: "Property Search", to: ROUTES.search },
  { label: "Streets & Blocks", to: ROUTES.blocks },
  { label: "Neighborhoods", to: ROUTES.neighborhoods },
  { label: "Citywide Trends", to: ROUTES.parkRidge },
  { label: "Historical Maps", to: ROUTES.maps },
  { label: "Data Sources", to: ROUTES.dataSources },
];

export function Header() {
  const navigate = useNavigate();
  const { searchParcels } = useParkRidgeContext();
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    const results = searchParcels(query);
    if (results.length === 1) {
      const pin = results[0].properties.pin_normalized || results[0].properties.pin_original;
      if (pin) {
        setQuery("");
        navigate(ROUTES.property(pin));
        return;
      }
    }
    navigate(`${ROUTES.search}?q=${encodeURIComponent(query.trim())}`);
    setQuery("");
  }

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <NavLink to={ROUTES.discover} className="site-logo" aria-label="Park Ridge Land History — Home">
          <span className="logo-mark">PR</span>
          <span className="logo-text">
            <strong>Park Ridge</strong>
            <em>Land History</em>
          </span>
        </NavLink>

        <nav className={`site-nav ${mobileOpen ? "is-open" : ""}`} aria-label="Primary navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === ROUTES.discover}
              className={({ isActive }) => `site-nav-link${isActive ? " is-active" : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <form className="header-search" onSubmit={handleSearch} role="search">
          <Search size={14} strokeWidth={2.5} aria-hidden="true" />
          <input
            type="search"
            placeholder="Address or PIN…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search by address or PIN"
          />
        </form>

        <button
          className="mobile-menu-toggle"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
    </header>
  );
}
