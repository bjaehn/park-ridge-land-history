import { useEffect, useMemo, useState } from "react";
import { FilterPanel } from "./components/FilterPanel";
import { LayerToggle } from "./components/LayerToggle";
import { Legend } from "./components/Legend";
import { MapView } from "./components/MapView";
import { SearchPanel } from "./components/SearchPanel";
import { TimelineControl } from "./components/TimelineControl";
import { decadeOrder } from "./lib/colorScales";
import type { ParcelCollection, ParcelFeature } from "./lib/parcelTypes";

const knownDecades = decadeOrder.filter((bucket) => bucket !== "Unknown" && bucket !== "Suspicious");

export default function App() {
  const [parcels, setParcels] = useState<ParcelCollection | null>(null);
  const [boundary, setBoundary] = useState<GeoJSON.FeatureCollection | null>(null);
  const [isSampleData, setIsSampleData] = useState(false);
  const [selectedDecades, setSelectedDecades] = useState<Set<string>>(() => new Set(knownDecades));
  const [showUnknown, setShowUnknown] = useState(true);
  const [showOutlines, setShowOutlines] = useState(true);
  const [showBoundary, setShowBoundary] = useState(true);
  const [maxBuiltYear, setMaxBuiltYear] = useState(2026);
  const [selectedPin, setSelectedPin] = useState<string | null>(null);

  useEffect(() => {
    async function loadParcels() {
      const enriched = await fetchJson<ParcelCollection>("/data/park_ridge_parcels_enriched.geojson");
      if (enriched) {
        setParcels(enriched);
        setIsSampleData(false);
        return;
      }

      const sample = await fetchJson<ParcelCollection>("/data/sample_parcels.geojson");
      setParcels(sample);
      setIsSampleData(true);
    }

    loadParcels();
    fetchJson<GeoJSON.FeatureCollection>("/data/park_ridge_boundary.geojson").then(setBoundary);
  }, []);

  const yearRange = useMemo(() => {
    const years = parcels?.features
      .map((feature) => feature.properties.year_built)
      .filter((year): year is number => typeof year === "number" && year >= 1800 && year <= 2026) ?? [];
    return {
      min: years.length ? Math.min(...years) : 1800,
      max: years.length ? Math.max(...years) : 2026
    };
  }, [parcels]);

  useEffect(() => {
    setMaxBuiltYear(yearRange.max);
  }, [yearRange.max]);

  const filteredParcels = useMemo<ParcelCollection | null>(() => {
    if (!parcels) return null;

    return {
      ...parcels,
      features: parcels.features.filter((feature) =>
        isFeatureVisible(feature, selectedDecades, showUnknown, maxBuiltYear)
      )
    };
  }, [maxBuiltYear, parcels, selectedDecades, showUnknown]);

  const visibleLegendBuckets = useMemo(() => {
    const buckets = new Set(selectedDecades);
    if (showUnknown) buckets.add("Unknown");
    return buckets;
  }, [selectedDecades, showUnknown]);

  const visiblePins = useMemo(() => {
    return new Set(
      filteredParcels?.features
        .map((feature) => feature.properties.pin_normalized || feature.properties.pin_original)
        .filter((pin): pin is string => Boolean(pin)) ?? []
    );
  }, [filteredParcels]);

  const selectedParcel = useMemo(() => {
    if (!parcels || !selectedPin) return null;
    return (
      parcels.features.find((feature) => {
        const pin = feature.properties.pin_normalized || feature.properties.pin_original;
        return pin === selectedPin;
      }) ?? null
    );
  }, [parcels, selectedPin]);

  function toggleDecade(decade: string) {
    setSelectedDecades((current) => {
      const next = new Set(current);
      if (next.has(decade)) next.delete(decade);
      else next.add(decade);
      return next;
    });
  }

  return (
    <main className="app-shell">
      <MapView
        parcels={filteredParcels}
        selectedParcel={selectedParcel}
        boundary={boundary}
        showOutlines={showOutlines}
        showBoundary={showBoundary}
      />
      <aside className="control-panel">
        <header className="app-header">
          <p>Local prototype</p>
          <h1>Park Ridge Land History</h1>
        </header>
        <FilterPanel
          parcels={parcels}
          filteredCount={filteredParcels?.features.length ?? 0}
          isSampleData={isSampleData}
        />
        <SearchPanel
          parcels={parcels}
          selectedPin={selectedPin}
          visiblePins={visiblePins}
          onSelectParcel={(feature) => {
            setSelectedPin(feature.properties.pin_normalized || feature.properties.pin_original || null);
          }}
          onClearSelection={() => setSelectedPin(null)}
        />
        <TimelineControl
          selectedDecades={selectedDecades}
          maxBuiltYear={maxBuiltYear}
          minAvailableYear={yearRange.min}
          maxAvailableYear={yearRange.max}
          showUnknown={showUnknown}
          onToggleDecade={toggleDecade}
          onSetMaxBuiltYear={setMaxBuiltYear}
          onSetShowUnknown={setShowUnknown}
          onSelectAll={() => setSelectedDecades(new Set(knownDecades))}
          onClearKnown={() => setSelectedDecades(new Set())}
        />
        <LayerToggle
          showOutlines={showOutlines}
          showBoundary={showBoundary}
          onSetShowOutlines={setShowOutlines}
          onSetShowBoundary={setShowBoundary}
        />
        <Legend visibleDecades={visibleLegendBuckets} />
      </aside>
    </main>
  );
}

function isFeatureVisible(
  feature: ParcelFeature,
  selectedDecades: Set<string>,
  showUnknown: boolean,
  maxBuiltYear: number
): boolean {
  const year = feature.properties.year_built;
  const decade = feature.properties.decade_built || "Unknown";
  const hasKnownYear = typeof year === "number";

  if (!hasKnownYear || decade === "Unknown") return showUnknown;
  if (year > maxBuiltYear) return false;
  return selectedDecades.has(String(decade));
}

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(path);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
