import type { HistoricalLayer } from "./historicalLayerTypes";
import type { ExpressionSpecification } from "maplibre-gl";
import { parcelChangeColors } from "./parcelChangeTypes";

export function historicalLineColor(layer: HistoricalLayer): string {
  if (layer.id.includes("2000")) return "#0f766e";
  if (layer.id.includes("2021")) return "#7c3aed";
  if (layer.layerGroup === "survey_grid") return "#475569";
  if (layer.layerGroup === "local_history") return "#b45309";
  if (layer.layerGroup === "built_environment") return "#264653";
  return "#111827";
}

export function historicalLineDash(layer: HistoricalLayer): number[] {
  if (layer.id.includes("2000")) return [2, 2];
  if (layer.id.includes("2021")) return [1, 0.001];
  if (layer.layerGroup === "survey_grid") return [4, 3];
  if (layer.id.includes("building_footprints")) return [1, 0.001];
  return [1, 0.001];
}

export function parcelChangeFillColorExpression(): ExpressionSpecification {
  return [
    "match",
    ["get", "change_type"],
    "unchanged",
    parcelChangeColors.unchanged,
    "new_pin",
    parcelChangeColors.new_pin,
    "retired_pin",
    parcelChangeColors.retired_pin,
    "likely_split",
    parcelChangeColors.likely_split,
    "likely_merge",
    parcelChangeColors.likely_merge,
    "geometry_or_area_changed",
    parcelChangeColors.geometry_or_area_changed,
    "uncertain_change",
    parcelChangeColors.uncertain_change,
    parcelChangeColors.uncertain_change
  ];
}

export function lotCoverageFillColorExpression(): ExpressionSpecification {
  return [
    "interpolate",
    ["linear"],
    ["coalesce", ["get", "lot_coverage_pct"], 0],
    0,
    "rgba(255,255,255,0)",
    0.18,
    "#d8f3dc",
    0.28,
    "#74c69d",
    0.4,
    "#2d6a4f",
    0.55,
    "#1b4332"
  ] as ExpressionSpecification;
}

export function historicCharacterFillColorExpression(): ExpressionSpecification {
  return [
    "match",
    ["get", "historic_character_type"],
    "pre_1900",
    "#7f1d1d",
    "early_1900s",
    "#b45309",
    "pre_1920",
    "#d97706",
    "century_home",
    "#f59e0b",
    "#fbbf24"
  ] as unknown as ExpressionSpecification;
}
