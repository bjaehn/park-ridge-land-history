import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SITE_NAME, SITE_TAGLINE, NEIGHBORHOOD_BOUNDARY_DISCLAIMER } from "@/lib/content";

export const metadata: Metadata = {
  title: "About",
  description: `About the ${SITE_NAME} project.`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="page-shell max-w-prose">
      <Breadcrumb items={[{ label: "About", current: true }]} />
      <PageHeader title="About" subtitle={SITE_TAGLINE} />

      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <div className="space-y-3">
          <p className="font-semibold text-text-primary">Start here</p>
          <ul className="space-y-2">
            <li>
              Looking at a specific property? Search by address in the bar at the top of any page.{" "}
              <Link href="/" className="text-accent-purple hover:underline">
                Go to the homepage to search.
              </Link>
            </li>
            <li>
              Want to understand a neighborhood?{" "}
              <Link href="/neighborhoods" className="text-accent-purple hover:underline">
                Browse neighborhoods.
              </Link>
            </li>
            <li>
              Curious about Park Ridge history?{" "}
              <Link href="/city" className="text-accent-purple hover:underline">
                Start with the city history page.
              </Link>
            </li>
          </ul>
        </div>

        <p>
          Park Ridge Land History is a public record of how Park Ridge, Illinois developed, lot by lot and decade by decade. It traces 13,381 properties from the recorded subdivision plats that created them to the permit and sale activity on record today.
        </p>
        <p>
          The project uses Cook County assessor parcel data, City of Park Ridge permit records, the Hargis historic architecture survey, and Cook County Recorder subdivision plat records. All data is treated as approximate. Confidence levels and coverage notes indicate where the record is strong and where it is uncertain.
        </p>
        <p>
          This is a personal research project, not affiliated with the City of Park Ridge or Cook County. If you find an error or have a correction,{" "}
          <a
            href="mailto:bjaehn@gmail.com"
            className="text-accent-purple hover:underline"
          >
            send an email
          </a>
          .
        </p>
        <p>{NEIGHBORHOOD_BOUNDARY_DISCLAIMER}</p>
      </div>
    </div>
  );
}
