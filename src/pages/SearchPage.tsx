import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Search, Home, ArrowRight } from "lucide-react";
import { useParkRidgeContext } from "../contexts/ParkRidgeDataContext";
import { SearchBox } from "../components/search/SearchBox";
import { ROUTES } from "../lib/routes";
import { formatAddress, formatPin, formatYear } from "../lib/formatters";
import type { ParcelFeature } from "../lib/parcelTypes";
import "./SearchPage.css";

export function SearchPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { searchParcels, isLoading, parcelCount } = useParkRidgeContext();
  const initialQuery = params.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    setQuery(params.get("q") ?? "");
  }, [params]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return searchParcels(query);
  }, [query, searchParcels]);

  function handleSelect(parcel: ParcelFeature) {
    const pin = parcel.properties.pin_normalized || parcel.properties.pin_original;
    if (pin) navigate(ROUTES.property(pin));
  }

  return (
    <div className="page-container">
      <div className="page-hero">
        <span className="page-eyebrow">
          <Search size={12} strokeWidth={2.5} aria-hidden="true" />
          Property Search
        </span>
        <h1 className="page-title">Find a Property</h1>
        <p className="page-subtitle">
          Search {isLoading ? "…" : parcelCount.toLocaleString()} Park Ridge properties
          by address, street name, or PIN.
        </p>
      </div>

      <div className="search-page-input">
        <SearchBox placeholder="Address or PIN…" autoFocus onSelect={(pin) => navigate(ROUTES.property(pin))} />
      </div>

      {query && (
        <div className="search-page-results">
          <div className="section-header">
            <h2 className="section-title">
              {results.length === 0
                ? "No results"
                : `${results.length} result${results.length === 1 ? "" : "s"} for "${query}"`}
            </h2>
          </div>

          {results.length === 0 && !isLoading && (
            <div className="empty-state">
              <p>No properties found for "{query}".</p>
              <p style={{ fontSize: "0.80rem", marginTop: "8px", color: "rgba(255,255,255,0.30)" }}>
                Try a street name, partial address, or the first digits of a PIN.
              </p>
            </div>
          )}

          <div className="search-result-list">
            {results.map((parcel) => {
              const pin = parcel.properties.pin_normalized || parcel.properties.pin_original || "";
              return (
                <Link
                  key={pin}
                  to={ROUTES.property(pin)}
                  className="search-result-card"
                >
                  <div className="search-result-icon">
                    <Home size={16} strokeWidth={2} aria-hidden="true" />
                  </div>
                  <div className="search-result-body">
                    <strong className="search-result-address">
                      {formatAddress(parcel.properties.address)}
                    </strong>
                    <div className="search-result-meta-row">
                      <span>PIN {formatPin(pin)}</span>
                      {parcel.properties.year_built && (
                        <span>Built {formatYear(parcel.properties.year_built)}</span>
                      )}
                      {parcel.properties.permit_count != null && parcel.properties.permit_count > 0 && (
                        <span>{parcel.properties.permit_count} permit{parcel.properties.permit_count !== 1 ? "s" : ""}</span>
                      )}
                      {parcel.properties.sale_count != null && parcel.properties.sale_count > 0 && (
                        <span>{parcel.properties.sale_count} sale{parcel.properties.sale_count !== 1 ? "s" : ""}</span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="search-result-arrow" size={16} strokeWidth={2} aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {!query && (
        <div className="search-page-tips">
          <h3>Search tips</h3>
          <ul>
            <li>Enter a street name like "Prospect" to see all matching properties</li>
            <li>Enter a full address like "123 Main St" for an exact match</li>
            <li>Enter the first digits of a Cook County PIN (e.g., "0921")</li>
            <li>Formatted or unformatted PINs both work: 09-21-100-001-0000 or 09211000010000</li>
          </ul>
        </div>
      )}
    </div>
  );
}
