import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SourceNote } from "@/components/ui/SourceNote";
import { MapView } from "@/components/MapView";
import { PropertyDetailContent } from "./_PropertyDetailContent";
import { getPropertyByPin } from "@/lib/data/properties";
import { formatAddress } from "@/lib/formatters";

type Props = { params: { pin: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pin = decodeURIComponent(params.pin);
  const property = await getPropertyByPin(pin).catch(() => null);
  if (!property) return { title: "Property not found" };
  const address = formatAddress(property.address);
  return {
    title: address,
    description: `Property history for ${address} in Park Ridge, Illinois.`,
  };
}

export default async function PropertyDetailPage({ params }: Props) {
  const pin = decodeURIComponent(params.pin);
  const property = await getPropertyByPin(pin).catch(() => null);

  if (!property) notFound();

  const address = formatAddress(property.address);
  const lat = property.lat ?? 42.0111;
  const lng = property.lng ?? -87.8417;

  const pin_ = property.pinNormalized ?? pin;
  const township = pin_.slice(0, 2);
  const sectionId = pin_.slice(0, 4);
  const blockId = pin_.slice(0, 7);

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
          ...(township ? [{ label: `Township ${township}`, href: `/pin/${encodeURIComponent(township)}` }] : []),
          ...(sectionId.length >= 4 ? [{ label: `Section ${sectionId}`, href: `/sections/${encodeURIComponent(sectionId)}` }] : []),
          ...(blockId.length >= 7 ? [{ label: `Block ${blockId}`, href: `/blocks/${encodeURIComponent(blockId)}` }] : []),
          { label: address, current: true as const },
        ]}
      />

      <PageHeader
        eyebrow="Property"
        title={address}
        subtitle={property.yearBuilt ? `Built ${property.yearBuilt}` : undefined}
      />

      <div className="mb-8 grid grid-cols-1 lg:grid-cols-[55fr_45fr] gap-6 items-start">
        <div>
          <MapView
            scope={{ kind: "property", pin, lat, lng }}
            height="480px"
            showExpand
            hideLensSelector
          />
        </div>
        <div>
          <PropertyDetailContent pin={pin} />
        </div>
      </div>

      <SourceNote
        sources={["assessor", "permits", "hargis", "recorder"]}
        note="Raw property data shown below. Internal identifiers and data-quality flags are for reference only."
      />
    </div>
  );
}
