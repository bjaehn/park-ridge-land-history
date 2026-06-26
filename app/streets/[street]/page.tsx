import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
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
  const normalizedForLookup = streetName.toLowerCase().trim().replace(/-/g, " ");
  const [street, streetBbox] = await Promise.all([
    getStreetByName(streetName).catch(() => null),
    fetchStreetBbox(normalizedForLookup).catch(() => null),
  ]);

  if (!street) notFound();

  return (
    <div className="page-shell">
      <Breadcrumb
        items={[
          { label: "Park Ridge", href: "/city" },
          { label: "Streets", href: "/streets" },
          { label: street.name, current: true },
        ]}
      />
      <PageHeader
        eyebrow="Street"
        title={street.name}
        subtitle={`${street.parcelCount} properties. ${street.eraSpan ? `Built ${street.eraSpan}.` : ""}`}
      />

      {street.neighborhoodLabel && street.neighborhoodSlug && (
        <div className="mb-6">
          <Link
            href={`/neighborhoods/${encodeURIComponent(street.neighborhoodSlug)}`}
            className="inline-flex items-center gap-2 text-sm bg-surface-card border border-surface-border rounded-full px-3 py-1.5 text-text-secondary hover:border-accent-purple/40 hover:text-text-primary transition-colors"
          >
            Neighborhood: {street.neighborhoodLabel}
          </Link>
        </div>
      )}

      <StreetDetailContent
        streetName={street.normalizedName}
        displayName={street.name}
        mapSlot={
          <MapView
            scope={{ kind: "street", streetName: street.normalizedName, bbox: streetBbox ?? undefined }}
            height="min(560px, 60vh)"
            showExpand
          />
        }
      />

      <p className="text-xs text-text-muted mt-6 pt-4 border-t border-surface-border">
        <Link href="/sources" className="hover:underline">About our data sources</Link>
      </p>
    </div>
  );
}
