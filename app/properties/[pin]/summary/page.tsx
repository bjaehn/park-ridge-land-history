import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { getPropertyByPin } from "@/lib/data/properties";
import { formatAddress } from "@/lib/formatters";
import { PropertySummaryContent } from "./_PropertySummaryContent";

export const revalidate = 86400;

type Props = { params: { pin: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pin = decodeURIComponent(params.pin);
  const property = await getPropertyByPin(pin).catch(() => null);
  if (!property) return { title: "Property not found" };
  const address = formatAddress(property.address);
  const description = property.yearBuilt
    ? `Shareable summary for ${address} in Park Ridge, Illinois. Built ${property.yearBuilt}.`
    : `Shareable summary for ${address} in Park Ridge, Illinois.`;
  return {
    title: `${address} — Summary`,
    description,
    // This is a condensed duplicate of /properties/[pin] for sharing, not a distinct
    // page worth indexing separately -- canonicalize to the full page and keep it
    // out of search results.
    alternates: { canonical: `/properties/${encodeURIComponent(pin)}` },
    robots: { index: false, follow: true },
    openGraph: {
      title: `${address} — Summary`,
      description,
      type: "website",
      images: ["/og-default.png"],
    },
  };
}

/**
 * Deliberately minimal and print-friendly -- no map, no story-group sections.
 * A compact, single-screen summary of the same property, generated from the
 * same data as the full page. Reached via the "Share" action in the main
 * property page's header.
 */
export default async function PropertySummaryPage({ params }: Props) {
  const pin = decodeURIComponent(params.pin);
  const property = await getPropertyByPin(pin).catch(() => null);

  if (!property) notFound();

  const address = formatAddress(property.address);

  return (
    <div className="page-shell max-w-prose">
      <Breadcrumb
        items={[
          { label: "Park Ridge", href: "/city" },
          { label: address, href: `/properties/${encodeURIComponent(pin)}` },
          { label: "Summary", current: true as const },
        ]}
      />

      <PageHeader eyebrow="Property summary" title={address} />

      <PropertySummaryContent pin={pin} />

      <p className="mt-8 text-sm print:hidden">
        <Link href={`/properties/${encodeURIComponent(pin)}`} className="text-accent-purple hover:underline">
          View full property history →
        </Link>
      </p>
    </div>
  );
}
