import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SourceNote } from "@/components/ui/SourceNote";
import { MapView } from "@/components/MapView";
import { PropertyDetailContent } from "./_PropertyDetailContent";
import { getPropertyByPin, fetchPropertyBbox } from "@/lib/data/properties";
import { formatAddress } from "@/lib/formatters";
import { ShareIcon } from "@/lib/icons";

type Props = { params: { pin: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pin = decodeURIComponent(params.pin);
  const property = await getPropertyByPin(pin).catch(() => null);
  if (!property) return { title: "Property not found" };
  const address = formatAddress(property.address);
  const description = property.yearBuilt
    ? `Property history for ${address} in Park Ridge, Illinois. Built ${property.yearBuilt}.`
    : `Property history for ${address} in Park Ridge, Illinois.`;
  return {
    title: address,
    description,
    openGraph: {
      title: address,
      description,
      type: "website",
      images: ["/og-default.png"],
    },
  };
}

export default async function PropertyDetailPage({ params }: Props) {
  const pin = decodeURIComponent(params.pin);
  const [property, propertyBbox] = await Promise.all([
    getPropertyByPin(pin).catch(() => null),
    fetchPropertyBbox(pin).catch(() => null),
  ]);

  if (!property) notFound();

  const address = formatAddress(property.address);
  const lat = property.lat;
  const lng = property.lng;

  return (
    <div className="page-shell">
      <Breadcrumb
        items={[
          { label: "Park Ridge", href: "/city" },
          ...(property.neighborhoodLabel && property.neighborhoodSlug
            ? [{ label: property.neighborhoodLabel, href: `/neighborhoods/${encodeURIComponent(property.neighborhoodSlug)}` }]
            : []),
          ...(property.subdivision
            ? [{ label: property.subdivision.name, href: `/subdivisions/${encodeURIComponent(property.subdivision.id)}` }]
            : []),
          { label: address, current: true as const },
        ]}
      />

      <PageHeader
        eyebrow="Property"
        title={address}
        subtitle={property.yearBuilt ? `Built ${property.yearBuilt}` : undefined}
        action={
          <Link
            href={`/properties/${encodeURIComponent(pin)}/summary`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-purple hover:underline"
          >
            <ShareIcon size={16} strokeWidth={1.8} aria-hidden="true" />
            Share
          </Link>
        }
      />

      <div className="mb-8">
        <MapView
          scope={{ kind: "property", pin, bbox: propertyBbox ?? undefined, lat: lat ?? undefined, lng: lng ?? undefined }}
          height="min(480px, 55vh)"
          showExpand
          hideLensSelector
        />
      </div>

      <PropertyDetailContent pin={pin} initialProps={property} />

      <SourceNote
        sources={["assessor", "permits", "hargis", "recorder"]}
        note="Raw property data shown below. Internal identifiers and data-quality flags are for reference only."
      />
    </div>
  );
}
