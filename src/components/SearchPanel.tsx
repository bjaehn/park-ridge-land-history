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

export function SearchPanel({
  parcels,
  selectedPin,
  visiblePins,
  onSelectParcel,
  onClearSelection
}: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [resultsOpen, setResultsOpen] = useState(false);
  const normalizedQuery = normalizeSearch(query);
  const hasAddressData = Boolean(parcels?.features.some((feature) => feature.properties.address));

  const results = useMemo(() => {
    if (!parcels || normalizedQuery.length < 2) return [];
    return parcels.features
      .filter((feature) => featureMatchesQuery(feature, query, normalizedQuery))
      .slice(0, 8);
  }, [normalizedQuery, parcels, query]);

  function clearSelection() {
    setQuery("");
    setResultsOpen(false);
    onClearSelection();
  }

  return (
    <section className="panel-section" aria-label="Parcel search">
      <div className="section-heading">
        <h2>Search</h2>
        {selectedPin && (
          <button className="text-button" type="button" onClick={clearSelection}>
            Clear
          </button>
        )}
      </div>
      <label className="search-control">
        <span>Address or PIN</span>
        <input
          type="search"
          value={query}
          placeholder="Try 115 Vine or 092510..."
          onChange={(event) => {
            setQuery(event.target.value);
            setResultsOpen(true);
          }}
          onFocus={() => {
            if (normalizedQuery.length >= 2) setResultsOpen(true);
          }}
        />
      </label>
      {!hasAddressData && parcels && (
        <p className="quiet-note search-hint">Address data is unavailable; search by PIN.</p>
      )}

      {resultsOpen && normalizedQuery.length >= 2 && (
        <div className="search-results" role="list">
          {results.length === 0 && <p className="quiet-note search-empty">No matching parcels</p>}
          {results.map((feature) => {
            const pin = feature.properties.pin_normalized || feature.properties.pin_original || "";
            const isSelected = pin === selectedPin;
            const isVisible = pin ? visiblePins.has(pin) : false;
            return (
              <button
                className={`search-result ${isSelected ? "is-selected" : ""}`}
                type="button"
                key={`${pin}-${feature.properties.address ?? "parcel"}`}
                onClick={() => {
                  onSelectParcel(feature);
                  setQuery(feature.properties.address || pin);
                  setResultsOpen(false);
                }}
              >
                <span className="search-result-main">
                  {feature.properties.address || "Unknown address"}
                </span>
                <span className="search-result-meta">
                  {pin || "Unknown PIN"} - {formatYear(feature.properties.year_built)}
                </span>
                {!isVisible && <span className="search-result-note">Hidden by filters</span>}
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
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
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
  return String(value ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}
