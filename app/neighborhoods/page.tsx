import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { InlineSourceNote } from "@/components/ui/SourceNote";
import { NEIGHBORHOOD_BOUNDARY_DISCLAIMER } from "@/lib/content";
import { NeighborhoodsGrid } from "./_NeighborhoodsGrid";
import { NeighborhoodCharts } from "@/components/ui/NeighborhoodCharts";

export const metadata: Metadata = {
  title: "Neighborhoods",
  description: "Five approximate areas of Park Ridge, from the early Uptown core to the postwar south side.",
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
        subtitle="Five approximate areas, derived from Census tract groupings. Each developed in a distinct era."
      />
      <div className="mb-10">
        <NeighborhoodCharts />
      </div>
      <NeighborhoodsGrid />
      <InlineSourceNote>{NEIGHBORHOOD_BOUNDARY_DISCLAIMER}</InlineSourceNote>
    </div>
  );
}
