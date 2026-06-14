import type { ParcelFeature } from "./parcelTypes";
import { formatCurrency } from "./formatters";

export type RankedItem = {
  rank: number;
  pin: string;
  address: string;
  primaryValue: string;
  secondaryValue?: string;
  metric: number | null;
};

export type RankedInsightList = {
  title: string;
  description: string;
  sourceNote: string;
  items: RankedItem[];
  emptyText: string;
};

function getPin(f: ParcelFeature): string {
  return f.properties.pin_normalized ?? f.properties.pin_original ?? "";
}

function getAddress(f: ParcelFeature): string {
  return f.properties.address ?? "Unknown address";
}

export function computeTopPermitted(parcels: ParcelFeature[], limit = 10): RankedInsightList {
  const items = parcels
    .filter((f) => typeof f.properties.permit_count === "number" && f.properties.permit_count > 0)
    .sort((a, b) => (b.properties.permit_count ?? 0) - (a.properties.permit_count ?? 0))
    .slice(0, limit)
    .map((f, i) => ({
      rank: i + 1,
      pin: getPin(f),
      address: getAddress(f),
      primaryValue: `${f.properties.permit_count?.toLocaleString()} permits`,
      secondaryValue: f.properties.latest_permit_year
        ? `Latest: ${f.properties.latest_permit_year}`
        : undefined,
      metric: f.properties.permit_count ?? null,
    }));

  return {
    title: "Top 10 Most Permitted",
    description:
      "Properties with the most building permit records on file. High permit counts can reflect renovations, additions, or active reinvestment over many years.",
    sourceNote: "Source: Cook County building permit records. Older permits may be missing.",
    items,
    emptyText: "No permit data is available in the current dataset.",
  };
}

export function computeTopOldest(parcels: ParcelFeature[], limit = 10): RankedInsightList {
  const items = parcels
    .filter(
      (f) =>
        typeof f.properties.year_built === "number" &&
        f.properties.year_built >= 1800 &&
        f.properties.year_built <= 2026
    )
    .sort((a, b) => (a.properties.year_built ?? 9999) - (b.properties.year_built ?? 9999))
    .slice(0, limit)
    .map((f, i) => ({
      rank: i + 1,
      pin: getPin(f),
      address: getAddress(f),
      primaryValue: `Built ${f.properties.year_built}`,
      secondaryValue: f.properties.decade_built
        ? `${f.properties.decade_built}s era`
        : undefined,
      metric: f.properties.year_built ?? null,
    }));

  return {
    title: "Top 10 Oldest Properties",
    description:
      "Properties with the earliest confirmed year built from assessor records. These are the oldest parts of Park Ridge's built fabric.",
    sourceNote:
      "Source: Cook County Assessor year-built field. May reflect the current structure, not the original construction.",
    items,
    emptyText: "No year-built data is available in the current dataset.",
  };
}

export function computeTopAssessedChange(
  parcels: ParcelFeature[],
  limit = 10
): RankedInsightList {
  const items = parcels
    .filter(
      (f) =>
        typeof f.properties.assessed_value_change_pct === "number" &&
        f.properties.assessed_value_change_pct > 0 &&
        typeof f.properties.first_assessed_total === "number" &&
        typeof f.properties.latest_assessed_total === "number"
    )
    .sort(
      (a, b) =>
        (b.properties.assessed_value_change_pct ?? 0) -
        (a.properties.assessed_value_change_pct ?? 0)
    )
    .slice(0, limit)
    .map((f, i) => {
      const pct = f.properties.assessed_value_change_pct ?? 0;
      const fromYear = f.properties.first_assessed_year;
      const toYear = f.properties.latest_assessed_year;
      const fromVal = f.properties.first_assessed_total;
      const toVal = f.properties.latest_assessed_total;
      let secondaryValue: string | undefined;
      if (fromYear && toYear && fromVal && toVal) {
        secondaryValue = `${formatCurrency(fromVal)} (${fromYear}) → ${formatCurrency(toVal)} (${toYear})`;
      } else if (fromYear && toYear) {
        secondaryValue = `${fromYear} → ${toYear}`;
      }
      return {
        rank: i + 1,
        pin: getPin(f),
        address: getAddress(f),
        primaryValue: `+${Math.round(pct)}% assessed value`,
        secondaryValue,
        metric: pct,
      };
    });

  return {
    title: "Top 10 Largest Assessed Value Changes",
    description:
      "Properties with the largest percentage increase in assessed value between their earliest and latest assessment records. Large increases can reflect renovations, new construction, or reassessment.",
    sourceNote:
      "Source: Cook County Assessor records. Assessed value is not the same as market value.",
    items,
    emptyText:
      "Not enough assessment history is available to compute assessed value changes.",
  };
}
