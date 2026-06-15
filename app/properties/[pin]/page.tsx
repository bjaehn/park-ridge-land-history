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

  return (
    <div className="page-shell">
      <Breadcrumb
        items={[
          { label: "Park Ridge", href: "/city" },
          ...(property.neighborhoodLabel && property.neighborhoodSlug
            ? [{ label: property.neighborhoodLabel, href: `/neighborhoods/${encodeURIComponent(property.neighborhoodSlug)}` }]
            : []),
          ...(property.streetName
            ? [{ label: property.streetName, href: `/streets/${encodeURIComponent(property.streetName)}` }]
            : []),
          { label: address, current: true as const },
        ]}
      />

      <PageHeader
        eyebrow="Property"
        title={address}
        subtitle={property.yearBuilt ? `Built ${property.yearBuilt}` : undefined}
      />

      <div className="two-col-layout">
        <div>
          <PropertyDetailContent pin={pin} />
        </div>
        <div>
          <p className="section-heading">Property map</p>
          <MapView
            scope={{ kind: "property", pin, lat, lng }}
            height="320px"
            showExpand
          />
        </div>
      </div>

      <SourceNote
        sources={["assessor", "permits", "hargis", "recorder"]}
        note="Raw property data shown below. Internal identifiers and data-quality flags are for reference only."
      />
    </div>
  );
}
