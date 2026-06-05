import { useEffect, useMemo, useState } from "react";
import { AnalysisTabs, type AnalysisScale } from "./components/AnalysisTabs";
import { AccordionSection } from "./components/AccordionSection";
import { FilterPanel } from "./components/FilterPanel";
import { LayerToggle } from "./components/LayerToggle";
import { Legend } from "./components/Legend";
import { MapView } from "./components/MapView";
import { DecadeDistributionChart } from "./components/DecadeDistributionChart";
import { HistoricalLayerPanel } from "./components/HistoricalLayerPanel";
import { HotspotPanel } from "./components/HotspotPanel";
import { ParcelDetailPanel } from "./components/ParcelDetailPanel";
import { SearchPanel } from "./components/SearchPanel";
import { TimelineControl } from "./components/TimelineControl";
import { VisualizationPanel, type VisualizationPreset } from "./components/VisualizationPanel";
import { decadeOrder } from "./lib/colorScales";
import { loadHistoricalLayerData, loadHistoricalLayerManifest } from "./lib/layerLoaders";
import { layerCanToggle, type HistoricalLayer, type LoadedHistoricalLayer } from "./lib/historicalLayerTypes";
import { buildHotspots, type HotspotCollection, type HotspotFeature } from "./lib/hotspots";
import {
  parcelChangeFilterOrder,
  parcelChangeLayerId,
  type ParcelChangeFeature,
  type ParcelChangeType
} from "./lib/parcelChangeTypes";
import {
  decoratePermitPressure,
  permitPressureLegendOrder,
  permitStabilityLegendOrder,
  type PermitPressureMapMode,
  type PermitPressureWindow
} from "./lib/permitPressure";
import type { ParcelCollection, ParcelFeature, PermitPressureType, PermitStabilityType } from "./lib/parcelTypes";

const knownDecades = decadeOrder.filter((bucket) => bucket !== "Unknown" && bucket !== "Suspicious");
const animationIntervals = {
  slow: 420,
  normal: 220,
  fast: 90
} as const;

type AnimationSpeed = keyof typeof animationIntervals;

const emptyHotspots: HotspotCollection = {
  type: "FeatureCollection",
  features: []
};

