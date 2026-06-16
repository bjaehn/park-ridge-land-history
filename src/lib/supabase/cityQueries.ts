import { supabase } from "./client";

export type MarketHistoryRow = { saleYear: number; saleCount: number; medianPrice: number };
export type AssessmentTrendRow = { assessmentYear: number; avgTotal: number };
export type AppealsRow = { appealYear: number; appealCount: number };
export type PermitActivityRow = { permitYear: number; residentialCount: number; commercialCount: number };

export async function fetchMarketHistory(): Promise<MarketHistoryRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("city_market_history");
  if (error || !data) return [];
  return (data as Array<{ sale_year: number; sale_count: number; median_price: number }>).map((r) => ({
    saleYear: r.sale_year,
    saleCount: r.sale_count,
    medianPrice: r.median_price,
  }));
}

export async function fetchAssessmentTrend(): Promise<AssessmentTrendRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("city_assessment_trend");
  if (error || !data) return [];
  return (data as Array<{ assessment_year: number; avg_total: number }>).map((r) => ({
    assessmentYear: r.assessment_year,
    avgTotal: r.avg_total,
  }));
}

export async function fetchAppealsByYear(): Promise<AppealsRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("city_appeals_by_year");
  if (error || !data) return [];
  return (data as Array<{ appeal_year: number; appeal_count: number }>).map((r) => ({
    appealYear: r.appeal_year,
    appealCount: r.appeal_count,
  }));
}

export async function fetchPermitActivity(): Promise<PermitActivityRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("city_permit_activity");
  if (error || !data) return [];
  return (data as Array<{ permit_year: number; residential_count: number; commercial_count: number }>).map((r) => ({
    permitYear: r.permit_year,
    residentialCount: r.residential_count,
    commercialCount: r.commercial_count,
  }));
}
