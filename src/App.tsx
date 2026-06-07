import { useEffect, useMemo, useState } from "react";
import { AnalysisNarrative } from "./components/AnalysisNarrative";
import { AnalysisTabs, type AnalysisScale } from "./components/AnalysisTabs";
import { BlockPanel, type BlockView } from "./components/BlockPanel";
import { BuildoutMilestonesTable } from "./components/BuildoutMilestonesTable";
import { LayerToggle } from "./components/LayerToggle";
import { Legend } from "./components/Legend";
import { MapView } from "./components/MapView";
import { DecadeComparisonTable } from "./components/DecadeComparisonTable";
import { DecadeDistributionChart } from "./components/DecadeDistributionChart";
import { NeighborhoodComparisonTable } from "./components/NeighborhoodComparisonTable";
import { HistoricalLayerPanel } from "./components/HistoricalLayerPanel";
import { HotspotPanel } from "./components/HotspotPanel";
import { ParcelDetailPanel } from "./components/ParcelDetailPanel";
import { PermitWorkComparisonTable } from "./components/PermitWorkComparisonTable";
import { ProductEvidencePanel } from "./components/ProductEvidencePanel";
import { SearchPanel } from "./components/SearchPanel";
import { TimelineControl } from "./components/TimelineControl";
import { VisualizationPanel, type VisualizationPreset } from "./components/VisualizationPanel";
import { decadeOrder } from "./lib/colorScales";
import { buildPhysicalBlock, parcelCollectionFromFeatures } from "./lib/physicalBlock";
import { loadHistoricalLayerData, loadHistoricalLayerManifest } from "./lib/layerLoaders";
import { layerCanToggle, type HistoricalLayer, type LoadedHistoricalLayer } from "./lib/historicalLayerTypes";
import {
  buildAreaSummaries,
  type AreaGroupingId,
  type AreaSummaryCollection,
  type AreaSummaryFeature,
  type WardBoundaryCollection
} from "./lib/areaGroups";
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

const emptyAreas: AreaSummaryCollection = {
  type: "FeatureCollection",
  features: []
};

