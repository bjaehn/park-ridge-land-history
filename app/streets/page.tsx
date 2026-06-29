import type { Metadata } from "next";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SourceNote } from "@/components/ui/SourceNote";
import { fetchStreetList } from "@/lib/data/streets";
import { StreetsContent } from "./_StreetsContent";

export const metadata: Metadata = {
  title: "Streets",
  description:
    "Every street in Park Ridge grouped by construction era — explore how the city was built decade by decade.",
};

export default async function StreetsPage() {
  const streets = await fetchStreetList().catch(() => []);

  return (
    <div className="page-shell max-w-none">
      <Breadcrumb
        items={[
          { label: "Park Ridge", href: "/city" },
          { label: "Streets", current: true },
        ]}
      />
      <StreetsContent streets={streets} />
      <SourceNote
        sources={["assessor"]}
        note="Street data is derived from Cook County Assessor parcel records. Era groupings reflect the median construction year of homes on each street."
      />
    </div>
  );
}
