import { permitPressureWindowLabels, type PermitPressureWindow } from "./permitPressure";
import type { ParcelCollection, ParcelFeature, PermitStabilityType } from "./parcelTypes";

export type NearbyActivitySummary = {
  radiusFeet: number;
  windowLabel: string;
  nearbyParcelCount: number;
  directPermitParcels: number;
  changingParcels: number;
  teardownPressureParcels: number;
  stableParcels: number;
  activityRatio: number;
  signal: "quiet" | "watch" | "active" | "teardown_pressure";
  headline: string;
};

const nearbyRadiusFeet = 500;

export function summarizeNearbyActivity(
  selectedParcel: ParcelFeature | null,
  parcels: ParcelCollection | null,
  permitPressureWindow: PermitPressureWindow
): NearbyActivitySummary | null {
  if (!selectedParcel || !parcels) return null;
  const nearby = nearbyParcels(selectedParcel, parcels, nearbyRadiusFeet);

  if (nearby.length === 0) return null;

  const directPermitParcels = nearby.filter((feature) => (feature.properties.recent_permit_count ?? 0) > 0).length;
  const teardownPressureParcels = nearby.filter(
    (feature) => feature.properties.permit_stability_type === "teardown_pressure"
  ).length;
  const changingParcels = nearby.filter((feature) =>
    isChangingStability(feature.properties.permit_stability_type)
  ).length;
  const stableParcels = nearby.filter((feature) => feature.properties.permit_stability_type === "stable").length;
  const activityRatio = nearby.length ? changingParcels / nearby.length : 0;
  const signal = classifyNearbySignal(activityRatio, teardownPressureParcels, directPermitParcels);

  return {
    radiusFeet: nearbyRadiusFeet,
    windowLabel: permitPressureWindowLabels[permitPressureWindow],
    nearbyParcelCount: nearby.length,
    directPermitParcels,
    changingParcels,
    teardownPressureParcels,
    stableParcels,
    activityRatio,
    signal,
    headline: nearbyHeadline(signal)
  };
}

export function nearbyParcels(
  selectedParcel: ParcelFeature,
  parcels: ParcelCollection,
  radiusFeet: number = nearbyRadiusFeet
): ParcelFeature[] {
  const selectedCenter = centerForFeature(selectedParcel);
  if (!selectedCenter) return [];

  return parcels.features.filter((feature) => {
    const center = centerForFeature(feature);
    return center ? distanceFeet(selectedCenter, center) <= radiusFeet : false;
  });
}

export function featureCenter(feature: ParcelFeature): [number, number] | null {
  return centerForFeature(feature);
}

export function featureDistanceFeet(left: ParcelFeature, right: ParcelFeature): number | null {
  const leftCenter = centerForFeature(left);
  const rightCenter = centerForFeature(right);
  return leftCenter && rightCenter ? distanceFeet(leftCenter, rightCenter) : null;
}

function isChangingStability(stabilityType: PermitStabilityType | null | undefined): boolean {
  return stabilityType === "watch" || stabilityType === "changing" || stabilityType === "teardown_pressure";
}

function classifyNearbySignal(
  activityRatio: number,
  teardownPressureParcels: number,
  directPermitParcels: number
): NearbyActivitySummary["signal"] {
  if (teardownPressureParcels >= 3) return "teardown_pressure";
  if (activityRatio >= 0.35 || directPermitParcels >= 8) return "active";
  if (activityRatio >= 0.16 || teardownPressureParcels > 0 || directPermitParcels >= 3) return "watch";
  return "quiet";
}

function nearbyHeadline(signal: NearbyActivitySummary["signal"]): string {
  const labels: Record<NearbyActivitySummary["signal"], string> = {
    quiet: "Mostly stable nearby",
    watch: "Some nearby activity",
    active: "Active nearby change",
    teardown_pressure: "Teardown pressure nearby"
  };
  return labels[signal];
}

function centerForFeature(feature: ParcelFeature): [number, number] | null {
  const coordinates = flattenCoordinates(feature.geometry.coordinates);
  if (coordinates.length === 0) return null;
  const total = coordinates.reduce(
    (sum, coordinate) => {
      sum[0] += coordinate[0];
      sum[1] += coordinate[1];
      return sum;
    },
    [0, 0]
  );
  return [total[0] / coordinates.length, total[1] / coordinates.length];
}

function flattenCoordinates(coordinates: GeoJSON.Position[][] | GeoJSON.Position[][][]): [number, number][] {
  const positions: [number, number][] = [];
  collectPositions(coordinates, positions);
  return positions;
}

function collectPositions(value: unknown, positions: [number, number][]): void {
  if (!Array.isArray(value)) return;
  if (typeof value[0] === "number" && typeof value[1] === "number") {
    positions.push([value[0], value[1]]);
    return;
  }
  value.forEach((item) => collectPositions(item, positions));
}

function distanceFeet(left: [number, number], right: [number, number]): number {
  const earthRadiusFeet = 20_902_231;
  const leftLat = toRadians(left[1]);
  const rightLat = toRadians(right[1]);
  const deltaLat = toRadians(right[1] - left[1]);
  const deltaLon = toRadians(right[0] - left[0]);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(leftLat) * Math.cos(rightLat) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  return earthRadiusFeet * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}
