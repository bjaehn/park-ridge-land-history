"use client";

import { SubdivisionBuildGapChart } from "@/components/ui/SubdivisionBuildGapChart";
import { TimelineIcon } from "@/lib/icons";

type GapRow = {
  name: string;
  recordedYear: number;
  earliestBuilt: number;
  gapYears: number;
  lotCount: number;
};

type Props = {
  gapData: GapRow[];
};

export function SubdivisionCharts({ gapData }: Props) {
  if (gapData.length === 0) return null;

  return (
    <div className="mb-10">
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
          Top 15 subdivisions by gap between when the plat was recorded and when the first home
          was built. Longer gaps often reflect the Depression or World War II stalling
          development.
        </p>
        <SubdivisionBuildGapChart data={gapData} />
      </section>
    </div>
  );
}
