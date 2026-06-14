import { useMemo, useState } from "react";
import { formatYear } from "../lib/formatters";
import type { ParcelCollection, ParcelFeature } from "../lib/parcelTypes";

type SearchPanelProps = {
  parcels: ParcelCollection | null;
  selectedPin: string | null;
  visiblePins: Set<string>;
  onSelectParcel: (feature: ParcelFeature) => void;
  onClearSelection: () => void;
};

const examples = ["115 Vine", "1623 Western", "120 Prospect"];

export function SearchPanel({
  parcels,
  selectedPin,
  visiblePins,
  onSelectParcel,
  onClearSelection
}: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const normalizedQuery = normalizeSearch(query);

  const results = useMemo(() => {
    if (!parcels || normalizedQuery.length < 2) return [];
    return parcels.features
      .filter((feature) => featureMatchesQuery(feature, query, normalizedQuery))
      .slice(0, 8);
  }, [normalizedQuery, parcels, query]);

  const showResults = isFocused && normalizedQuery.length >= 2;
  const showExamples = isFocused && normalizedQuery.length < 2 && !selectedPin;

  function clearSelection() {
    setQuery("");
    onClearSelection();
  }

  return (
    <section className="search-section" aria-label="Property search">
      <div className={`search-input-wrap${isFocused ? " is-focused" : ""}`}>
        <span className="search-icon" aria-hidden="true">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          className="search-input"
          type="search"
          value={query}
          placeholder="Search address or PIN…"
          autoComplete="off"
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 180)}
        />
        {(query || selectedPin) && (
          <button
            className="search-clear"
            type="button"
            aria-label="Clear search"
            onClick={clearSelection}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {showExamples && (
        <div className="search-examples" aria-label="Example searches">
          <span className="search-examples-label">Try an address</span>
          <div className="search-example-pills">
            {examples.map((example) => (
              <button
                key={example}
                className="search-example-pill"
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setQuery(example);
                }}
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}

      {showResults && (
        <div className="search-results" role="list">
          {results.length === 0 && (
            <div className="search-empty-state">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span>No matching properties found</span>
            </div>
          )}
          {results.map((feature) => {
            const pin = feature.properties.pin_normalized || feature.properties.pin_original || "";
            const isSelected = pin === selectedPin;
            const isVisible = pin ? visiblePins.has(pin) : false;
            const year = feature.properties.year_built;
            return (
              <button
                className={`search-result${isSelected ? " is-selected" : ""}`}
                type="button"
                key={`${pin}-${feature.properties.address ?? "parcel"}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelectParcel(feature);
                  setQuery(feature.properties.address || pin);
                  setIsFocused(false);
                }}
              >
                <span className="search-result-icon" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5z" />
                    <polyline points="9 21 9 12 15 12 15 21" />
                  </svg>
                </span>
                <span className="search-result-body">
                  <span className="search-result-address">{feature.properties.address || pin || "—"}</span>
                  <span className="search-result-sub">
                    {pin || "—"}
                    {year ? <span className="search-result-year">{year}</span> : null}
                    {!isVisible && <span className="search-result-hidden">Hidden by filter</span>}
                  </span>
                </span>
                {isSelected && (
                  <span className="search-result-check" aria-label="Selected">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function featureMatchesQuery(feature: ParcelFeature, query: string, normalizedQuery: string): boolean {
  const address = normalizeSearch(feature.properties.address);
  const pin = normalizeSearch(feature.properties.pin_normalized);
  const originalPin = normalizeSearch(feature.properties.pin_original);
  return (
    address.includes(normalizedQuery)
    || addressMatchesTokens(feature.properties.address, query)
    || pin.includes(normalizedQuery)
    || originalPin.includes(normalizedQuery)
  );
}

function normalizeSearch(value?: string | null): string {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function addressMatchesTokens(address: string | null | undefined, query: string): boolean {
  const queryTokens = searchTokens(query);
  if (queryTokens.length === 0) return false;
  const addressTokens = searchTokens(address);
  return queryTokens.every((queryToken) =>
    addressTokens.some((addressToken) => addressToken.startsWith(queryToken))
  );
}

function searchTokens(value?: string | null): string[] {
  return String(value ?? "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}
