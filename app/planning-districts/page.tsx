import type { Metadata } from "next";
import { fetchNeighborhoodSummaries, fetchAllNeighborhoodsBbox } from "@/lib/data/neighborhoods";
import { NeighborhoodTypeIndexPage } from "@/components/NeighborhoodTypeIndexPage";

export const metadata: Metadata = {
  title: "Planning Districts",
  description:
    "Park Ridge's official planning neighborhoods, sorted by first built year, with a map of every district's boundary.",
};

export default async function PlanningDistrictsPage() {
  const [all, bbox] = await Promise.all([
    fetchNeighborhoodSummaries().catch(() => []),
    fetchAllNeighborhoodsBbox().catch(() => null),
  ]);
  const summaries = all.filter((n) => n.neighborhoodType === "official_planning");

  return (
    <NeighborhoodTypeIndexPage
      neighborhoodTypes={["official_planning"]}
      breadcrumbLabel="Planning Districts"
      title="Official Planning Districts"
      subtitle="The City of Park Ridge's official planning neighborhoods, each with its own construction history."
      summaries={summaries}
      bbox={bbox}
    />
  );
}
