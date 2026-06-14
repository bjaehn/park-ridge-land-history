import type { ParcelProperties } from "./parcelTypes";

export type ConfidenceLevel = "high" | "medium" | "limited";

export type PropertyConfidence = {
  level: ConfidenceLevel;
  label: string;
  explanation: string;
  recordCategories: string[];
  hasYearBuilt: boolean;
};

export function computePropertyConfidence(properties: ParcelProperties): PropertyConfidence {
  const hasYearBuilt = typeof properties.year_built === "number";
  const recordCategories: string[] = [];

  if ((properties.sale_count ?? 0) > 0) recordCategories.push("sales");
  if ((properties.permit_count ?? 0) > 0) recordCategories.push("permits");
  if (properties.latest_assessed_year) recordCategories.push("assessments");
  if ((properties.hargis_record_count ?? 0) > 0) recordCategories.push("historic survey");
  if ((properties.civic_record_count ?? 0) > 0) recordCategories.push("civic records");

  let level: ConfidenceLevel;
  if (hasYearBuilt && recordCategories.length >= 2) {
    level = "high";
  } else if (hasYearBuilt && recordCategories.length >= 1) {
    level = "medium";
  } else {
    level = "limited";
  }

  const explanations: Record<ConfidenceLevel, string> = {
    high: "Year built is on record and multiple record types are available.",
    medium: "Year built is on record with at least one other record type.",
    limited: "Records are sparse or year built is not confirmed."
  };

  const labels: Record<ConfidenceLevel, string> = {
    high: "High",
    medium: "Medium",
    limited: "Limited"
  };

  return {
    level,
    label: labels[level],
    explanation: explanations[level],
    recordCategories,
    hasYearBuilt
  };
}
