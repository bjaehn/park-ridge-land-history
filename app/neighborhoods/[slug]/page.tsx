import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SourceNote } from "@/components/ui/SourceNote";
import { MapView } from "@/components/MapView";
import { NeighborhoodDetailContent } from "./_NeighborhoodDetailContent";
import { getNeighborhoodBySlug } from "@/lib/data/neighborhoods";
import { NEIGHBORHOOD_BOUNDARY_DISCLAIMER } from "@/lib/content";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const neighborhood = await getNeighborhoodBySlug(decodeURIComponent(params.slug)).catch(() => null);
  if (!neighborhood) return { title: "Neighborhood not found" };
  return {
    title: neighborhood.label,
    description: `Development history for the ${neighborhood.label} neighborhood of Park Ridge.`,
  };
}

export default async function NeighborhoodDetailPage({ params }: Props) {
  const slug = decodeURIComponent(params.slug);
  const neighborhood = await getNeighborhoodBySlug(slug).catch(() => null);

  if (!neighborhood) notFound();

  return (
    <div className="page-shell">
      <Breadcrumb
        items={[
          { label: "Park Ridge", href: "/city" },
          { label: "Neighborhoods", href: "/neighborhoods" },
          { label: neighborhood.label, current: true },
        ]}
      />
      <PageHeader
        eyebrow="Neighborhood"
        title={neighborhood.label}
        subtitle={`${neighborhood.parcelCount} properties. ${neighborhood.medianYear ? `Typical build year: ${neighborhood.medianYear}.` : ""}`}
      />

      <NeighborhoodDetailContent neighborhoodId={neighborhood.id} label={neighborhood.label} />

      <div className="mt-8">
        <p className="section-heading">Neighborhood map</p>
        <MapView
          scope={{ kind: "neighborhood", neighborhoodId: neighborhood.id }}
          height="420px"
          showExpand
        />
      </div>

      <SourceNote
        sources={["assessor", "permits"]}
        note={NEIGHBORHOOD_BOUNDARY_DISCLAIMER}
      />
    </div>
  );
}