export default function App() {
  const [parcels, setParcels] = useState<ParcelCollection | null>(null);
  const [boundary, setBoundary] = useState<GeoJSON.FeatureCollection | null>(null);
  const [wardBoundaries, setWardBoundaries] = useState<WardBoundaryCollection | null>(null);
  const [selectedDecades, setSelectedDecades] = useState<Set<string>>(() => new Set(knownDecades));
  const [showUnknown, setShowUnknown] = useState(true);
  const [showOutlines, setShowOutlines] = useState(true);
  const [showBoundary, setShowBoundary] = useState(true);
  const [showPermitPressure, setShowPermitPressure] = useState(true);
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
  const [blockMaxBuiltYear, setBlockMaxBuiltYear] = useState(2026);
  const [isBlockBuildoutPlaying, setIsBlockBuildoutPlaying] = useState(false);
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
  const [activeBlockView, setActiveBlockView] = useState<BlockView>("age");
  const [activeAreaGrouping, setActiveAreaGrouping] = useState<AreaGroupingId>("neighborhoods");
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);

  useEffect(() => {
    async function loadParcels() {
      const enriched = await fetchJson<ParcelCollection>("/data/park_ridge_parcels_enriched.geojson");
      setParcels(enriched);
    }

    loadParcels();
    fetchJson<GeoJSON.FeatureCollection>("/data/park_ridge_boundary.geojson").then(setBoundary);
    fetchJson<WardBoundaryCollection>("/data/park_ridge_wards.geojson").then(setWardBoundaries);
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

  const areaSummaries = useMemo(
    () =>
      activeAnalysisScale === "area"
        ? buildAreaSummaries(pressureDecoratedFilteredParcels, activeAreaGrouping, hotspots, wardBoundaries)
        : emptyAreas,
    [activeAnalysisScale, activeAreaGrouping, hotspots, pressureDecoratedFilteredParcels, wardBoundaries]
  );

  const cityNeighborhoodSummaries = useMemo(
    () => buildAreaSummaries(pressureDecoratedParcels, "neighborhoods", emptyHotspots),
    [pressureDecoratedParcels]
  );

  const selectedArea = useMemo(
    () => areaSummaries.features.find((area) => area.properties.id === selectedAreaId) ?? null,
    [areaSummaries, selectedAreaId]
  );

  const mapHotspots = activeAnalysisScale === "area" && activeAreaGrouping === "change_zones" ? hotspots : emptyHotspots;
  const mapAreaSummaries =
    activeAnalysisScale === "area" && activeAreaGrouping !== "change_zones" ? areaSummaries : emptyAreas;

  useEffect(() => {
    if (activeAnalysisScale !== "area") {
      setSelectedHotspot(null);
      setSelectedAreaId(null);
    }
  }, [activeAnalysisScale]);

  useEffect(() => {
    setSelectedHotspot(null);
    setSelectedAreaId(null);
  }, [activeAreaGrouping]);

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

  const selectedPhysicalBlock = useMemo(
    () => (selectedParcel ? buildPhysicalBlock(selectedParcel, pressureDecoratedParcels) : null),
    [pressureDecoratedParcels, selectedParcel]
  );

  const selectedBlockParcels = useMemo(() => {
    if (activeAnalysisScale !== "block" || !selectedPhysicalBlock) return null;
    return parcelCollectionFromFeatures(selectedPhysicalBlock.allParcels);
  }, [activeAnalysisScale, selectedPhysicalBlock]);

  const blockYearRange = useMemo(() => {
    return yearRangeForFeatures(selectedBlockParcels?.features ?? [], yearRange);
  }, [selectedBlockParcels, yearRange]);

  useEffect(() => {
    setBlockMaxBuiltYear(blockYearRange.max);
    setIsBlockBuildoutPlaying(false);
  }, [blockYearRange.max, selectedPin]);

  useEffect(() => {
    if (!isBlockBuildoutPlaying) return;

    const intervalId = window.setInterval(() => {
      setBlockMaxBuiltYear((currentYear) => {
        if (currentYear >= blockYearRange.max) {
          setIsBlockBuildoutPlaying(false);
          return blockYearRange.max;
        }
        return currentYear + 1;
      });
    }, animationIntervals[animationSpeed]);

    return () => window.clearInterval(intervalId);
  }, [animationSpeed, blockYearRange.max, isBlockBuildoutPlaying]);

  const selectedBlockFilteredParcels = useMemo(() => {
    if (!selectedBlockParcels) return null;
    const yearLimit = activeBlockView === "buildout" ? blockMaxBuiltYear : blockYearRange.max;
    return {
      ...selectedBlockParcels,
      features: selectedBlockParcels.features.filter((feature) =>
        isFeatureVisible(feature, selectedDecades, showUnknown, yearLimit)
      )
    };
  }, [activeBlockView, blockMaxBuiltYear, blockYearRange.max, selectedBlockParcels, selectedDecades, showUnknown]);

  const mapParcels = activeAnalysisScale === "block" && selectedBlockFilteredParcels
    ? selectedBlockFilteredParcels
    : pressureDecoratedFilteredParcels;

  const blockBuildoutStats = useMemo(() => {
    const knownYears = selectedBlockParcels?.features
      .map((feature) => feature.properties.year_built)
      .filter((year): year is number => typeof year === "number" && year >= 1800 && year <= blockYearRange.max) ?? [];
    const builtByYear = knownYears.filter((year) => year <= blockMaxBuiltYear).length;
    return {
      builtByYear,
      knownYearTotal: knownYears.length,
      percentBuilt: knownYears.length ? Math.round((builtByYear / knownYears.length) * 100) : 0,
      totalCount: selectedBlockParcels?.features.length ?? 0
    };
  }, [blockMaxBuiltYear, blockYearRange.max, selectedBlockParcels]);

  const activeMapPreset: VisualizationPreset = activeAnalysisScale === "block" ? activeBlockView : activeVisualizationPreset;
  const mapPermitPressureMode =
    activeAnalysisScale === "block"
      ? activeBlockView === "activity" ? "activity" : "stability"
      : permitPressureMapMode;
  const mapShowPermitPressure =
    activeAnalysisScale === "block"
      ? activeBlockView === "stability" || activeBlockView === "activity"
      : showPermitPressure;

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

  function selectBlockView(view: BlockView) {
    setActiveBlockView(view);
    setIsBlockBuildoutPlaying(false);
    if (view === "buildout") {
      setBlockMaxBuiltYear(blockYearRange.min);
      setIsBlockBuildoutPlaying(true);
      return;
    }
    setBlockMaxBuiltYear(blockYearRange.max);
  }

  function handleSetBlockMaxBuiltYear(year: number) {
    setIsBlockBuildoutPlaying(false);
    setBlockMaxBuiltYear(year);
  }

  function toggleBlockBuildoutPlayback() {
    setIsBlockBuildoutPlaying((current) => {
      if (current) return false;
      if (blockMaxBuiltYear >= blockYearRange.max) {
        setBlockMaxBuiltYear(blockYearRange.min);
      }
      return true;
    });
  }

  function selectParcel(feature: ParcelFeature) {
    setSelectedPin(feature.properties.pin_normalized || feature.properties.pin_original || null);
    setActiveAnalysisScale("home");
  }

  function selectBlockParcel(feature: ParcelFeature) {
    setSelectedPin(feature.properties.pin_normalized || feature.properties.pin_original || null);
    setActiveAnalysisScale("block");
  }

  function selectHotspot(hotspot: HotspotFeature) {
    setSelectedHotspot(hotspot);
    setSelectedAreaId(`change:${hotspot.properties.id}`);
    setActiveAnalysisScale("area");
  }

  function selectArea(area: AreaSummaryFeature) {
    setSelectedAreaId(area.properties.id);
    if (area.properties.hotspotId) {
      const hotspot = hotspots.features.find((candidate) => candidate.properties.id === area.properties.hotspotId);
      setSelectedHotspot(hotspot ?? null);
    } else {
      setSelectedHotspot(null);
    }
    setActiveAnalysisScale("area");
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
        parcels={mapParcels}
        selectedParcel={selectedParcel}
        selectedBlockParcels={selectedBlockParcels}
        boundary={boundary}
        showOutlines={showOutlines}
        showBoundary={showBoundary}
        showPermitPressure={mapShowPermitPressure}
        permitPressureMapMode={mapPermitPressureMode}
        visiblePermitPressureTypes={visiblePermitPressureTypes}
        visiblePermitStabilityTypes={visiblePermitStabilityTypes}
        historicalOverlays={historicalOverlays}
        swipeEnabled={swipeEnabled}
        swipePosition={swipePosition}
        hotspots={mapHotspots}
        areaSummaries={mapAreaSummaries}
        selectedHotspot={activeAnalysisScale === "area" ? selectedHotspot : null}
        selectedArea={activeAnalysisScale === "area" ? selectedArea : null}
        selectedParcelChange={selectedParcelChange}
        visibleChangeTypes={visibleChangeTypes}
        onSelectParcel={activeAnalysisScale === "block" ? selectBlockParcel : selectParcel}
        onSelectParcelChange={setSelectedParcelChange}
        onSelectHotspot={selectHotspot}
        onSelectArea={selectArea}
      />
      <div className="map-legend-overlay">
        <Legend
          activePreset={activeMapPreset}
          visibleDecades={visibleLegendBuckets}
          showParcelChangeLegend={activeHistoricalLayerIds.has(parcelChangeLayerId)}
          visibleChangeTypes={visibleChangeTypes}
          showPermitPressureLegend={mapShowPermitPressure}
          permitPressureMapMode={mapPermitPressureMode}
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
          <AnalysisNarrative
            activeScale={activeAnalysisScale}
            selectedParcel={selectedParcel}
            hotspots={hotspots}
            selectedHotspot={selectedHotspot}
            areaGrouping={activeAreaGrouping}
            selectedArea={selectedArea}
            activePreset={activeVisualizationPreset}
            totalCount={parcels?.features.length ?? 0}
          />
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

          {activeAnalysisScale === "block" && (
            <>
              <SearchPanel
                parcels={parcels}
                selectedPin={selectedPin}
                visiblePins={visiblePins}
                onSelectParcel={selectBlockParcel}
                onClearSelection={() => setSelectedPin(null)}
              />
              <BlockPanel
                parcel={selectedParcel}
                parcels={pressureDecoratedParcels}
                permitPressureWindow={permitPressureWindow}
                activeView={activeBlockView}
                maxBuiltYear={blockMaxBuiltYear}
                minAvailableYear={blockYearRange.min}
                maxAvailableYear={blockYearRange.max}
                isBuildoutPlaying={isBlockBuildoutPlaying}
                animationSpeed={animationSpeed}
                builtByYearCount={blockBuildoutStats.builtByYear}
                knownYearTotal={blockBuildoutStats.knownYearTotal}
                percentBuilt={blockBuildoutStats.percentBuilt}
                onSetActiveView={selectBlockView}
                onSetMaxBuiltYear={handleSetBlockMaxBuiltYear}
                onToggleBuildoutPlayback={toggleBlockBuildoutPlayback}
                onResetBuildout={() => {
                  setIsBlockBuildoutPlaying(false);
                  setBlockMaxBuiltYear(blockYearRange.min);
                }}
                onSetAnimationSpeed={setAnimationSpeed}
              />
            </>
          )}

          {activeAnalysisScale === "area" && (
            <HotspotPanel
              hotspots={hotspots}
              areaSummaries={areaSummaries}
              activeGrouping={activeAreaGrouping}
              selectedAreaId={selectedAreaId}
              selectedHotspotId={selectedHotspot?.properties.id ?? null}
              hasWardBoundaries={Boolean(wardBoundaries?.features.length)}
              onSetGrouping={setActiveAreaGrouping}
              onSelectArea={selectArea}
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
                activePreset={activeVisualizationPreset}
                maxBuiltYear={maxBuiltYear}
                minAvailableYear={yearRange.min}
                maxAvailableYear={yearRange.max}
                isBuildoutPlaying={isBuildoutPlaying}
                animationSpeed={animationSpeed}
                builtByYearCount={buildoutStats.builtByYear}
                knownYearTotal={buildoutStats.knownYearTotal}
                percentBuilt={buildoutStats.percentBuilt}
                totalCount={parcels?.features.length ?? 0}
                onSetMaxBuiltYear={handleSetMaxBuiltYear}
                onToggleBuildoutPlayback={toggleBuildoutPlayback}
                onResetBuildout={() => {
                  setIsBuildoutPlaying(false);
                  setMaxBuiltYear(yearRange.min);
                }}
                onSetAnimationSpeed={setAnimationSpeed}
              />
              {activeVisualizationPreset === "age" && (
                <>
                  <DecadeComparisonTable parcels={pressureDecoratedParcels} />
                  <DecadeDistributionChart parcels={parcels} />
                </>
              )}
              {activeVisualizationPreset === "buildout" && (
                <>
                  <BuildoutMilestonesTable parcels={parcels} />
                  <DecadeDistributionChart
                    parcels={parcels}
                    title="Build-Out by Decade"
                    note="Shows how many of today's homes were added in each decade. Use the time controls above to watch the city fill in on the map."
                  />
                </>
              )}
              {activeVisualizationPreset === "stability" && (
                <NeighborhoodComparisonTable neighborhoods={cityNeighborhoodSummaries} />
              )}
              {activeVisualizationPreset === "activity" && (
                <PermitWorkComparisonTable
                  parcels={pressureDecoratedParcels}
                  permitPressureWindow={permitPressureWindow}
                />
              )}
            </>
          )}

          <ProductEvidencePanel activeScale={activeAnalysisScale}>
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
          </ProductEvidencePanel>
        </div>
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

function yearRangeForFeatures(
  features: ParcelFeature[],
  fallback: { min: number; max: number }
): { min: number; max: number } {
  const years = features
    .map((feature) => feature.properties.year_built)
    .filter((year): year is number => typeof year === "number" && year >= 1800 && year <= 2026);
  return {
    min: years.length ? Math.min(...years) : fallback.min,
    max: years.length ? Math.max(...years) : fallback.max
  };
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
