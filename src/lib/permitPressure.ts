import { getHouseEvolutionTimeline } from "./houseEvolution";
import type {
  HouseEvolutionEvent,
  ParcelCollection,
  ParcelFeature,
  PermitPressureType,
  PermitStabilityType
} from "./parcelTypes";

export type PermitPressureWindow = 1 | 5 | 10 | "all";
export type PermitPressureMapMode = "activity" | "stability";

export const permitPressureCurrentYear = 2026;

export const permitPressureWindowLabels: Record<PermitPressureWindow, string> = {
  1: "1 year",
  5: "5 years",
  10: "10 years",
  all: "All"
};

export const permitPressureMapModeLabels: Record<PermitPressureMapMode, string> = {
  activity: "Activity type",
  stability: "Stable vs changing"
};

export const permitPressureColors: Record<PermitPressureType, string> = {
  none: "#ffffff",
  recent_permit: "#2f6f73",
  remodel: "#5a7f2e",
  addition: "#b7791f",
  new_construction: "#7c3aed",
  direct_teardown: "#b91c1c",
  nearby_teardown: "#e11d48"
};

export const permitStabilityColors: Record<PermitStabilityType, string> = {
  stable: "#3f7d58",
  watch: "#d4a72c",
  changing: "#c65f2d",
  teardown_pressure: "#b91c1c"
};

export const permitPressureLegendOrder: PermitPressureType[] = [
  "direct_teardown",
  "nearby_teardown",
  "new_construction",
  "addition",
  "remodel",
  "recent_permit"
];

export const permitStabilityLegendOrder: PermitStabilityType[] = [
  "teardown_pressure",
  "changing",
  "watch",
  "stable"
];

export function decoratePermitPressure(
  parcels: ParcelCollection | null,
  pressureWindow: PermitPressureWindow
): ParcelCollection | null {
  if (!parcels) return null;

  return {
    ...parcels,
    features: parcels.features.map((feature) => decorateFeature(feature, pressureWindow))
  };
}

export function permitPressureLabel(pressureType: PermitPressureType): string {
  const labels: Record<PermitPressureType, string> = {
    none: "No recent permits",
    recent_permit: "Recent permit",
    remodel: "Remodel",
    addition: "Addition",
    new_construction: "New construction",
    direct_teardown: "Teardown permit",
    nearby_teardown: "Nearby teardown"
  };
  return labels[pressureType];
}

export function permitStabilityLabel(stabilityType: PermitStabilityType): string {
  const labels: Record<PermitStabilityType, string> = {
    stable: "Stable",
    watch: "Watch",
    changing: "Changing",
    teardown_pressure: "Teardown pressure"
  };
  return labels[stabilityType];
}

function decorateFeature(feature: ParcelFeature, pressureWindow: PermitPressureWindow): ParcelFeature {
  const precomputed = precomputedPressureSummary(feature.properties, pressureWindow);
  if (precomputed) {
    return {
      ...feature,
      properties: {
        ...feature.properties,
        permit_pressure_type: precomputed.pressureType,
        permit_stability_type: precomputed.stabilityType,
        permit_pressure_score: precomputed.score,
        recent_permit_count: precomputed.permitCount,
        recent_teardown_count: precomputed.teardownCount
      }
    };
  }

  const events = getHouseEvolutionTimeline(feature.properties).filter((event) => isWithinWindow(event, pressureWindow));
  const directPermits = events.filter((event) => event.event_type === "permit");
  const directTeardowns = directPermits.filter(isFullDemolitionPermitEvent);
  const nearbyTeardowns = events.filter((event) => event.event_type === "nearby_teardown");
  const pressureType = classifyPressureType(directPermits, directTeardowns, nearbyTeardowns);
  const recentPermitCount = directPermits.length;
  const recentTeardownCount = directTeardowns.length;

  return {
    ...feature,
    properties: {
      ...feature.properties,
      permit_pressure_type: pressureType,
      permit_stability_type: classifyStabilityType(pressureType, recentPermitCount, recentTeardownCount),
      permit_pressure_score: pressureScore(recentPermitCount, recentTeardownCount, pressureType),
      recent_permit_count: recentPermitCount,
      recent_teardown_count: recentTeardownCount
    }
  };
}

