"use client";

import { useState, useEffect } from "react";
import { MarketHistoryChart } from "./MarketHistoryChart";
import { AssessmentTrendChart } from "./AssessmentTrendChart";
import { AppealsChart } from "./AppealsChart";
import { PermitActivityChart } from "./PermitActivityChart";
import { SaleIcon, AssessmentIcon, ComparisonIcon, PermitIcon } from "@/lib/icons";
import { supabase } from "@/lib/supabase/client";
import type { MarketHistoryRow, AssessmentTrendRow, AppealsRow, PermitActivityRow } from "@/lib/supabase/cityQueries";

type Props = { prefix: string; levelLabel: string };

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function PinScopedCharts({ prefix, levelLabel }: Props) {
  const [marketHistory, setMarketHistory] = useState<MarketHistoryRow[]>([]);
  const [assessmentTrend, setAssessmentTrend] = useState<AssessmentTrendRow[]>([]);
  const [appealsByYear, setAppealsByYear] = useState<AppealsRow[]>([]);
  const [permitActivity, setPermitActivity] = useState<PermitActivityRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!supabase || !prefix) { setLoaded(true); return; }

    const db = supabase;
    const pattern = `${prefix}%`;

    const fetchAll = async () => {
      // Sales by year
      const { data: salesData } = await db
        .from("sales")
        .select("sale_year, sale_price")
        .ilike("pin", pattern)
        .eq("is_market_sale", true)
        .gte("sale_price", 50000)
        .lte("sale_price", 5000000)
        .not("sale_year", "is", null);

      if (salesData?.length) {
        const byYear = new Map<number, number[]>();
        (salesData as Array<{ sale_year: number; sale_price: number }>).forEach((r) => {
          const arr = byYear.get(r.sale_year) ?? [];
          arr.push(r.sale_price);
          byYear.set(r.sale_year, arr);
        });
        setMarketHistory(
          Array.from(byYear.entries())
            .sort(([a], [b]) => a - b)
            .map(([yr, prices]) => ({ saleYear: yr, saleCount: prices.length, medianPrice: Math.round(median(prices)) }))
        );
      }

      // Assessments by year (try pin_normalized column)
      try {
        const { data: assessData } = await db
          .from("assessments")
          .select("assessment_year, certified_total")
          .ilike("pin_normalized", pattern)
          .gt("certified_total", 1000)
          .not("assessment_year", "is", null);

        if (assessData?.length) {
          const byYear = new Map<number, number[]>();
          (assessData as Array<{ assessment_year: number; certified_total: number }>).forEach((r) => {
            const arr = byYear.get(r.assessment_year) ?? [];
            arr.push(r.certified_total);
            byYear.set(r.assessment_year, arr);
          });
          setAssessmentTrend(
            Array.from(byYear.entries())
              .sort(([a], [b]) => a - b)
              .map(([yr, vals]) => ({ assessmentYear: yr, avgTotal: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) }))
          );
        }
      } catch { /* assessments table column may differ */ }

      // Appeals by year
      try {
        const { data: appealData } = await db
          .from("appeals")
          .select("appeal_year")
          .ilike("pin_normalized", pattern)
          .not("appeal_year", "is", null);

        if (appealData?.length) {
          const byYear = new Map<number, number>();
          (appealData as Array<{ appeal_year: number }>).forEach((r) => {
            byYear.set(r.appeal_year, (byYear.get(r.appeal_year) ?? 0) + 1);
          });
          setAppealsByYear(
            Array.from(byYear.entries())
              .sort(([a], [b]) => a - b)
              .map(([yr, count]) => ({ appealYear: yr, appealCount: count }))
          );
        }
      } catch { /* appeals may not be accessible via public client */ }

      // Permits by year
      const { data: permitData } = await db
        .from("permits")
        .select("date_issued, permit_type")
        .ilike("pin", pattern)
        .not("date_issued", "is", null);

      if (permitData?.length) {
        const byYear = new Map<number, { res: number; com: number }>();
        (permitData as Array<{ date_issued: string; permit_type: string | null }>).forEach((r) => {
          const yr = new Date(r.date_issued).getFullYear();
          const counts = byYear.get(yr) ?? { res: 0, com: 0 };
          if (r.permit_type === "RESIDENTIAL PERMIT") counts.res += 1;
          else if (r.permit_type === "COMMERCIAL PERMIT") counts.com += 1;
          byYear.set(yr, counts);
        });
        setPermitActivity(
          Array.from(byYear.entries())
            .sort(([a], [b]) => a - b)
            .map(([yr, c]) => ({ permitYear: yr, residentialCount: c.res, commercialCount: c.com }))
        );
      }
    };

    fetchAll().catch(() => null).finally(() => setLoaded(true));
  }, [prefix]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!loaded) return null;

  const hasAny = marketHistory.length > 0 || assessmentTrend.length > 0 || appealsByYear.length > 0 || permitActivity.length > 0;
  if (!hasAny) return null;

  const scopeLabel = levelLabel.toLowerCase();

  return (
    <div className="space-y-10">
      {marketHistory.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <SaleIcon size={14} strokeWidth={1.8} className="text-text-muted" aria-hidden="true" />
            <h2 className="section-heading !mb-0">Home sales on this {scopeLabel}</h2>
          </div>
          <p className="text-sm text-text-muted mb-4">
            Bars show annual sales volume. Line shows median sale price. Market sales only, $50K to $5M.
          </p>
          <div className="-mx-[clamp(1rem,4vw,3rem)]">
            <MarketHistoryChart data={marketHistory} />
          </div>
        </section>
      )}

      {assessmentTrend.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <AssessmentIcon size={14} strokeWidth={1.8} className="text-text-muted" aria-hidden="true" />
            <h2 className="section-heading !mb-0">Average assessed value by year</h2>
          </div>
          <p className="text-sm text-text-muted mb-4">
            Certified totals from Cook County for this {scopeLabel}. Dashed lines mark triennial reassessment years.
          </p>
          <div className="-mx-[clamp(1rem,4vw,3rem)]">
            <AssessmentTrendChart data={assessmentTrend} />
          </div>
        </section>
      )}

      {appealsByYear.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ComparisonIcon size={14} strokeWidth={1.8} className="text-text-muted" aria-hidden="true" />
            <h2 className="section-heading !mb-0">Assessment appeals filed by year</h2>
          </div>
          <AppealsChart data={appealsByYear} />
        </section>
      )}

      {permitActivity.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <PermitIcon size={14} strokeWidth={1.8} className="text-text-muted" aria-hidden="true" />
            <h2 className="section-heading !mb-0">Building permits by year</h2>
          </div>
          <p className="text-sm text-text-muted mb-4">
            Residential permits in purple, commercial in slate.
          </p>
          <PermitActivityChart data={permitActivity} />
        </section>
      )}
    </div>
  );
}
