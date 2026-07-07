import type { Metadata } from "next";
import { fetchNeighborhoodSummaries, fetchAllNeighborhoodsBbox } from "@/lib/data/neighborhoods";
import { NeighborhoodTypeIndexPage } from "@/components/NeighborhoodTypeIndexPage";
import type { NeighborhoodType } from "@/lib/data/neighborhoods";

export const metadata: Metadata = {
  title: "Business Districts",
  description:
    "Park Ridge's business districts, sorted by first built year, with a map of every district's boundary.",
};

const NEIGHBORHOOD_TYPES: NeighborhoodType[] = ["business_district"];

export default async function BusinessDistrictsPage() {
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
      breadcrumbLabel="Business Districts"
      title="Business Districts"
      subtitle="Park Ridge's commercial and mixed-use districts, each with its own construction history."
      summaries={summaries}
      bbox={bbox}
      siblingLinks={[
        { label: "Neighborhoods", href: "/neighborhoods" },
        { label: "Planning Districts", href: "/planning-districts" },
      ]}
    />
  );
}
