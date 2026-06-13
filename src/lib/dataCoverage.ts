import type { ParcelCollection } from "./parcelTypes";

export type DataCoverageStats = {
  total: number;
  yearBuiltKnown: number;
  yearBuiltPct: number;
  permitsAny: number;
  permitsPct: number;
  salesAny: number;
  salesPct: number;
  assessedAny: number;
  assessedPct: number;
  historicSurveyAny: number;
  historicSurveyPct: number;
};

const empty: DataCoverageStats = {
  total: 0,
  yearBuiltKnown: 0,
  yearBuiltPct: 0,
  permitsAny: 0,
  permitsPct: 0,
  salesAny: 0,
  salesPct: 0,
  assessedAny: 0,
  assessedPct: 0,
  historicSurveyAny: 0,
  historicSurveyPct: 0
};

export function computeDataCoverage(parcels: ParcelCollection | null): DataCoverageStats {
  const features = parcels?.features ?? [];
  const total = features.length;
  if (total === 0) return empty;

  const pct = (n: number) => Math.round((n / total) * 100);

  const yearBuiltKnown = features.filter(f => typeof f.properties.year_built === "number").length;
  const permitsAny = features.filter(f => (f.properties.permit_count ?? 0) > 0).length;
  const salesAny = features.filter(f => (f.properties.sale_count ?? 0) > 0).length;
  const assessedAny = features.filter(
    f => typeof f.properties.latest_assessed_total === "number" && f.properties.latest_assessed_total > 0
  ).length;
  const historicSurveyAny = features.filter(f => (f.properties.hargis_record_count ?? 0) > 0).length;

  return {
    total,
    yearBuiltKnown,
    yearBuiltPct: pct(yearBuiltKnown),
    permitsAny,
    permitsPct: pct(permitsAny),
    salesAny,
    salesPct: pct(salesAny),
    assessedAny,
    assessedPct: pct(assessedAny),
    historicSurveyAny,
    historicSurveyPct: pct(historicSurveyAny)
  };
}
