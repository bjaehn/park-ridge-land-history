import type { ParcelProperties, PermitStabilityType } from "./parcelTypes";

export type HomeSignalTone = "heritage" | "activity" | "market" | "watch" | "scale";

export type HomeSignal = {
  id: string;
  label: string;
  detail: string;
  tone: HomeSignalTone;
  score: number;
};

const currentYear = 2026;

export function buildHomeSignals(properties: ParcelProperties): HomeSignal[] {
  const signals: HomeSignal[] = [];
  const age = typeof properties.year_built === "number" ? currentYear - properties.year_built : null;
  const saleCount = properties.sale_count ?? 0;
  const permitCount = properties.permit_count ?? 0;
  const recentPermitCount = properties.recent_permit_count ?? 0;
  const teardownCount = properties.nearby_teardown_count ?? properties.recent_teardown_count ?? 0;
  const landSqft = properties.land_sqft ?? 0;
  const buildingSqft = properties.building_sqft ?? 0;

  if (age !== null && age >= 100) {
    signals.push({
      id: "century-home",
      label: "Century home",
      detail: `Built about ${age} years ago.`,
      tone: "heritage",
      score: 95
    });
  } else if (age !== null && age >= 75) {
    signals.push({
      id: "older-fabric",
      label: "Older fabric",
      detail: `Built about ${age} years ago.`,
      tone: "heritage",
      score: 70
    });
  }

  if (saleCount >= 7) {
    signals.push({
      id: "frequent-seller",
      label: "Frequent seller",
      detail: `${saleCount} market sales since 1999.`,
      tone: "market",
      score: 90
    });
  } else if (saleCount === 0 && age !== null && age >= 50) {
    signals.push({
      id: "held-close",
      label: "Held close",
      detail: "No market sale found since 1999.",
      tone: "market",
      score: 58
    });
  }

  if (recentPermitCount >= 2 || permitCount >= 8) {
    signals.push({
      id: "permit-active",
      label: "Permit active",
      detail: `${permitCount} permit records in the timeline.`,
      tone: "activity",
      score: 84
    });
  }

  if (isTeardownPressure(properties.permit_stability_type) || teardownCount > 0) {
    signals.push({
      id: "teardown-watch",
      label: "Teardown watch",
      detail: teardownCount > 0 ? `${teardownCount} nearby teardown-like events.` : "Permit pattern suggests teardown pressure.",
      tone: "watch",
      score: 88
    });
  }

  if (age !== null && age >= 75 && permitCount <= 1 && saleCount <= 2) {
    signals.push({
      id: "quiet-survivor",
      label: "Quiet survivor",
      detail: "Older home with limited sale and permit activity.",
      tone: "heritage",
      score: 82
    });
  }

  if (landSqft >= 10000) {
    signals.push({
      id: "large-lot",
      label: "Big lot",
      detail: `${Math.round(landSqft).toLocaleString()} sq ft of land.`,
      tone: "scale",
      score: 72
    });
  }

  if (buildingSqft >= 3500) {
    signals.push({
      id: "large-home",
      label: "Large home",
      detail: `${Math.round(buildingSqft).toLocaleString()} building sq ft.`,
      tone: "scale",
      score: 68
    });
  }

  return signals.sort((left, right) => right.score - left.score).slice(0, 4);
}

function isTeardownPressure(value: PermitStabilityType | null | undefined): boolean {
  return value === "teardown_pressure";
}
