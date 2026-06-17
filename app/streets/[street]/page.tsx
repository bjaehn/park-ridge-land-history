import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SourceNote } from "@/components/ui/SourceNote";
import { MapView } from "@/components/MapView";
import { StreetDetailContent } from "./_StreetDetailContent";
import { getStreetByName, fetchStreetBbox } from "@/lib/data/streets";

type Props = { params: { street: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const name = decodeURIComponent(params.street);
  return {
    title: name,
    description: `Property history for ${name} in Park Ridge.`,
  };
}

export default async function StreetDetailPage({ params }: Props) {
  const streetName = decodeURIComponent(params.street);
  const [street, streetBbox] = await Promise.all([
    getStreetByName(streetName).catch(() => null),
    fetchStreetBbox(streetName.toLowerCase().trim()).catch(() => null),
  ]);

  if (!street) notFound();

  return (
    <div className="page-shell">
      <Breadcrumb
        items={[
          { label: "Park Ridge", href: "/city" },
          { label: street.neighborhoodLabel ?? "Neighborhoods", href: street.neighborhoodSlug ? `/neighborhoods/${encodeURIComponent(street.neighborhoodSlug)}` : "/neighborhoods" },
          { label: street.name, current: true },
        ]}
      />
      <PageHeader
        eyebrow="Street"
        title={street.name}
        subtitle={`${street.parcelCount} properties. ${street.eraSpan ? `Built ${street.eraSpan}.` : ""}`}
      />

      <StreetDetailContent streetName={street.normalizedName} displayName={street.name} />

      <div className="mt-8">
        <p className="section-heading">Street map</p>
        <MapView
          scope={{ kind: "street", streetName: street.normalizedName, bbox: streetBbox ?? undefined }}
          height="380px"
          showExpand
        />
      </div>

      <SourceNote sources={["assessor", "permits"]} />
    </div>
  );
}