function precomputedPressureSummary(
  properties: ParcelFeature["properties"],
  pressureWindow: PermitPressureWindow
): {
  pressureType: PermitPressureType;
  stabilityType: PermitStabilityType;
  score: number;
  permitCount: number;
  teardownCount: number;
} | null {
  const suffix = String(pressureWindow);
  const pressureType = properties[`permit_pressure_${suffix}_type` as keyof typeof properties] as PermitPressureType | null | undefined;
  const stabilityType = properties[`permit_stability_${suffix}_type` as keyof typeof properties] as PermitStabilityType | null | undefined;
  const score = properties[`permit_pressure_${suffix}_score` as keyof typeof properties];
  const permitCount = properties[`recent_permit_${suffix}_count` as keyof typeof properties];
  const teardownCount = properties[`recent_teardown_${suffix}_count` as keyof typeof properties];

  if (!pressureType || !stabilityType) return null;
  return {
    pressureType,
    stabilityType,
    score: typeof score === "number" ? score : 0,
    permitCount: typeof permitCount === "number" ? permitCount : 0,
    teardownCount: typeof teardownCount === "number" ? teardownCount : 0
  };
}

function classifyStabilityType(
  pressureType: PermitPressureType,
  recentPermitCount: number,
  recentTeardownCount: number
): PermitStabilityType {
  if (pressureType === "direct_teardown" || pressureType === "new_construction" || recentTeardownCount > 0) {
    return "teardown_pressure";
  }
  if (pressureType === "nearby_teardown" || pressureType === "addition" || recentPermitCount >= 3) {
    return "changing";
  }
  if (pressureType === "remodel" || pressureType === "recent_permit" || recentPermitCount > 0) {
    return "watch";
  }
  return "stable";
}

function classifyPressureType(
  directPermits: HouseEvolutionEvent[],
  directTeardowns: HouseEvolutionEvent[],
  nearbyTeardowns: HouseEvolutionEvent[]
): PermitPressureType {
  if (directTeardowns.length > 0) return "direct_teardown";
  if (directPermits.some(isFullNewConstructionPermitEvent)) return "new_construction";
  if (nearbyTeardowns.length > 0) return "nearby_teardown";
  if (directPermits.some((event) => titleOrDescription(event).includes("addition"))) return "addition";
  if (directPermits.some((event) => /remodel|renovation|alteration|interior/.test(titleOrDescription(event)))) return "remodel";
  if (directPermits.length > 0) return "recent_permit";
  return "none";
}

function pressureScore(
  recentPermitCount: number,
  recentTeardownCount: number,
  pressureType: PermitPressureType
): number {
  if (pressureType === "none") return 0;
  const base = Math.min(0.72, recentPermitCount * 0.12);
  const teardownBoost = Math.min(0.3, recentTeardownCount * 0.1);
  const typeBoost = pressureType === "direct_teardown" ? 0.22 : pressureType === "nearby_teardown" ? 0.14 : 0.06;
  return Math.min(1, base + teardownBoost + typeBoost);
}

function isWithinWindow(event: HouseEvolutionEvent, pressureWindow: PermitPressureWindow): boolean {
  if (pressureWindow === "all") return event.event_type !== "original_build";
  const year = event.year ?? yearFromDate(event.date);
  if (!year) return false;
  return year >= permitPressureCurrentYear - pressureWindow + 1 && year <= permitPressureCurrentYear;
}

function yearFromDate(date: string | null | undefined): number | null {
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.valueOf())) return null;
  return parsed.getUTCFullYear();
}

export function isFullDemolitionPermitEvent(event: HouseEvolutionEvent): boolean {
  const text = titleOrDescription(event);
  if (!/\b(demo|demolition|wreck|tear\s*down|teardown)\b/.test(text)) return false;
  if (/\b(chimney|fence|deck|porch|patio|driveway|pool|shed|roof|garage door)\b/.test(text)) return false;
  return /\b(single[-\s]?family|residence|home|house|dwelling|building|structure|principal|primary)\b/.test(text);
}

export function isFullNewConstructionPermitEvent(event: HouseEvolutionEvent): boolean {
  const text = titleOrDescription(event);
  if (/\b(addition|remodel|renovation|alteration|interior|garage|deck|porch|shed)\b/.test(text)) return false;
  return /\b(new construction|new single[-\s]?family|new residence|new home|new house|construct single[-\s]?family|single[-\s]?family residence)\b/.test(text);
}

function titleOrDescription(event: HouseEvolutionEvent): string {
  return `${event.title} ${event.description ?? ""}`.toLowerCase();
}
