import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SourceNote } from "@/components/ui/SourceNote";
import { MapView } from "@/components/MapView";
import { CityContent } from "./_CityContent";
import { getCityTownships } from "@/lib/data/pinGroups";

export const metadata: Metadata = {
  title: "City history",
  description: "How Park Ridge grew, decade by decade. Development history for the full city.",
};

export default async function CityPage() {
  const townships = await getCityTownships().catch(() => []);

  return (
    <div className="page-shell">
      <Breadcrumb
        items={[{ label: "Park Ridge", current: true }]}
      />
      <PageHeader
        eyebrow="Park Ridge, Illinois"
        title="City history"
        subtitle="How Park Ridge's 13,000+ properties took shape, decade by decade."
      />

      <CityContent townships={townships} />

      <div className="mt-8">
        <p className="section-heading">City map</p>
        <MapView scope={{ kind: "city" }} height="500px" showExpand />
      </div>

      <SourceNote
        sources={["assessor", "permits", "hargis", "cookGis"]}
        note="Coverage based on the Cook County assessor parcel dataset."
      />
    </div>
  );
}
