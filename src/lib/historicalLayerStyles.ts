import type { HistoricalLayer } from "./historicalLayerTypes";
import type { ExpressionSpecification } from "maplibre-gl";

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
    "#94a3b8",
    "new_pin",
    "#22c55e",
    "retired_pin",
    "#ef4444",
    "likely_split",
    "#f59e0b",
    "likely_merge",
    "#8b5cf6",
    "geometry_or_area_changed",
    "#0ea5e9",
    "uncertain_change",
    "#64748b",
    "#64748b"
  ];
}
