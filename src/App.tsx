import { startTransition, useEffect, useMemo, useState } from "react";
import { AnalysisNarrative } from "./components/AnalysisNarrative";
import { AnalysisTabs, type AnalysisScale } from "./components/AnalysisTabs";
import { BlockPanel, type BlockView } from "./components/BlockPanel";
import { BuildoutMilestonesTable } from "./components/BuildoutMilestonesTable";
import { ChangeStoryCard } from "./components/ChangeStoryCard";
import { LayerToggle } from "./components/LayerToggle";
import { Legend } from "./components/Legend";
import { MapCompanion } from "./components/MapCompanion";
import { MapView } from "./components/MapView";
import { DecadeComparisonTable } from "./components/DecadeComparisonTable";
import { DecadeDistributionChart } from "./components/DecadeDistributionChart";
import { NeighborhoodComparisonTable } from "./components/NeighborhoodComparisonTable";
import { HistoricalLayerPanel } from "./components/HistoricalLayerPanel";
import { HotspotPanel, type AreaView } from "./components/HotspotPanel";
import { ParcelDetailPanel, type PropertyView } from "./components/ParcelDetailPanel";
import { PermitWorkComparisonTable } from "./components/PermitWorkComparisonTable";
import { ProductEvidencePanel } from "./components/ProductEvidencePanel";
import { RoadParcelTimelinePanel } from "./components/RoadParcelTimelinePanel";
import { SearchPanel } from "./components/SearchPanel";
import { TimelineControl } from "./components/TimelineControl";
import { VisualizationPanel, type VisualizationPreset } from "./components/VisualizationPanel";
import { DataCoverageNotice } from "./components/cards/DataCoverageNotice";
import { StartHereSection } from "./components/layout/StartHereSection";
import { computeDataCoverage } from "./lib/dataCoverage";
import { useParcelDetail } from "./hooks/useParcelDetail";
import { useParkRidgeData } from "./hooks/useParkRidgeData";
import { decadeOrder } from "./lib/colorScales";
import { buildPhysicalBlock, parcelCollectionFromFeatures } from "./lib/physicalBlock";
import { loadHistoricalLayerData } from "./lib/layerLoaders";
import { layerCanToggle, type HistoricalLayer, type LoadedHistoricalLayer } from "./lib/historicalLayerTypes";
import {
  buildAreaSummaries,
  type AreaGroupingId,
  type AreaSummaryCollection,
  type AreaSummaryFeature
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
import type { ParcelCollection, ParcelFeature } from "./lib/parcelTypes";
import {
  filterRoadHistoryByPeriod,
  type HistoryPeriodId,
  type RoadSegmentHistoryFeature
} from "./lib/roadParcelHistory";

const visibleLegendBuckets = new Set(decadeOrder);
const visiblePermitPressureTypes = new Set(permitPressureLegendOrder);
const visiblePermitStabilityTypes = new Set(permitStabilityLegendOrder);
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
  const { parcels, boundary, wardBoundaries, historicalLayers, roadParcelHistory } = useParkRidgeData();
  const [showOutlines, setShowOutlines] = useState(true);
  const [showBoundary, setShowBoundary] = useState(true);
  const [showPermitPressure, setShowPermitPressure] = useState(true);
  const [permitPressureWindow, setPermitPressureWindow] = useState<PermitPressureWindow>(5);
  const [permitPressureMapMode, setPermitPressureMapMode] = useState<PermitPressureMapMode>("stability");
  const [maxBuiltYear, setMaxBuiltYear] = useState(2026);
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [isBuildoutPlaying, setIsBuildoutPlaying] = useState(false);
  const [blockMaxBuiltYear, setBlockMaxBuiltYear] = useState(2026);
  const [isBlockBuildoutPlaying, setIsBlockBuildoutPlaying] = useState(false);
  const [areaMaxBuiltYear, setAreaMaxBuiltYear] = useState(2026);
  const [isAreaBuildoutPlaying, setIsAreaBuildoutPlaying] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState<AnimationSpeed>("normal");
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
  const [activePropertyView, setActivePropertyView] = useState<PropertyView>("timeline");
  const [activeBlockView, setActiveBlockView] = useState<BlockView>("age");
  const [activeAreaView, setActiveAreaView] = useState<AreaView>("age");
  const [activeAreaGrouping, setActiveAreaGrouping] = useState<AreaGroupingId>("neighborhoods");
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [selectedHistoryPeriod, setSelectedHistoryPeriod] = useState<HistoryPeriodId>("pre_1939");
  const [showRoadHistory, setShowRoadHistory] = useState(true);
  const [selectedRoadHistory, setSelectedRoadHistory] = useState<RoadSegmentHistoryFeature | null>(null);

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
      features: parcels.features.filter((feature) => isBuiltByYear(feature, maxBuiltYear))
    };
  }, [maxBuiltYear, parcels]);

  const pressureDecoratedFilteredParcels = useMemo(
    () => decoratePermitPressure(filteredParcels, permitPressureWindow),
    [filteredParcels, permitPressureWindow]
  );

  const pressureDecoratedParcels = useMemo(
    () => decoratePermitPressure(parcels, permitPressureWindow),
    [parcels, permitPressureWindow]
  );

  const shouldBuildHotspots = activeAnalysisScale === "area" && activeAreaGrouping === "change_zones";
  const hotspots = useMemo(
    () => shouldBuildHotspots ? buildHotspots(pressureDecoratedParcels) : emptyHotspots,
    [pressureDecoratedParcels, shouldBuildHotspots]
  );

  const areaSummaries = useMemo(
    () =>
      activeAnalysisScale === "area"
        ? buildAreaSummaries(pressureDecoratedParcels, activeAreaGrouping, hotspots, wardBoundaries)
        : emptyAreas,
    [activeAnalysisScale, activeAreaGrouping, hotspots, pressureDecoratedParcels, wardBoundaries]
  );

  const selectedArea = useMemo(
    () => areaSummaries.features.find((area) => area.properties.id === selectedAreaId) ?? null,
    [areaSummaries, selectedAreaId]
  );

  // Neighborhood lookup for breadcrumbs — always shows correct neighborhood regardless of active tab
  const neighborhoodSummaries = useMemo(
    () => pressureDecoratedParcels
      ? buildAreaSummaries(pressureDecoratedParcels, "neighborhoods", emptyHotspots)
      : emptyAreas,
    [pressureDecoratedParcels]
  );

  const parcelNeighborhoodLabel = useMemo(() => {
    if (!selectedPin) return null;
    const area = neighborhoodSummaries.features.find((a) => a.properties.parcelPins.includes(selectedPin));
    return area?.properties.label ?? null;
  }, [selectedPin, neighborhoodSummaries]);

  // Neighborhood parcels for property comparison
  const selectedNeighborhoodParcels = useMemo(() => {
    if (!selectedPin || !pressureDecoratedParcels) return [];
    const neighborhood = neighborhoodSummaries.features.find((a) => a.properties.parcelPins.includes(selectedPin));
    if (!neighborhood) return pressureDecoratedParcels.features;
    const pins = new Set(neighborhood.properties.parcelPins);
    return pressureDecoratedParcels.features.filter((f) => {
      const pin = f.properties.pin_normalized || f.properties.pin_original;
      return Boolean(pin && pins.has(pin));
    });
  }, [selectedPin, pressureDecoratedParcels, neighborhoodSummaries]);

  // Data coverage stats for city scale
  const cityDataCoverage = useMemo(() => computeDataCoverage(parcels), [parcels]);

  const selectedAreaParcels = useMemo<ParcelCollection | null>(() => {
    if (!selectedArea || !pressureDecoratedParcels) return null;
    const pins = new Set(selectedArea.properties.parcelPins);
    return {
      ...pressureDecoratedParcels,
      features: pressureDecoratedParcels.features.filter((feature) => {
        const pin = feature.properties.pin_normalized || feature.properties.pin_original;
        return Boolean(pin && pins.has(pin));
      })
    };
  }, [pressureDecoratedParcels, selectedArea]);

  const areaYearRange = useMemo(() => {
    return yearRangeForFeatures(selectedAreaParcels?.features ?? [], yearRange);
  }, [selectedAreaParcels, yearRange]);

  const mapHotspots =
    activeAnalysisScale === "area" && activeAreaGrouping === "change_zones" && !selectedArea
      ? hotspots
      : emptyHotspots;
  const mapAreaSummaries =
    activeAnalysisScale === "area" && activeAreaGrouping !== "change_zones" && !selectedArea ? areaSummaries : emptyAreas;
  const mapRoadHistory = useMemo(
    () => filterRoadHistoryByPeriod(roadParcelHistory?.road_segments ?? null, selectedHistoryPeriod),
    [roadParcelHistory, selectedHistoryPeriod]
  );
  const mapShowRoadHistory = activeAnalysisScale === "city" && showRoadHistory;

  useEffect(() => {
    if (activeAnalysisScale !== "area") {
      setSelectedHotspot(null);
      setSelectedAreaId(null);
    }
  }, [activeAnalysisScale]);

  useEffect(() => {
    if (activeAnalysisScale !== "city") setSelectedRoadHistory(null);
  }, [activeAnalysisScale]);

  useEffect(() => {
    if (activeAnalysisScale !== "area" || selectedAreaId || !selectedPin) return;
    const area = areaSummaries.features.find((candidate) => candidate.properties.parcelPins.includes(selectedPin));
    if (area) setSelectedAreaId(area.properties.id);
  }, [activeAnalysisScale, areaSummaries, selectedAreaId, selectedPin]);

  useEffect(() => {
    setSelectedHotspot(null);
    setSelectedAreaId(null);
  }, [activeAreaGrouping]);

  const visiblePins = useMemo(() => {
    return new Set(
      parcels?.features
        .map((feature) => feature.properties.pin_normalized || feature.properties.pin_original)
        .filter((pin): pin is string => Boolean(pin)) ?? []
    );
  }, [parcels]);

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

  const shouldBuildCityNeighborhoodSummaries =
    activeAnalysisScale === "city" && activeVisualizationPreset === "stability";
  const cityNeighborhoodSummaries = useMemo(
    () =>
      shouldBuildCityNeighborhoodSummaries
        ? buildAreaSummaries(pressureDecoratedParcels, "neighborhoods", emptyHotspots)
        : emptyAreas,
    [pressureDecoratedParcels, shouldBuildCityNeighborhoodSummaries]
  );

  const { selectedParcel, isLoadingDetail } = useParcelDetail(pressureDecoratedParcels, selectedPin);

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

  useEffect(() => {
    setAreaMaxBuiltYear(areaYearRange.max);
    setIsAreaBuildoutPlaying(false);
  }, [areaYearRange.max, selectedAreaId]);

  useEffect(() => {
    if (!isAreaBuildoutPlaying) return;

    const intervalId = window.setInterval(() => {
      setAreaMaxBuiltYear((currentYear) => {
        if (currentYear >= areaYearRange.max) {
          setIsAreaBuildoutPlaying(false);
          return areaYearRange.max;
        }
        return currentYear + 1;
      });
    }, animationIntervals[animationSpeed]);

    return () => window.clearInterval(intervalId);
  }, [animationSpeed, areaYearRange.max, isAreaBuildoutPlaying]);

  const selectedBlockFilteredParcels = useMemo(() => {
    if (!selectedBlockParcels) return null;
    const yearLimit = activeBlockView === "buildout" ? blockMaxBuiltYear : blockYearRange.max;
    return {
      ...selectedBlockParcels,
      features: selectedBlockParcels.features.filter((feature) => isBuiltByYear(feature, yearLimit))
    };
  }, [activeBlockView, blockMaxBuiltYear, blockYearRange.max, selectedBlockParcels]);

  const selectedAreaFilteredParcels = useMemo(() => {
    if (!selectedAreaParcels) return null;
    const yearLimit = activeAreaView === "buildout" ? areaMaxBuiltYear : areaYearRange.max;
    return {
      ...selectedAreaParcels,
      features: selectedAreaParcels.features.filter((feature) => isBuiltByYear(feature, yearLimit))
    };
  }, [activeAreaView, areaMaxBuiltYear, areaYearRange.max, selectedAreaParcels]);

  const mapParcels = pressureDecoratedFilteredParcels;

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

  const areaBuildoutStats = useMemo(() => {
    const knownYears = selectedAreaParcels?.features
      .map((feature) => feature.properties.year_built)
      .filter((year): year is number => typeof year === "number" && year >= 1800 && year <= areaYearRange.max) ?? [];
    const builtByYear = knownYears.filter((year) => year <= areaMaxBuiltYear).length;
    return {
      builtByYear,
      knownYearTotal: knownYears.length,
      percentBuilt: knownYears.length ? Math.round((builtByYear / knownYears.length) * 100) : 0,
      totalCount: selectedAreaParcels?.features.length ?? 0
    };
  }, [areaMaxBuiltYear, areaYearRange.max, selectedAreaParcels]);

  const activeMapPreset: VisualizationPreset =
    activeAnalysisScale === "block"
      ? activeBlockView
      : activeAnalysisScale === "area" && selectedArea
        ? activeAreaView
        : activeVisualizationPreset;
  const mapPermitPressureMode =
    activeAnalysisScale === "block"
      ? activeBlockView === "activity" ? "activity" : "stability"
      : activeAnalysisScale === "area" && selectedArea
        ? activeAreaView === "activity" ? "activity" : "stability"
      : permitPressureMapMode;
  const mapShowPermitPressure =
    activeAnalysisScale === "block"
      ? activeBlockView === "stability" || activeBlockView === "activity"
      : activeAnalysisScale === "area" && selectedArea
        ? activeAreaView === "stability" || activeAreaView === "activity"
      : showPermitPressure;
  const focusedVisibleCount =
    activeAnalysisScale === "block" && selectedBlockFilteredParcels
      ? selectedBlockFilteredParcels.features.length
      : activeAnalysisScale === "area" && selectedAreaFilteredParcels
        ? selectedAreaFilteredParcels.features.length
        : mapParcels?.features.length ?? 0;
  const mapBuildoutPlaying =
    activeAnalysisScale === "block"
      ? isBlockBuildoutPlaying
      : activeAnalysisScale === "area"
        ? isAreaBuildoutPlaying
        : isBuildoutPlaying;
  const mapMaxBuiltYear =
    activeAnalysisScale === "block"
      ? blockMaxBuiltYear
      : activeAnalysisScale === "area"
        ? areaMaxBuiltYear
        : maxBuiltYear;

  const historicalOverlays = useMemo(() => {
    return Array.from(activeHistoricalLayerIds)
      .map((layerId) => loadedHistoricalLayers[layerId])
      .filter((loadedLayer): loadedLayer is LoadedHistoricalLayer => Boolean(loadedLayer));
  }, [activeHistoricalLayerIds, loadedHistoricalLayers]);

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

  function selectAreaView(view: AreaView) {
    setActiveAreaView(view);
    setIsAreaBuildoutPlaying(false);
    if (view === "buildout") {
      setAreaMaxBuiltYear(areaYearRange.min);
      setIsAreaBuildoutPlaying(true);
      return;
    }
    setAreaMaxBuiltYear(areaYearRange.max);
  }

  function handleSetAreaMaxBuiltYear(year: number) {
    setIsAreaBuildoutPlaying(false);
    setAreaMaxBuiltYear(year);
  }

  function toggleAreaBuildoutPlayback() {
    setIsAreaBuildoutPlaying((current) => {
      if (current) return false;
      if (areaMaxBuiltYear >= areaYearRange.max) {
        setAreaMaxBuiltYear(areaYearRange.min);
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
    setAreaMaxBuiltYear(areaYearRange.max);
    setIsAreaBuildoutPlaying(false);
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

  function setAnalysisScale(scale: AnalysisScale) {
    startTransition(() => {
      setActiveAnalysisScale(scale);
    });
  }

  function navigateToScale(scale: AnalysisScale) {
    if (scale === "area") {
      setActiveAreaGrouping("neighborhoods");
      setSelectedAreaId(null);
    }
    setAnalysisScale(scale);
  }

  const mapPanel = (
    <section className="scale-map-column" aria-label={`${scaleLabel(activeAnalysisScale)} map`}>
      <div className="tab-map-workspace">
        <MapView
          parcels={mapParcels}
          selectedParcel={selectedParcel}
          selectedBlockParcels={activeAnalysisScale === "block" ? selectedBlockFilteredParcels : null}
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
          roadHistory={mapRoadHistory}
          showRoadHistory={mapShowRoadHistory}
          selectedHistoryPeriod={selectedHistoryPeriod}
          visibleChangeTypes={visibleChangeTypes}
          onSelectParcel={activeAnalysisScale === "block" ? selectBlockParcel : selectParcel}
          onSelectParcelChange={setSelectedParcelChange}
          onSelectHotspot={selectHotspot}
          onSelectArea={selectArea}
          onSelectRoadHistory={setSelectedRoadHistory}
        />
        <div className="map-companion-overlay">
          <MapCompanion
            activeScale={activeAnalysisScale}
            activePreset={activeMapPreset}
            visibleCount={focusedVisibleCount}
            totalCount={parcels?.features.length ?? 0}
            selectedAddress={selectedParcel?.properties.address}
            selectedAreaLabel={selectedArea?.properties.label}
            selectedHotspotTitle={selectedHotspot?.properties.title}
            isBuildoutPlaying={mapBuildoutPlaying}
            maxBuiltYear={mapMaxBuiltYear}
            showPermitPressure={mapShowPermitPressure}
            permitPressureMapMode={mapPermitPressureMode}
          />
        </div>
        <div className="map-legend-overlay">
          <Legend
            activePreset={activeMapPreset}
            visibleDecades={visibleLegendBuckets}
            showParcelChangeLegend={activeHistoricalLayerIds.has(parcelChangeLayerId)}
            showPermitPressureLegend={mapShowPermitPressure}
            permitPressureMapMode={mapPermitPressureMode}
            compact
          />
        </div>
      </div>
    </section>
  );

  return (
    <main className="app-shell product-app-shell">
        <div style={{background:'red',color:'white',padding:'8px',textAlign:'center',fontWeight:'bold',fontSize:'18px'}}>🚨 DEPLOY TEST — IF YOU SEE THIS, RAILWAY IS LIVE 🚨</div>
        <header className="app-header">
          <div className="app-header-brand">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5z" />
              <polyline points="9 21 9 12 15 12 15 21" />
            </svg>
            <span className="app-header-title">Park Ridge Land History</span>
          </div>
          <span className="app-header-tagline">Property records, source-backed</span>
        </header>
        <div className="analysis-workspace-card">
          <AnalysisTabs activeScale={activeAnalysisScale} onSetScale={setAnalysisScale} />

          <div className="analysis-tab-panel scale-workspace" role="tabpanel">
          <section className="scale-analysis-column" aria-label={`${scaleLabel(activeAnalysisScale)} analysis`}>
          <ScaleBreadcrumbs
            activeScale={activeAnalysisScale}
            neighborhoodLabel={parcelNeighborhoodLabel || selectedArea?.properties.label}
            onNavigate={navigateToScale}
          />
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
              {!selectedPin && (
                <StartHereSection onNavigate={navigateToScale} />
              )}
              <ParcelDetailPanel
                parcel={selectedParcel}
                parcels={pressureDecoratedParcels}
                permitPressureWindow={permitPressureWindow}
                isLoadingDetail={isLoadingDetail}
                activeView={activePropertyView}
                blockParcels={selectedPhysicalBlock?.contextParcels ?? []}
                neighborhoodParcels={selectedNeighborhoodParcels}
                onSetActiveView={setActivePropertyView}
                onSelectRelatedParcel={selectParcel}
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
              activeView={activeAreaView}
              selectedAreaId={selectedAreaId}
              hasWardBoundaries={Boolean(wardBoundaries?.features.length)}
              selectedAreaParcels={selectedAreaParcels}
              permitPressureWindow={permitPressureWindow}
              maxBuiltYear={areaMaxBuiltYear}
              minAvailableYear={areaYearRange.min}
              maxAvailableYear={areaYearRange.max}
              isBuildoutPlaying={isAreaBuildoutPlaying}
              animationSpeed={animationSpeed}
              builtByYearCount={areaBuildoutStats.builtByYear}
              knownYearTotal={areaBuildoutStats.knownYearTotal}
              percentBuilt={areaBuildoutStats.percentBuilt}
              onSetGrouping={setActiveAreaGrouping}
              onSetActiveView={selectAreaView}
              onSelectArea={selectArea}
              onSetMaxBuiltYear={handleSetAreaMaxBuiltYear}
              onToggleBuildoutPlayback={toggleAreaBuildoutPlayback}
              onResetBuildout={() => {
                setIsAreaBuildoutPlaying(false);
                setAreaMaxBuiltYear(areaYearRange.min);
              }}
              onSetAnimationSpeed={setAnimationSpeed}
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
              <RoadParcelTimelinePanel
                data={roadParcelHistory}
                selectedPeriod={selectedHistoryPeriod}
                showRoadHistory={showRoadHistory}
                selectedRoad={selectedRoadHistory}
                onSelectPeriod={setSelectedHistoryPeriod}
                onSetShowRoadHistory={setShowRoadHistory}
                onClearSelectedRoad={() => setSelectedRoadHistory(null)}
              />
              <ChangeStoryCard scope="city" parcels={pressureDecoratedParcels} />
              {activeVisualizationPreset === "age" && (
                <>
                  <DecadeComparisonTable parcels={pressureDecoratedParcels} />
                  <DecadeDistributionChart parcels={parcels} />
                  <DataCoverageNotice stats={cityDataCoverage} />
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
          </section>
          {mapPanel}
          </div>
        </div>
    </main>
  );
}

function isBuiltByYear(feature: ParcelFeature, maxBuiltYear: number): boolean {
  const year = feature.properties.year_built;
  const hasKnownYear = typeof year === "number";
  if (!hasKnownYear) return true;
  return year <= maxBuiltYear;
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

function scaleLabel(scale: AnalysisScale): string {
  if (scale === "home") return "Property";
  if (scale === "block") return "Block";
  if (scale === "area") return "Area";
  return "Park Ridge";
}

const breadcrumbIcons: Record<AnalysisScale, JSX.Element> = {
  home: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5z" />
      <polyline points="9 21 9 12 15 12 15 21" />
    </svg>
  ),
  block: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  area: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2a7 7 0 017 7c0 4.97-6.22 12.18-6.7 12.76a.4.4 0 01-.6 0C11.22 21.18 5 13.97 5 9a7 7 0 017-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  ),
  city: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="1" y1="22" x2="23" y2="22" />
      <path d="M2 22V15l5-2v9" /><path d="M7 22V10l5-5v17" />
      <path d="M12 22V13l5-3v12" /><path d="M17 22V17l4-2v7" />
    </svg>
  )
};

function ScaleBreadcrumbs({
  activeScale,
  neighborhoodLabel,
  onNavigate
}: {
  activeScale: AnalysisScale;
  neighborhoodLabel?: string | null;
  onNavigate: (scale: AnalysisScale) => void;
}) {
  const items: Array<{ scale: AnalysisScale; label: string }> = [
    { scale: "home",  label: "Property" },
    { scale: "block", label: "Block" },
    { scale: "area",  label: neighborhoodLabel || "Neighborhood" },
    { scale: "city",  label: "Park Ridge" }
  ];

  return (
    <nav className="scale-breadcrumbs" aria-label="Place hierarchy">
      <ol>
        {items.map((item, index) => (
          <li key={item.scale}>
            {index > 0 && <span className="breadcrumb-separator" aria-hidden="true">›</span>}
            <button
              className={activeScale === item.scale ? "is-active" : ""}
              type="button"
              onClick={() => onNavigate(item.scale)}
              aria-current={activeScale === item.scale ? "page" : undefined}
              title={item.label}
            >
              <span className="breadcrumb-icon">{breadcrumbIcons[item.scale]}</span>
              <span className="breadcrumb-label">{item.label}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
