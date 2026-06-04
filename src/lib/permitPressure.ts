import { getHouseEvolutionTimeline } from "./houseEvolution";
import type { HouseEvolutionEvent, ParcelCollection, ParcelFeature, PermitPressureType } from "./parcelTypes";

export type PermitPressureWindow = 1 | 5 | 10 | "all";

export const permitPressureCurrentYear = 2026;

export const permitPressureWindowLabels: Record<PermitPressureWindow, string> = {
  1: "1 year",
  5: "5 years",
  10: "10 years",
  all: "All"
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

export const permitPressureLegendOrder: PermitPressureType[] = [
  "direct_teardown",
  "nearby_teardown",
  "new_construction",
  "addition",
  "remodel",
  "recent_permit"
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

function decorateFeature(feature: ParcelFeature, pressureWindow: PermitPressureWindow): ParcelFeature {
  const events = getHouseEvolutionTimeline(feature.properties).filter((event) => isWithinWindow(event, pressureWindow));
  const directPermits = events.filter((event) => event.event_type === "permit");
  const directTeardowns = directPermits.filter(isTeardownEvent);
  const nearbyTeardowns = events.filter((event) => event.event_type === "nearby_teardown");
  const pressureType = classifyPressureType(directPermits, directTeardowns, nearbyTeardowns);
  const recentPermitCount = directPermits.length;
  const recentTeardownCount = directTeardowns.length + nearbyTeardowns.length;

  return {
    ...feature,
    properties: {
      ...feature.properties,
      permit_pressure_type: pressureType,
      permit_pressure_score: pressureScore(recentPermitCount, recentTeardownCount, pressureType),
      recent_permit_count: recentPermitCount,
      recent_teardown_count: recentTeardownCount
    }
  };
}

function classifyPressureType(
  directPermits: HouseEvolutionEvent[],
  directTeardowns: HouseEvolutionEvent[],
  nearbyTeardowns: HouseEvolutionEvent[]
): PermitPressureType {
  if (directTeardowns.length > 0) return "direct_teardown";
  if (nearbyTeardowns.length > 0) return "nearby_teardown";
  if (directPermits.some((event) => titleOrDescription(event).includes("new construction"))) return "new_construction";
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

function isTeardownEvent(event: HouseEvolutionEvent): boolean {
  return /demo|demolition|tear\s*down|teardown|wreck/.test(titleOrDescription(event));
}

function titleOrDescription(event: HouseEvolutionEvent): string {
  return `${event.title} ${event.description ?? ""}`.toLowerCase();
}
