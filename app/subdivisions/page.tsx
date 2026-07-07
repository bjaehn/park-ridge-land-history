import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SourceNote } from "@/components/ui/SourceNote";
import {
  fetchSubdivisionIndex,
  fetchSubdivisionBuildGap,
} from "@/lib/supabase/subdivisionQueries";
import { SubdivisionsHero } from "./_SubdivisionsHero";
import { SubdivisionCharts } from "./_SubdivisionCharts";
import { SubdivisionsContent } from "./_SubdivisionsContent";
import { SubdivisionEraPriceCharts } from "./_SubdivisionEraPriceCharts";

export const metadata: Metadata = {
  title: "Subdivisions",
  description:
    "Recorded Park Ridge subdivision plats. Each plat names the developer, recording date, and lots created.",
};

export default async function SubdivisionsPage() {
  const [subdivisions, gapData] = await Promise.all([
    fetchSubdivisionIndex().catch(() => []),
    fetchSubdivisionBuildGap().catch(() => []),
  ]);

  return (
    <div className="page-shell max-w-none">
      <Breadcrumb
        items={[
          { label: "Park Ridge", href: "/city" },
          { label: "Subdivisions", current: true },
        ]}
      />

      <SubdivisionsHero totalCount={subdivisions.length} />

      <div className="mb-10">
        <SubdivisionEraPriceCharts subdivisions={subdivisions} />
      </div>

      <SubdivisionCharts gapData={gapData} />

      <SubdivisionsContent subdivisions={subdivisions} />

      <section className="mt-12 pt-8 border-t border-surface-border w-full">
        <h2 className="text-sm font-semibold text-text-secondary mb-3">
          About subdivision records
        </h2>
        <div className="space-y-2">
          <p className="text-sm text-text-muted leading-relaxed">
            Subdivision records come from the Cook County Recorder of Deeds plat index, the Cook
            County Assessor parcel database, and GIS lot layer matching. Recording dates and
            developer names are sourced from the plat index. Confidence is noted where dates or
            sources are uncertain.
          </p>
          <p className="text-sm text-text-muted leading-relaxed">
            Some records are inferred from deed language or assessor data and have not been verified
            against a recorded plat. Records marked as low confidence or unknown need additional
            source verification before they should be treated as official. Boundaries shown on
            detail pages are approximate unless noted as verified by an official GIS source.
          </p>
          <p className="text-sm text-text-muted leading-relaxed">
            <Link href="/sources" className="text-text-link hover:underline">
              Learn more about data sources and methodology.
            </Link>
          </p>
        </div>
      </section>

      <SourceNote
        sources={["recorder", "cookGis"]}
        note="Recording dates and developer names are sourced from the Cook County Recorder plat index. Confidence is noted where dates are uncertain."
      />
    </div>
  );
}
