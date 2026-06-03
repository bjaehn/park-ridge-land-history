import type { HistoricalLayer } from "./historicalLayerTypes";
import type { ExpressionSpecification } from "maplibre-gl";
import { parcelChangeColors } from "./parcelChangeTypes";

export function historicalLineColor(layer: HistoricalLayer): string {
  if (layer.id.includes("2000")) return "#0f766e";
  if (layer.id.includes("2021")) return "#7c3aed";
  if (layer.layerGroup === "survey_grid") return "#475569";
  if (layer.layerGroup === "local_history") return "#b45309";
  return "#111827";
}

export function historicalLineDash(layer: HistoricalLayer): number[] {
  if (layer.id.includes("2000")) return [2, 2];
  if (layer.id.includes("2021")) return [1, 0.001];
  if (layer.layerGroup === "survey_grid") return [4, 3];
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
