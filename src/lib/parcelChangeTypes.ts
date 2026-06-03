export type ParcelChangeType =
  | "likely_split"
  | "likely_merge"
  | "new_pin"
  | "retired_pin"
  | "geometry_or_area_changed"
  | "unchanged"
  | "uncertain_change";

export type ParcelChangeProperties = {
  change_type?: ParcelChangeType | string | null;
  old_pin?: string | null;
  new_pin?: string | null;
  old_year?: number | null;
  new_year?: number | null;
  area_change_pct?: number | null;
  confidence?: string | null;
};

export type ParcelChangeFeature = GeoJSON.Feature<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  ParcelChangeProperties
>;

export const parcelChangeLayerId = "parcel_changes_2000_2021";

export const parcelChangeColors: Record<ParcelChangeType, string> = {
  likely_split: "#f59e0b",
  likely_merge: "#8b5cf6",
  new_pin: "#22c55e",
  retired_pin: "#ef4444",
  geometry_or_area_changed: "#0ea5e9",
  unchanged: "#94a3b8",
  uncertain_change: "#64748b"
};

export const parcelChangeLabels: Record<ParcelChangeType, string> = {
  likely_split: "Likely split",
  likely_merge: "Likely merge",
  new_pin: "New PIN",
  retired_pin: "Retired PIN",
  geometry_or_area_changed: "Area change",
  unchanged: "Unchanged",
  uncertain_change: "Uncertain"
};

export const parcelChangeFilterOrder: ParcelChangeType[] = [
  "likely_split",
  "likely_merge",
  "new_pin",
  "retired_pin",
  "geometry_or_area_changed",
  "unchanged"
];

export const parcelChangeLegendOrder: ParcelChangeType[] = [
  "likely_split",
  "likely_merge",
  "new_pin",
  "retired_pin",
  "geometry_or_area_changed",
  "unchanged",
  "uncertain_change"
];

