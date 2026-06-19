import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SourceNote } from "@/components/ui/SourceNote";
import { SubdivisionsContent } from "./_SubdivisionsContent";
import { SubdivisionCharts } from "./_SubdivisionCharts";

export const metadata: Metadata = {
  title: "Subdivisions",
  description: "Recorded Park Ridge subdivision plats. Each plat names the developer, recording date, and lots created.",
};

export default function SubdivisionsPage() {
  return (
    <div className="page-shell max-w-none">
      <Breadcrumb
        items={[
          { label: "Park Ridge", href: "/city" },
          { label: "Subdivisions", current: true },
        ]}
      />
      <PageHeader
        eyebrow="Recorded plats"
        title="Subdivisions"
        subtitle="The recorded subdivision plats that created Park Ridge's lots. Each plat is a legal instrument on file at the Cook County Recorder of Deeds."
      />

      <SubdivisionCharts />

      <SubdivisionsContent />

      <SourceNote
        sources={["recorder", "cookGis"]}
        note="Recording dates and developer names are sourced from the Cook County Recorder plat index. Confidence is noted where dates are uncertain."
      />
    </div>
  );
}
