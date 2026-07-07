import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { InlineSourceNote } from "@/components/ui/SourceNote";
import { NEIGHBORHOOD_BOUNDARY_DISCLAIMER } from "@/lib/content";
import { NeighborhoodsGrid } from "./_NeighborhoodsGrid";
import { NeighborhoodCharts } from "@/components/ui/NeighborhoodCharts";

export const metadata: Metadata = {
  title: "Neighborhoods",
  description: "Park Ridge's corridor districts and local/informal neighborhood names.",
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
      <NeighborhoodsGrid />
      <InlineSourceNote>{NEIGHBORHOOD_BOUNDARY_DISCLAIMER}</InlineSourceNote>
    </div>
  );
}
