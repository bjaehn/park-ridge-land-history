import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/content";

export const metadata: Metadata = {
  title: "About",
  description: `About the ${SITE_NAME} project.`,
};

export default function AboutPage() {
  return (
    <div className="page-shell max-w-prose">
      <Breadcrumb items={[{ label: "About", current: true }]} />
      <PageHeader title="About" subtitle={SITE_TAGLINE} />

      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>
          Park Ridge Land History is a public record of how Park Ridge, Illinois developed, lot by lot and decade by decade. It traces 13,381 properties from the recorded subdivision plats that created them to the permit and sale activity on record today.
        </p>
        <p>
          The project uses Cook County assessor parcel data, City of Park Ridge permit records, the Hargis historic architecture survey, and Cook County Recorder subdivision plat records. All data is treated as approximate. Confidence levels and coverage notes indicate where the record is strong and where it is uncertain.
        </p>
        <p>
          This is a personal research project, not affiliated with the City of Park Ridge or Cook County. If you find an error or have a correction, please reach out.
        </p>
        <p>
          Neighborhood boundaries are approximate and derived from Census tract groupings, not official city boundaries.
        </p>
      </div>
    </div>
  );
}
