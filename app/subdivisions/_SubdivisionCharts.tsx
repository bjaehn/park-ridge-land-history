"use client";
import { useState, useEffect } from "react";
import { SubdivisionPlatChart } from "@/components/ui/SubdivisionPlatChart";
import { SubdivisionBuildGapChart } from "@/components/ui/SubdivisionBuildGapChart";
import { LoadingSkeleton } from "@/components/ui/EmptyState";
import { SubdivisionIcon, TimelineIcon } from "@/lib/icons";
import {
  fetchSubdivisionPlatByDecade,
  fetchSubdivisionBuildGap,
} from "@/lib/supabase/subdivisionQueries";

type PlatRow = { decade: number; platCount: number };
type GapRow = {
  name: string;
  recordedYear: number;
  earliestBuilt: number;
  gapYears: number;
  lotCount: number;
};

export function SubdivisionCharts() {
  const [platData, setPlatData] = useState<PlatRow[]>([]);
  const [gapData, setGapData] = useState<GapRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchSubdivisionPlatByDecade(), fetchSubdivisionBuildGap()])
      .then(([plats, gaps]) => {
        setPlatData(plats);
        setGapData(gaps);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton rows={2} />;
  if (platData.length === 0 && gapData.length === 0) return null;

  return (
    <div className="space-y-10 mb-10">
      {platData.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <SubdivisionIcon
              size={14}
              strokeWidth={1.8}
              className="text-text-muted"
              aria-hidden="true"
            />
            <h2 className="section-heading !mb-0">Plats recorded by decade</h2>
          </div>
          <p className="text-sm text-text-muted mb-4">
            How many new subdivision plats were recorded at the Cook County Recorder each decade.
          </p>
          <SubdivisionPlatChart data={platData} />
        </section>
      )}
      {gapData.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <TimelineIcon
              size={14}
              strokeWidth={1.8}
              className="text-text-muted"
              aria-hidden="true"
            />
            <h2 className="section-heading !mb-0">
              Longest wait: plat to first home built
            </h2>
          </div>
          <p className="text-sm text-text-muted mb-4">
            Top 15 subdivisions by gap between when the plat was recorded and when the first home was built. Longer gaps often reflect the Depression or WWII stalling development.
          </p>
          <SubdivisionBuildGapChart data={gapData} />
        </section>
      )}
    </div>
  );
}
