"use client";

import { useState, useEffect } from "react";
import { MarketHistoryChart } from "./MarketHistoryChart";
import { AssessmentTrendChart } from "./AssessmentTrendChart";
import { AppealsChart } from "./AppealsChart";
import { PermitActivityChart } from "./PermitActivityChart";
import { SaleIcon, AssessmentIcon, ComparisonIcon, PermitIcon } from "@/lib/icons";
import type { MarketHistoryRow, AssessmentTrendRow, AppealsRow, PermitActivityRow } from "@/lib/supabase/cityQueries";

export function CityTrendCharts() {
  const [marketHistory, setMarketHistory] = useState<MarketHistoryRow[]>([]);
  const [assessmentTrend, setAssessmentTrend] = useState<AssessmentTrendRow[]>([]);
  const [appealsByYear, setAppealsByYear] = useState<AppealsRow[]>([]);
  const [permitActivity, setPermitActivity] = useState<PermitActivityRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      import("@/lib/supabase/cityQueries").then((m) => m.fetchMarketHistory()),
      import("@/lib/supabase/cityQueries").then((m) => m.fetchAssessmentTrend()),
      import("@/lib/supabase/cityQueries").then((m) => m.fetchAppealsByYear()),
      import("@/lib/supabase/cityQueries").then((m) => m.fetchPermitActivity()),
    ])
      .then(([mh, at, ay, pa]) => {
        setMarketHistory(mh);
        setAssessmentTrend(at);
        setAppealsByYear(ay);
        setPermitActivity(pa);
        setLoaded(true);
      })
      .catch(() => null);
  }, []);

  if (!loaded) return null;

  return (
    <div className="space-y-10">
      <section>
        <div className="flex items-center gap-2 mb-3">
          <SaleIcon size={14} strokeWidth={1.8} className="text-text-muted" aria-hidden="true" />
          <p className="section-heading !mb-0">Park Ridge home sales, 2000 to 2025</p>
        </div>
        <p className="text-sm text-text-muted mb-4">
          Bars show annual sales volume. Line shows median sale price. Market sales only, $50K to $5M.
        </p>
        <div className="-mx-[clamp(1rem,4vw,3rem)]">
          <MarketHistoryChart data={marketHistory} />
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <AssessmentIcon size={14} strokeWidth={1.8} className="text-text-muted" aria-hidden="true" />
          <p className="section-heading !mb-0">Average assessed value, 1999 to 2025</p>
        </div>
        <p className="text-sm text-text-muted mb-4">
          Certified totals from Cook County. Dashed lines mark triennial reassessment years.
        </p>
        <div className="-mx-[clamp(1rem,4vw,3rem)]">
          <AssessmentTrendChart data={assessmentTrend} />
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <ComparisonIcon size={14} strokeWidth={1.8} className="text-text-muted" aria-hidden="true" />
          <p className="section-heading !mb-0">Assessment appeals filed by year</p>
        </div>
        <p className="text-sm text-text-muted mb-4">
          Spikes follow reassessment years as residents push back on new valuations.
        </p>
        <AppealsChart data={appealsByYear} />
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <PermitIcon size={14} strokeWidth={1.8} className="text-text-muted" aria-hidden="true" />
          <p className="section-heading !mb-0">Building permits, 2019 to 2026</p>
        </div>
        <p className="text-sm text-text-muted mb-4">
          Residential permits in purple, commercial in slate. The 2020 to 2021 renovation surge is visible.
        </p>
        <PermitActivityChart data={permitActivity} />
      </section>
    </div>
  );
}
