import type { Metadata } from "next";
import { fetchNeighborhoodSummaries, fetchAllNeighborhoodsBbox } from "@/lib/data/neighborhoods";
import { NeighborhoodTypeIndexPage } from "@/components/NeighborhoodTypeIndexPage";
import type { NeighborhoodType } from "@/lib/data/neighborhoods";
import { PlanningDistrictIcon } from "@/lib/icons";

export const metadata: Metadata = {
  title: "Planning Districts",
  description:
    "Park Ridge's official planning neighborhoods, sorted by first built year, with a map of every district's boundary.",
};

const NEIGHBORHOOD_TYPES: NeighborhoodType[] = ["official_planning"];

export default async function PlanningDistrictsPage() {
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
      breadcrumbLabel="Planning Districts"
      title="Official Planning Districts"
      subtitle="Park Ridge's official planning neighborhoods, each with its own construction history."
      summaries={summaries}
      bbox={bbox}
      siblingLinks={[
        { label: "Neighborhoods", href: "/neighborhoods" },
        { label: "Business Districts", href: "/business-districts" },
      ]}
      icon={<PlanningDistrictIcon size={22} strokeWidth={1.5} className="text-text-muted mt-1 shrink-0" aria-hidden="true" />}
    />
  );
}
