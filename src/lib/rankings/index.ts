import type { ParcelFeature } from "../parcelTypes";

export type RankedProperty = {
  pin: string;
  address: string;
  value: number | string;
  valueLabel: string;
  secondaryLabel?: string;
  linkTo?: string;
};

function getPin(f: ParcelFeature): string | null {
  return f.properties.pin_normalized || f.properties.pin_original || null;
}

function makeEntry(f: ParcelFeature, value: number | string, valueLabel: string, secondaryLabel?: string): RankedProperty | null {
  const pin = getPin(f);
  if (!pin) return null;
  return {
    pin,
    address: f.properties.address || "Unknown Address",
    value,
    valueLabel,
    secondaryLabel,
  };
}

export function topMostSold(features: ParcelFeature[], limit = 10): RankedProperty[] {
  return features
    .filter((f) => (f.properties.sale_count ?? 0) > 0)
    .sort((a, b) => (b.properties.sale_count ?? 0) - (a.properties.sale_count ?? 0))
    .slice(0, limit)
    .flatMap((f) => {
      const entry = makeEntry(
        f,
        f.properties.sale_count ?? 0,
        `${f.properties.sale_count} sale${(f.properties.sale_count ?? 0) === 1 ? "" : "s"}`,
        f.properties.latest_sale_year ? `Last sold ${f.properties.latest_sale_year}` : undefined
      );
      return entry ? [entry] : [];
    });
}

export function topMostPermits(features: ParcelFeature[], limit = 10): RankedProperty[] {
  return features
    .filter((f) => (f.properties.permit_count ?? 0) > 0)
    .sort((a, b) => (b.properties.permit_count ?? 0) - (a.properties.permit_count ?? 0))
    .slice(0, limit)
    .flatMap((f) => {
      const entry = makeEntry(
        f,
        f.properties.permit_count ?? 0,
        `${f.properties.permit_count} permit${(f.properties.permit_count ?? 0) === 1 ? "" : "s"}`,
        f.properties.latest_permit_year ? `Last permit ${f.properties.latest_permit_year}` : undefined
      );
      return entry ? [entry] : [];
    });
}

export function topOldestHomes(features: ParcelFeature[], limit = 10): RankedProperty[] {
  return features
    .filter((f) => f.properties.year_built && f.properties.year_built >= 1800 && f.properties.year_built <= 1945)
    .sort((a, b) => (a.properties.year_built ?? 9999) - (b.properties.year_built ?? 9999))
    .slice(0, limit)
    .flatMap((f) => {
      const age = new Date().getFullYear() - (f.properties.year_built ?? 0);
      const entry = makeEntry(
        f,
        f.properties.year_built ?? 0,
        `Built ${f.properties.year_built}`,
        `${age} years old`
      );
      return entry ? [entry] : [];
    });
}

export function topNewestHomes(features: ParcelFeature[], limit = 10): RankedProperty[] {
  const currentYear = new Date().getFullYear();
  return features
    .filter((f) => f.properties.year_built && f.properties.year_built >= 2000 && f.properties.year_built <= currentYear)
    .sort((a, b) => (b.properties.year_built ?? 0) - (a.properties.year_built ?? 0))
    .slice(0, limit)
    .flatMap((f) => {
      const entry = makeEntry(
        f,
        f.properties.year_built ?? 0,
        `Built ${f.properties.year_built}`,
        `${currentYear - (f.properties.year_built ?? currentYear)} years old`
      );
      return entry ? [entry] : [];
    });
}

export function topLargestAssessmentChange(features: ParcelFeature[], limit = 10): RankedProperty[] {
  return features
    .filter((f) => f.properties.assessed_value_change_pct != null && Math.abs(f.properties.assessed_value_change_pct ?? 0) > 0)
    .sort((a, b) => Math.abs(b.properties.assessed_value_change_pct ?? 0) - Math.abs(a.properties.assessed_value_change_pct ?? 0))
    .slice(0, limit)
    .flatMap((f) => {
      const pct = f.properties.assessed_value_change_pct ?? 0;
      const sign = pct > 0 ? "+" : "";
      const entry = makeEntry(
        f,
        pct,
        `${sign}${pct.toFixed(1)}% assessment change`,
        f.properties.first_assessed_year && f.properties.latest_assessed_year
          ? `${f.properties.first_assessed_year}–${f.properties.latest_assessed_year}`
          : undefined
      );
      return entry ? [entry] : [];
    });
}

export function topLargestSalePriceChange(features: ParcelFeature[], limit = 10): RankedProperty[] {
  return features
    .filter((f) => f.properties.max_sale_price != null && (f.properties.max_sale_price ?? 0) > 0 && (f.properties.sale_count ?? 0) > 1)
    .sort((a, b) => (b.properties.max_sale_price ?? 0) - (a.properties.max_sale_price ?? 0))
    .slice(0, limit)
    .flatMap((f) => {
      const entry = makeEntry(
        f,
        f.properties.max_sale_price ?? 0,
        `$${((f.properties.max_sale_price ?? 0) / 1000).toFixed(0)}k peak price`,
        f.properties.sale_count ? `${f.properties.sale_count} recorded sales` : undefined
      );
      return entry ? [entry] : [];
    });
}

export function topHighestAssessment(features: ParcelFeature[], limit = 10): RankedProperty[] {
  return features
    .filter((f) => (f.properties.latest_assessed_total ?? 0) > 0)
    .sort((a, b) => (b.properties.latest_assessed_total ?? 0) - (a.properties.latest_assessed_total ?? 0))
    .slice(0, limit)
    .flatMap((f) => {
      const val = f.properties.latest_assessed_total ?? 0;
      const entry = makeEntry(
        f,
        val,
        `$${(val / 1000).toFixed(0)}k assessed`,
        f.properties.latest_assessed_year ? `As of ${f.properties.latest_assessed_year}` : undefined
      );
      return entry ? [entry] : [];
    });
}

function redevelopmentScore(f: ParcelFeature): number {
  const pp = f.properties.permit_pressure_type;
  let score = 0;
  if (pp === "direct_teardown") score += 20;
  else if (pp === "new_construction") score += 15;
  else if (pp === "addition") score += 8;
  else if (pp === "remodel") score += 5;
  else if (pp === "recent_permit") score += 3;
  score += Math.min(f.properties.permit_count ?? 0, 10);
  score += Math.min(f.properties.sale_count ?? 0, 5) * 0.5;
  if ((f.properties.nearby_teardown_count ?? 0) > 0) score += 5;
  return score;
}

const PRESSURE_LABELS: Record<string, string> = {
  direct_teardown: "Teardown signal",
  new_construction: "New construction",
  addition: "Expansion signal",
  remodel: "Remodel signal",
  recent_permit: "Recent permit",
  nearby_teardown: "Nearby teardown",
  none: "Low signal",
};

export function topMostRedevelopment(features: ParcelFeature[], limit = 10): RankedProperty[] {
  return features
    .filter((f) => redevelopmentScore(f) > 0)
    .sort((a, b) => redevelopmentScore(b) - redevelopmentScore(a))
    .slice(0, limit)
    .flatMap((f) => {
      const pp = f.properties.permit_pressure_type ?? "none";
      const label = PRESSURE_LABELS[pp] ?? pp.replace(/_/g, " ");
      const entry = makeEntry(
        f,
        redevelopmentScore(f),
        label,
        `${f.properties.permit_count ?? 0} permits · ${f.properties.sale_count ?? 0} sales`
      );
      return entry ? [entry] : [];
    });
}
