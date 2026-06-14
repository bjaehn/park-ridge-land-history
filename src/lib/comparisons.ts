import type { ParcelFeature } from "./parcelTypes";

export const COMPARISON_THRESHOLDS = {
  block: 5,
  neighborhood: 20,
  city: 100
} as const;

export type ComparisonScope = "block" | "neighborhood" | "city";

export type ComparisonDirection = "much_older" | "older" | "similar" | "newer" | "much_newer" | "more" | "less" | "much_more" | "much_less" | "higher" | "lower" | "much_higher" | "much_lower" | "unknown";

export type SingleComparison = {
  label: string;
  referenceValue: number | null;
  referenceLabel: string;
  sampleSize: number;
  insufficient: boolean;
};

export type ComparisonSet = {
  block: SingleComparison | null;
  neighborhood: SingleComparison | null;
  city: SingleComparison | null;
};

export type PropertyComparisons = {
  yearBuilt: ComparisonSet;
  permits: ComparisonSet;
  sales: ComparisonSet;
  assessedValue: ComparisonSet;
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function insufficientResult(scope: string, minSample: number, sampleSize: number): SingleComparison {
  return {
    label: `Not enough comparable properties to compare to ${scope} (need at least ${minSample}, found ${sampleSize})`,
    referenceValue: null,
    referenceLabel: "",
    sampleSize,
    insufficient: true
  };
}

function missingSubjectResult(scope: string, sampleSize: number): SingleComparison {
  return {
    label: `This property does not have the data needed for a ${scope} comparison`,
    referenceValue: null,
    referenceLabel: "",
    sampleSize,
    insufficient: true
  };
}

export function compareYearBuilt(
  subjectYear: number | null | undefined,
  referenceFeatures: ParcelFeature[],
  scope: ComparisonScope,
  scopeLabel: string
): SingleComparison {
  const minSample = COMPARISON_THRESHOLDS[scope];
  const refYears = referenceFeatures
    .map(f => f.properties.year_built)
    .filter((y): y is number => typeof y === "number" && y > 1800 && y <= 2026);

  if (refYears.length < minSample) return insufficientResult(scopeLabel, minSample, refYears.length);
  if (typeof subjectYear !== "number") return missingSubjectResult(scopeLabel, refYears.length);

  const med = Math.round(median(refYears));
  const diff = subjectYear - med;

  let label: string;
  if (Math.abs(diff) <= 4) {
    label = `Built around the same time as the ${scopeLabel} median (${med})`;
  } else if (diff <= -20) {
    label = `Much older than most homes in ${scopeLabel} (median year built: ${med})`;
  } else if (diff < 0) {
    label = `Older than most homes in ${scopeLabel} (median year built: ${med})`;
  } else if (diff >= 20) {
    label = `Much newer than most homes in ${scopeLabel} (median year built: ${med})`;
  } else {
    label = `Newer than most homes in ${scopeLabel} (median year built: ${med})`;
  }

  return { label, referenceValue: med, referenceLabel: `${scopeLabel} median year built`, sampleSize: refYears.length, insufficient: false };
}

export function comparePermits(
  subjectCount: number | null | undefined,
  referenceFeatures: ParcelFeature[],
  scope: ComparisonScope,
  scopeLabel: string
): SingleComparison {
  const minSample = COMPARISON_THRESHOLDS[scope];
  const refCounts = referenceFeatures.map(f => f.properties.permit_count ?? 0);

  if (refCounts.length < minSample) return insufficientResult(scopeLabel, minSample, refCounts.length);

  const subject = subjectCount ?? 0;
  const avg = parseFloat(average(refCounts).toFixed(1));
  const ratio = avg === 0 ? 0 : (subject - avg) / avg;

  let label: string;
  if (Math.abs(ratio) < 0.2 || (avg < 0.5 && subject <= 1)) {
    label = `Similar permit activity to the ${scopeLabel} average (avg: ${avg.toFixed(1)})`;
  } else if (ratio > 0.8) {
    label = `Much more permit activity than the ${scopeLabel} average (avg: ${avg.toFixed(1)})`;
  } else if (ratio > 0) {
    label = `More permit activity than the ${scopeLabel} average (avg: ${avg.toFixed(1)})`;
  } else if (ratio < -0.6) {
    label = `Much less permit activity than the ${scopeLabel} average (avg: ${avg.toFixed(1)})`;
  } else {
    label = `Less permit activity than the ${scopeLabel} average (avg: ${avg.toFixed(1)})`;
  }

  return { label, referenceValue: avg, referenceLabel: `${scopeLabel} average permits`, sampleSize: refCounts.length, insufficient: false };
}

export function compareSales(
  subjectCount: number | null | undefined,
  referenceFeatures: ParcelFeature[],
  scope: ComparisonScope,
  scopeLabel: string
): SingleComparison {
  const minSample = COMPARISON_THRESHOLDS[scope];
  const refCounts = referenceFeatures.map(f => f.properties.sale_count ?? 0);

  if (refCounts.length < minSample) return insufficientResult(scopeLabel, minSample, refCounts.length);

  const subject = subjectCount ?? 0;
  const avg = parseFloat(average(refCounts).toFixed(1));
  const ratio = avg === 0 ? 0 : (subject - avg) / avg;

  let label: string;
  if (Math.abs(ratio) < 0.25 || (avg < 0.5 && subject <= 1)) {
    label = `Similar sales activity to the ${scopeLabel} average (avg: ${avg.toFixed(1)})`;
  } else if (ratio > 0.8) {
    label = `Much more sales activity than the ${scopeLabel} average (avg: ${avg.toFixed(1)})`;
  } else if (ratio > 0) {
    label = `More sales activity than the ${scopeLabel} average (avg: ${avg.toFixed(1)})`;
  } else if (ratio < -0.6) {
    label = `Much less sales activity than the ${scopeLabel} average (avg: ${avg.toFixed(1)})`;
  } else {
    label = `Less sales activity than the ${scopeLabel} average (avg: ${avg.toFixed(1)})`;
  }

  return { label, referenceValue: avg, referenceLabel: `${scopeLabel} average sales`, sampleSize: refCounts.length, insufficient: false };
}

export function compareAssessedValue(
  subjectValue: number | null | undefined,
  referenceFeatures: ParcelFeature[],
  scope: ComparisonScope,
  scopeLabel: string
): SingleComparison {
  const minSample = COMPARISON_THRESHOLDS[scope];
  const refValues = referenceFeatures
    .map(f => f.properties.latest_assessed_total)
    .filter((v): v is number => typeof v === "number" && v > 0);

  if (refValues.length < minSample) return insufficientResult(scopeLabel, minSample, refValues.length);
  if (typeof subjectValue !== "number" || subjectValue <= 0) {
    return { label: "Assessment data is not available for this property", referenceValue: null, referenceLabel: "", sampleSize: refValues.length, insufficient: true };
  }

  const med = Math.round(median(refValues));
  const ratio = (subjectValue - med) / med;

  const fmtK = (v: number) => `$${Math.round(v / 1000)}k`;

  let label: string;
  if (Math.abs(ratio) < 0.1) {
    label = `Assessed value is similar to the ${scopeLabel} median (${fmtK(med)})`;
  } else if (ratio > 0.4) {
    label = `Assessed much higher than the ${scopeLabel} median (${fmtK(med)})`;
  } else if (ratio > 0) {
    label = `Assessed higher than the ${scopeLabel} median (${fmtK(med)})`;
  } else if (ratio < -0.4) {
    label = `Assessed much lower than the ${scopeLabel} median (${fmtK(med)})`;
  } else {
    label = `Assessed lower than the ${scopeLabel} median (${fmtK(med)})`;
  }

  return { label, referenceValue: med, referenceLabel: `${scopeLabel} median assessed value`, sampleSize: refValues.length, insufficient: false };
}

export function computePropertyComparisons(
  parcel: ParcelFeature,
  blockParcels: ParcelFeature[],
  neighborhoodParcels: ParcelFeature[],
  allParcels: ParcelFeature[]
): PropertyComparisons {
  const p = parcel.properties;
  const pin = p.pin_normalized || p.pin_original;

  const exclude = (features: ParcelFeature[]) =>
    pin ? features.filter(f => (f.properties.pin_normalized || f.properties.pin_original) !== pin) : features;

  const blockRef = exclude(blockParcels);
  const neighRef = exclude(neighborhoodParcels);
  const cityRef = exclude(allParcels);

  return {
    yearBuilt: {
      block: compareYearBuilt(p.year_built, blockRef, "block", "this block"),
      neighborhood: compareYearBuilt(p.year_built, neighRef, "neighborhood", "this neighborhood"),
      city: compareYearBuilt(p.year_built, cityRef, "city", "Park Ridge")
    },
    permits: {
      block: comparePermits(p.permit_count, blockRef, "block", "this block"),
      neighborhood: comparePermits(p.permit_count, neighRef, "neighborhood", "this neighborhood"),
      city: comparePermits(p.permit_count, cityRef, "city", "Park Ridge")
    },
    sales: {
      block: compareSales(p.sale_count, blockRef, "block", "this block"),
      neighborhood: compareSales(p.sale_count, neighRef, "neighborhood", "this neighborhood"),
      city: compareSales(p.sale_count, cityRef, "city", "Park Ridge")
    },
    assessedValue: {
      block: compareAssessedValue(p.latest_assessed_total, blockRef, "block", "this block"),
      neighborhood: compareAssessedValue(p.latest_assessed_total, neighRef, "neighborhood", "this neighborhood"),
      city: compareAssessedValue(p.latest_assessed_total, cityRef, "city", "Park Ridge")
    }
  };
}
