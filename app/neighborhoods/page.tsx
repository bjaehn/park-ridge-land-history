import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { InlineSourceNote } from "@/components/ui/SourceNote";
import { NEIGHBORHOOD_BOUNDARY_DISCLAIMER } from "@/lib/content";
import { NeighborhoodTypeOverview } from "@/components/NeighborhoodTypeIndexPage";
import { NeighborhoodCharts } from "@/components/ui/NeighborhoodCharts";
import { fetchNeighborhoodSummaries, fetchAllNeighborhoodsBbox } from "@/lib/data/neighborhoods";
import type { NeighborhoodType } from "@/lib/data/neighborhoods";

export const metadata: Metadata = {
  title: "Neighborhoods",
  description: "Park Ridge's corridor districts and local/informal neighborhood names.",
};

// Official Planning Neighborhoods and Business Districts have their own
// dedicated pages (/planning-districts, /business-districts) -- not shown
// here.
const NEIGHBORHOOD_TYPES: NeighborhoodType[] = ["corridor", "local_market"];

export default async function NeighborhoodsPage() {
  const [all, bbox] = await Promise.all([
    fetchNeighborhoodSummaries().catch(() => []),
    fetchAllNeighborhoodsBbox().catch(() => null),
  ]);
  const summaries = all.filter(
    (n) => n.neighborhoodType && NEIGHBORHOOD_TYPES.includes(n.neighborhoodType)
  );

  return (
    <div className="page-shell">
      <Breadcrumb
        items={[
          { label: "Park Ridge", href: "/city" },
          { label: "Neighborhoods", current: true },
        ]}
      />
      <PageHeader
        eyebrow="Park Ridge"
        title="Neighborhoods"
        subtitle="Park Ridge's corridor districts and local, informal names. Looking for official planning neighborhoods or business districts? Those have their own pages."
      />
      <p className="text-sm text-text-secondary mb-8 -mt-6">
        See{" "}
        <Link href="/planning-districts" className="text-text-link hover:underline">
          Planning Districts
        </Link>{" "}
        or{" "}
        <Link href="/business-districts" className="text-text-link hover:underline">
          Business Districts
        </Link>
        .
      </p>
      <div className="mb-10">
        <NeighborhoodCharts />
      </div>
      <NeighborhoodTypeOverview
        neighborhoodTypes={NEIGHBORHOOD_TYPES}
        summaries={summaries}
        bbox={bbox}
      />
      <InlineSourceNote>{NEIGHBORHOOD_BOUNDARY_DISCLAIMER}</InlineSourceNote>
    </div>
  );
}
