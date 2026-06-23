import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { InlineSourceNote } from "@/components/ui/SourceNote";
import { NEIGHBORHOOD_BOUNDARY_DISCLAIMER } from "@/lib/content";
import { NeighborhoodsGrid } from "./_NeighborhoodsGrid";
import { NeighborhoodCharts } from "@/components/ui/NeighborhoodCharts";

export const metadata: Metadata = {
  title: "Neighborhoods",
  description: "Park Ridge neighborhoods: official planning districts, business districts, and local area names.",
};

export default function NeighborhoodsPage() {
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
        subtitle="Three overlapping ways to understand Park Ridge geography: official planning districts, business districts, and informal local names."
      />
      <div className="mb-10">
        <NeighborhoodCharts />
      </div>
      <NeighborhoodsGrid />
      <InlineSourceNote>{NEIGHBORHOOD_BOUNDARY_DISCLAIMER}</InlineSourceNote>
    </div>
  );
}
