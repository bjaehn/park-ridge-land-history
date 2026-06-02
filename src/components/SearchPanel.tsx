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
  const normalizedQuery = normalizeSearch(query);

  const results = useMemo(() => {
    if (!parcels || normalizedQuery.length < 2) return [];
    return parcels.features
      .filter((feature) => featureMatchesQuery(feature, normalizedQuery))
      .slice(0, 8);
  }, [normalizedQuery, parcels]);

  return (
    <section className="panel-section" aria-label="Parcel search">
      <div className="section-heading">
        <h2>Search</h2>
        {selectedPin && (
          <button className="text-button" type="button" onClick={onClearSelection}>
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
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      {normalizedQuery.length >= 2 && (
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
                onClick={() => onSelectParcel(feature)}
              >
                <span className="search-result-main">
                  {feature.properties.address || "Unknown address"}
                </span>
                <span className="search-result-meta">
                  {pin || "Unknown PIN"} · {formatYear(feature.properties.year_built)}
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

function featureMatchesQuery(feature: ParcelFeature, normalizedQuery: string): boolean {
  const address = normalizeSearch(feature.properties.address);
  const pin = normalizeSearch(feature.properties.pin_normalized);
  const originalPin = normalizeSearch(feature.properties.pin_original);
  return address.includes(normalizedQuery) || pin.includes(normalizedQuery) || originalPin.includes(normalizedQuery);
}

function normalizeSearch(value?: string | null): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}
