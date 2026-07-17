import type { Metadata } from "next";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SourceNote } from "@/components/ui/SourceNote";
import { MapView } from "@/components/MapView";
import { fetchPermitList } from "@/lib/supabase/permitQueries";
import { PermitsContent } from "./_PermitsContent";

export const metadata: Metadata = {
  title: "Permits",
  description:
    "Building permits issued in Park Ridge, grouped by work category. Sourced from the Cook County Assessor permits dataset.",
  alternates: { canonical: "/permits" },
};

export default async function PermitsPage() {
  const permits = await fetchPermitList().catch(() => []);

  const mapSlot = (
    <div className="map-full-bleed">
      <MapView scope={{ kind: "city" }} defaultLens="permits" height="min(560px, 60vh)" showExpand />
    </div>
  );

  return (
    <div className="page-shell max-w-none">
      <Breadcrumb
        items={[
          { label: "Park Ridge", href: "/city" },
          { label: "Permits", current: true },
        ]}
      />

      <PermitsContent permits={permits} mapSlot={mapSlot} />

      <SourceNote
        sources={["permits", "assessor"]}
        note="Permit records are sourced from the Cook County Assessor permits dataset, which reflects permits known to the county assessor. Coverage may be incomplete for older or purely municipal permits."
      />
    </div>
  );
}
