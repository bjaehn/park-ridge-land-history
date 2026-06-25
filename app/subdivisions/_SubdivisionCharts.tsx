"use client";

import { SubdivisionPlatChart } from "@/components/ui/SubdivisionPlatChart";
import { SubdivisionBuildGapChart } from "@/components/ui/SubdivisionBuildGapChart";
import { SubdivisionIcon, TimelineIcon } from "@/lib/icons";

type PlatRow = { decade: number; platCount: number };
type GapRow = {
  name: string;
  recordedYear: number;
  earliestBuilt: number;
  gapYears: number;
  lotCount: number;
};

type Props = {
  platData: PlatRow[];
  gapData: GapRow[];
};

export function SubdivisionCharts({ platData, gapData }: Props) {
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
            Top 15 subdivisions by gap between when the plat was recorded and when the first home
            was built. Longer gaps often reflect the Depression or World War II stalling
            development.
          </p>
          <SubdivisionBuildGapChart data={gapData} />
        </section>
      )}
    </div>
  );
}
