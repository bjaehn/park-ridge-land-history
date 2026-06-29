import type { Metadata } from "next";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SourceNote } from "@/components/ui/SourceNote";
import { fetchPermitList } from "@/lib/supabase/permitQueries";
import { PermitsContent } from "./_PermitsContent";

export const metadata: Metadata = {
  title: "Permits",
  description:
    "Building permits issued in Park Ridge, grouped by work category. Sourced from the Cook County Assessor permits dataset.",
};

export default async function PermitsPage() {
  const permits = await fetchPermitList().catch(() => []);

  return (
    <div className="page-shell max-w-none">
      <Breadcrumb
        items={[
          { label: "Park Ridge", href: "/city" },
          { label: "Permits", current: true },
        ]}
      />

      <PermitsContent permits={permits} />

      <SourceNote
        sources={["permits", "assessor"]}
        note="Permit records are sourced from the Cook County Assessor permits dataset, which reflects permits known to the county assessor. Coverage may be incomplete for older or purely municipal permits."
      />
    </div>
  );
}