export default function App() {
  const [parcels, setParcels] = useState<ParcelCollection | null>(null);
  const [boundary, setBoundary] = useState<GeoJSON.FeatureCollection | null>(null);
  const [isSampleData, setIsSampleData] = useState(false);
  const [selectedDecades, setSelectedDecades] = useState<Set<string>>(() => new Set(knownDecades));
  const [showUnknown, setShowUnknown] = useState(true);
  const [showOutlines, setShowOutlines] = useState(true);
  const [showBoundary, setShowBoundary] = useState(true);
  const [showPermitPressure, setShowPermitPressure] = useState(true);
  const [showHotspots, setShowHotspots] = useState(false);
  const [permitPressureWindow, setPermitPressureWindow] = useState<PermitPressureWindow>(5);
  const [permitPressureMapMode, setPermitPressureMapMode] = useState<PermitPressureMapMode>("stability");
  const [visiblePermitPressureTypes, setVisiblePermitPressureTypes] = useState<Set<PermitPressureType>>(
    () => new Set(permitPressureLegendOrder)
  );
  const [visiblePermitStabilityTypes, setVisiblePermitStabilityTypes] = useState<Set<PermitStabilityType>>(
    () => new Set(permitStabilityLegendOrder)
  );
  const [maxBuiltYear, setMaxBuiltYear] = useState(2026);
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [isBuildoutPlaying, setIsBuildoutPlaying] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState<AnimationSpeed>("normal");
  const [historicalLayers, setHistoricalLayers] = useState<HistoricalLayer[]>([]);
  const [activeHistoricalLayerIds, setActiveHistoricalLayerIds] = useState<Set<string>>(() => new Set());
  const [loadedHistoricalLayers, setLoadedHistoricalLayers] = useState<Record<string, LoadedHistoricalLayer>>({});
  const [selectedParcelChange, setSelectedParcelChange] = useState<ParcelChangeFeature | null>(null);
  const [visibleChangeTypes, setVisibleChangeTypes] = useState<Set<ParcelChangeType>>(
    () => new Set(parcelChangeFilterOrder)
  );
  const [compareLayerIds, setCompareLayerIds] = useState<[string | null, string | null]>([
    "cook_parcels_2000",
    "cook_parcels_2021"
  ]);
  const [swipeEnabled, setSwipeEnabled] = useState(false);
  const [swipePosition, setSwipePosition] = useState(50);
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotFeature | null>(null);
  const [activeAnalysisScale, setActiveAnalysisScale] = useState<AnalysisScale>("home");

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
    loadHistoricalLayerManifest().then(setHistoricalLayers);
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
    setIsBuildoutPlaying(false);
  }, [yearRange.max]);

  useEffect(() => {
    if (!isBuildoutPlaying) return;

    const intervalId = window.setInterval(() => {
      setMaxBuiltYear((currentYear) => {
        if (currentYear >= yearRange.max) {
          setIsBuildoutPlaying(false);
          return yearRange.max;
        }
        return currentYear + 1;
      });
    }, animationIntervals[animationSpeed]);

    return () => window.clearInterval(intervalId);
  }, [animationSpeed, isBuildoutPlaying, yearRange.max]);

  const filteredParcels = useMemo<ParcelCollection | null>(() => {
    if (!parcels) return null;

    return {
      ...parcels,
      features: parcels.features.filter((feature) =>
        isFeatureVisible(feature, selectedDecades, showUnknown, maxBuiltYear)
      )
    };
  }, [maxBuiltYear, parcels, selectedDecades, showUnknown]);

  const pressureDecoratedFilteredParcels = useMemo(
    () => decoratePermitPressure(filteredParcels, permitPressureWindow),
    [filteredParcels, permitPressureWindow]
  );

  const pressureDecoratedParcels = useMemo(
    () => decoratePermitPressure(parcels, permitPressureWindow),
    [parcels, permitPressureWindow]
  );

  const hotspots = useMemo(
    () => buildHotspots(pressureDecoratedFilteredParcels),
    [pressureDecoratedFilteredParcels]
  );

  const mapHotspots = showHotspots ? hotspots : emptyHotspots;

  useEffect(() => {
    if (!showHotspots) setSelectedHotspot(null);
  }, [showHotspots]);

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

  const buildoutStats = useMemo(() => {
    const knownYears = parcels?.features
      .map((feature) => feature.properties.year_built)
      .filter((year): year is number => typeof year === "number" && year >= 1800 && year <= yearRange.max) ?? [];
    const builtByYear = knownYears.filter((year) => year <= maxBuiltYear).length;
    return {
      builtByYear,
      knownYearTotal: knownYears.length,
      percentBuilt: knownYears.length ? Math.round((builtByYear / knownYears.length) * 100) : 0
    };
  }, [maxBuiltYear, parcels, yearRange.max]);

  const activeVisualizationPreset = useMemo<VisualizationPreset>(() => {
    if (isBuildoutPlaying || maxBuiltYear < yearRange.max) return "buildout";
    if (!showPermitPressure) return "age";
    return permitPressureMapMode === "activity" ? "activity" : "stability";
  }, [isBuildoutPlaying, maxBuiltYear, permitPressureMapMode, showPermitPressure, yearRange.max]);

  const selectedParcel = useMemo(() => {
    if (!pressureDecoratedParcels || !selectedPin) return null;
    return (
      pressureDecoratedParcels.features.find((feature) => {
        const pin = feature.properties.pin_normalized || feature.properties.pin_original;
        return pin === selectedPin;
      }) ?? null
    );
  }, [pressureDecoratedParcels, selectedPin]);

  const historicalOverlays = useMemo(() => {
    return Array.from(activeHistoricalLayerIds)
      .map((layerId) => loadedHistoricalLayers[layerId])
      .filter((loadedLayer): loadedLayer is LoadedHistoricalLayer => Boolean(loadedLayer));
  }, [activeHistoricalLayerIds, loadedHistoricalLayers]);

  function toggleDecade(decade: string) {
    if (decade === "Unknown") {
      setShowUnknown((current) => !current);
      return;
    }

    setSelectedDecades((current) => {
      const next = new Set(current);
      if (next.has(decade)) next.delete(decade);
      else next.add(decade);
      return next;
    });
  }

  function togglePermitPressureType(pressureType: PermitPressureType) {
    setVisiblePermitPressureTypes((current) => {
      const next = new Set(current);
      if (next.has(pressureType)) next.delete(pressureType);
      else next.add(pressureType);
      return next;
    });
  }

  function togglePermitStabilityType(stabilityType: PermitStabilityType) {
    setVisiblePermitStabilityTypes((current) => {
      const next = new Set(current);
      if (next.has(stabilityType)) next.delete(stabilityType);
      else next.add(stabilityType);
      return next;
    });
  }

  function handleSetMaxBuiltYear(year: number) {
    setIsBuildoutPlaying(false);
    setMaxBuiltYear(year);
  }

  function toggleBuildoutPlayback() {
    setIsBuildoutPlaying((current) => {
      if (current) return false;
      if (maxBuiltYear >= yearRange.max) {
        setMaxBuiltYear(yearRange.min);
      }
      return true;
    });
  }

  function selectParcel(feature: ParcelFeature) {
    setSelectedPin(feature.properties.pin_normalized || feature.properties.pin_original || null);
    setActiveAnalysisScale("home");
  }

  function selectHotspot(hotspot: HotspotFeature) {
    setSelectedHotspot(hotspot);
    setActiveAnalysisScale("cluster");
  }

  function toggleChangeType(changeType: ParcelChangeType) {
    setVisibleChangeTypes((current) => {
      const next = new Set(current);
      if (next.has(changeType)) next.delete(changeType);
      else next.add(changeType);
      return next;
    });
  }

  async function ensureHistoricalLayerLoaded(layer: HistoricalLayer) {
    if (!layerCanToggle(layer)) return;
    if (loadedHistoricalLayers[layer.id]?.data || loadedHistoricalLayers[layer.id]?.layer.tileUrl) return;

    setLoadedHistoricalLayers((current) => ({
      ...current,
      [layer.id]: {
        layer,
        opacity: current[layer.id]?.opacity ?? layer.opacityDefault ?? 0.75
      }
    }));

    const data = await loadHistoricalLayerData(layer);
    setLoadedHistoricalLayers((current) => ({
      ...current,
      [layer.id]: {
        layer,
        data: data ?? undefined,
        opacity: current[layer.id]?.opacity ?? layer.opacityDefault ?? 0.75,
        loadError: data || layer.tileUrl ? undefined : "Layer data could not be loaded."
      }
    }));
  }

  function toggleHistoricalLayer(layer: HistoricalLayer) {
    if (!layerCanToggle(layer)) return;
    setActiveHistoricalLayerIds((current) => {
      const next = new Set(current);
      if (next.has(layer.id)) next.delete(layer.id);
      else next.add(layer.id);
      return next;
    });
    void ensureHistoricalLayerLoaded(layer);
  }

  function setHistoricalLayerOpacity(layerId: string, opacity: number) {
    const layer = historicalLayers.find((candidate) => candidate.id === layerId);
    if (!layer) return;
    setLoadedHistoricalLayers((current) => ({
      ...current,
      [layerId]: {
        layer,
        data: current[layerId]?.data,
        opacity,
        loadError: current[layerId]?.loadError
      }
    }));
  }

  function handleSetCompareLayerIds(layerIds: [string | null, string | null]) {
    setCompareLayerIds(layerIds);
    const selectedIds = layerIds.filter((layerId): layerId is string => Boolean(layerId));
    const selectedLayers = selectedIds
      .map((layerId) => historicalLayers.find((layer) => layer.id === layerId))
      .filter((layer): layer is HistoricalLayer => Boolean(layer))
      .filter(layerCanToggle);

    setActiveHistoricalLayerIds((current) => {
      const next = new Set(current);
      selectedLayers.forEach((layer) => next.add(layer.id));
      return next;
    });
    selectedLayers.forEach((layer) => void ensureHistoricalLayerLoaded(layer));
  }

  function setComparisonSwipeEnabled(enabled: boolean) {
    setSwipeEnabled(enabled);
    if (!enabled) return;
    const selectedLayers = compareLayerIds
      .filter((layerId): layerId is string => Boolean(layerId))
      .map((layerId) => historicalLayers.find((layer) => layer.id === layerId))
      .filter((layer): layer is HistoricalLayer => Boolean(layer))
      .filter(layerCanToggle);

    setActiveHistoricalLayerIds((current) => {
      const next = new Set(current);
      selectedLayers.forEach((layer) => next.add(layer.id));
      return next;
    });
    selectedLayers.forEach((layer) => void ensureHistoricalLayerLoaded(layer));
  }

  function selectVisualizationPreset(preset: VisualizationPreset) {
    setIsBuildoutPlaying(false);
    if (preset !== "buildout") setMaxBuiltYear(yearRange.max);

    if (preset === "stability") {
      setShowPermitPressure(true);
      setPermitPressureMapMode("stability");
      return;
    }

    if (preset === "activity") {
      setShowPermitPressure(true);
      setPermitPressureMapMode("activity");
      return;
    }

    if (preset === "buildout") {
      setShowPermitPressure(false);
      setMaxBuiltYear(yearRange.min);
      setIsBuildoutPlaying(true);
      return;
    }

    setShowPermitPressure(false);
  }

  return (
    <main className="app-shell">
      <MapView
        parcels={pressureDecoratedFilteredParcels}
        selectedParcel={selectedParcel}
        boundary={boundary}
        showOutlines={showOutlines}
        showBoundary={showBoundary}
        showPermitPressure={showPermitPressure}
        permitPressureMapMode={permitPressureMapMode}
        visiblePermitPressureTypes={visiblePermitPressureTypes}
        visiblePermitStabilityTypes={visiblePermitStabilityTypes}
        historicalOverlays={historicalOverlays}
        swipeEnabled={swipeEnabled}
        swipePosition={swipePosition}
        hotspots={mapHotspots}
        selectedHotspot={showHotspots ? selectedHotspot : null}
        selectedParcelChange={selectedParcelChange}
        visibleChangeTypes={visibleChangeTypes}
        onSelectParcel={selectParcel}
        onSelectParcelChange={setSelectedParcelChange}
        onSelectHotspot={selectHotspot}
      />
      <div className="map-legend-overlay">
        <Legend
          visibleDecades={visibleLegendBuckets}
          showParcelChangeLegend={activeHistoricalLayerIds.has(parcelChangeLayerId)}
          visibleChangeTypes={visibleChangeTypes}
          showPermitPressureLegend={showPermitPressure}
          permitPressureMapMode={permitPressureMapMode}
          visiblePermitPressureTypes={visiblePermitPressureTypes}
          visiblePermitStabilityTypes={visiblePermitStabilityTypes}
          onToggleDecade={toggleDecade}
          onToggleChangeType={toggleChangeType}
          onTogglePermitPressureType={togglePermitPressureType}
          onTogglePermitStabilityType={togglePermitStabilityType}
          compact
        />
      </div>
      <aside className="control-panel">
        <header className="app-header">
          <p>Work in progress</p>
          <h1>Park Ridge Land History</h1>
        </header>
        <AnalysisTabs activeScale={activeAnalysisScale} onSetScale={setActiveAnalysisScale} />

        <div className="analysis-tab-panel" role="tabpanel">
          {activeAnalysisScale === "home" && (
            <>
              <SearchPanel
                parcels={parcels}
                selectedPin={selectedPin}
                visiblePins={visiblePins}
                onSelectParcel={selectParcel}
                onClearSelection={() => setSelectedPin(null)}
              />
              <ParcelDetailPanel
                parcel={selectedParcel}
                parcels={pressureDecoratedParcels}
                permitPressureWindow={permitPressureWindow}
                onClearSelection={() => setSelectedPin(null)}
              />
            </>
          )}

          {activeAnalysisScale === "cluster" && (
            <HotspotPanel
              hotspots={hotspots}
              enabled={showHotspots}
              onSetEnabled={(enabled) => {
                setShowHotspots(enabled);
                if (enabled) setActiveAnalysisScale("cluster");
              }}
              selectedHotspotId={selectedHotspot?.properties.id ?? null}
              onSelectHotspot={selectHotspot}
            />
          )}

          {activeAnalysisScale === "city" && (
            <>
              <VisualizationPanel
                activePreset={activeVisualizationPreset}
                onSelectPreset={selectVisualizationPreset}
              />
              <TimelineControl
                selectedDecades={selectedDecades}
                maxBuiltYear={maxBuiltYear}
                minAvailableYear={yearRange.min}
                maxAvailableYear={yearRange.max}
                isBuildoutPlaying={isBuildoutPlaying}
                animationSpeed={animationSpeed}
                builtByYearCount={buildoutStats.builtByYear}
                knownYearTotal={buildoutStats.knownYearTotal}
                percentBuilt={buildoutStats.percentBuilt}
                showUnknown={showUnknown}
                onToggleDecade={toggleDecade}
                onSetMaxBuiltYear={handleSetMaxBuiltYear}
                onToggleBuildoutPlayback={toggleBuildoutPlayback}
                onResetBuildout={() => {
                  setIsBuildoutPlaying(false);
                  setMaxBuiltYear(yearRange.min);
                }}
                onSetAnimationSpeed={setAnimationSpeed}
                onSetShowUnknown={setShowUnknown}
                onSelectAll={() => setSelectedDecades(new Set(knownDecades))}
                onClearKnown={() => setSelectedDecades(new Set())}
              />
              <FilterPanel
                parcels={parcels}
                filteredCount={filteredParcels?.features.length ?? 0}
                isSampleData={isSampleData}
              />
              <DecadeDistributionChart parcels={filteredParcels} />
            </>
          )}
        </div>

        <AccordionSection title="Map Layers" summary="Boundaries and permit layer">
          <LayerToggle
            showOutlines={showOutlines}
            showBoundary={showBoundary}
            showPermitPressure={showPermitPressure}
            permitPressureWindow={permitPressureWindow}
            permitPressureMapMode={permitPressureMapMode}
            onSetShowOutlines={setShowOutlines}
            onSetShowBoundary={setShowBoundary}
            onSetShowPermitPressure={setShowPermitPressure}
            onSetPermitPressureWindow={setPermitPressureWindow}
            onSetPermitPressureMapMode={setPermitPressureMapMode}
          />
        </AccordionSection>

        <AccordionSection title="Data Layers" summary="Optional evidence overlays" defaultOpen>
          <HistoricalLayerPanel
            layers={historicalLayers}
            activeLayerIds={activeHistoricalLayerIds}
            loadedLayers={loadedHistoricalLayers}
            compareLayerIds={compareLayerIds}
            swipeEnabled={swipeEnabled}
            swipePosition={swipePosition}
            selectedParcelChange={selectedParcelChange}
            visibleChangeTypes={visibleChangeTypes}
            onToggleLayer={toggleHistoricalLayer}
            onSetOpacity={setHistoricalLayerOpacity}
            onSetCompareLayerIds={handleSetCompareLayerIds}
            onSetSwipeEnabled={setComparisonSwipeEnabled}
            onSetSwipePosition={setSwipePosition}
            onClearParcelChangeSelection={() => setSelectedParcelChange(null)}
            onToggleChangeType={toggleChangeType}
            onSelectAllChangeTypes={() => setVisibleChangeTypes(new Set(parcelChangeFilterOrder))}
            onShowChangedOnly={() => {
              setVisibleChangeTypes(new Set(parcelChangeFilterOrder.filter((changeType) => changeType !== "unchanged")));
            }}
          />
        </AccordionSection>

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
