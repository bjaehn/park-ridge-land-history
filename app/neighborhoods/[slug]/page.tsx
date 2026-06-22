import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SourceNote } from "@/components/ui/SourceNote";
import { MapView } from "@/components/MapView";
import { NeighborhoodDetailContent } from "./_NeighborhoodDetailContent";
import { getNeighborhoodBySlug, fetchNeighborhoodBbox, fetchNeighborhoodPins } from "@/lib/data/neighborhoods";
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

  const [neighborhoodBbox, neighborhoodPins] = await Promise.all([
    fetchNeighborhoodBbox(neighborhood.id).catch(() => null),
    fetchNeighborhoodPins(neighborhood.id).catch(() => []),
  ]);

  return (
    <div className="page-shell">
      <Breadcrumb
        items={[
          { label: "Park Ridge", href: "/city" },
          { label: neighborhood.label, current: true },
        ]}
      />
      <PageHeader
        eyebrow={
          neighborhood.neighborhoodType === "official_planning" ? "Official Planning Neighborhood" :
          neighborhood.neighborhoodType === "business_district" ? "Business District" :
          neighborhood.neighborhoodType === "local_market" ? "Local Neighborhood" :
          "Neighborhood"
        }
        title={neighborhood.label}
        subtitle={`${neighborhood.parcelCount} properties. ${neighborhood.medianYear ? `Typical build year: ${neighborhood.medianYear}.` : ""}`}
      />

      <NeighborhoodDetailContent
        neighborhoodId={neighborhood.id}
        label={neighborhood.label}
        slug={neighborhood.slug}
        mapSlot={
          <MapView
            scope={{ kind: "neighborhood", neighborhoodId: neighborhood.id, pins: neighborhoodPins, bbox: neighborhoodBbox ?? undefined }}
            height="580px"
            showExpand
          />
        }
      />

      <SourceNote
        sources={["assessor", "permits"]}
        note={NEIGHBORHOOD_BOUNDARY_DISCLAIMER}
      />
    </div>
  );
}
