import type { Metadata } from "next";
import { NeighborhoodTypeIndexPage } from "@/components/NeighborhoodTypeIndexPage";
import { fetchNeighborhoodSummaries, fetchAllNeighborhoodsBbox } from "@/lib/data/neighborhoods";
import type { NeighborhoodType } from "@/lib/data/neighborhoods";
import { NeighborhoodIcon } from "@/lib/icons";

export const metadata: Metadata = {
  title: "Neighborhoods",
  description: "Park Ridge's corridor districts and local/informal neighborhood names.",
  alternates: { canonical: "/neighborhoods" },
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
    <NeighborhoodTypeIndexPage
      neighborhoodTypes={NEIGHBORHOOD_TYPES}
      breadcrumbLabel="Neighborhoods"
      title="Neighborhoods"
      subtitle="Park Ridge's corridor districts and local, informal names, each with its own construction history."
      summaries={summaries}
      bbox={bbox}
      siblingLinks={[
        { label: "Planning Districts", href: "/planning-districts" },
        { label: "Business Districts", href: "/business-districts" },
      ]}
      icon={<NeighborhoodIcon size={22} strokeWidth={1.5} className="text-text-muted mt-1 shrink-0" aria-hidden="true" />}
    />
  );
}
