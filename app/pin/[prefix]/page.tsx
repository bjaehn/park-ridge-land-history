import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { MapView } from "@/components/MapView";
import { PinGroupContent } from "./_PinGroupContent";
import { getPinGroupSummary, getPinGroupDetail, fetchPinPrefixBbox } from "@/lib/data/pinGroups";
import { formatCount } from "@/lib/formatters";

function mostCommon<T>(values: (T | null)[]): T | null {
  const counts = new Map<T, number>();
  for (const v of values) {
    if (v != null) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best: T | null = null;
  let bestCount = 0;
  counts.forEach((count, val) => { if (count > bestCount) { best = val; bestCount = count; } });
  return best;
}

type Props = { params: { prefix: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const prefix = decodeURIComponent(params.prefix);
  const summary = await getPinGroupSummary(prefix).catch(() => null);
  if (!summary) return { title: "PIN group not found" };
  const description = `${summary.parcelCount} properties in ${summary.levelLabel} (PIN prefix ${prefix}) in Park Ridge, Illinois.`;
  return {
    title: `PIN ${prefix}`,
    description,
    openGraph: {
      title: `PIN ${prefix} — Park Ridge Land History`,
      description,
      type: "website",
      images: ["/og-default.png"],
    },
  };
}

export default async function PinGroupPage({ params }: Props) {
  const prefix = decodeURIComponent(params.prefix);

  const [summary, detail, bbox] = await Promise.all([
    getPinGroupSummary(prefix).catch(() => null),
    getPinGroupDetail(prefix).catch(() => null),
    fetchPinPrefixBbox(prefix).catch(() => null),
  ]);

  if (!summary) notFound();

  const pins = detail?.parcels.map((p) => p.pin).filter(Boolean) ?? [];

  const dominantStreet = detail ? mostCommon(detail.parcels.map((p) => p.streetNameNormalized)) : null;
  const dominantNeighborhoodLabel = detail ? mostCommon(detail.parcels.map((p) => p.neighborhoodLabel)) : null;
  const dominantNeighborhoodSlug = detail ? mostCommon(detail.parcels.map((p) => p.neighborhoodSlug)) : null;

  const streetDisplay = dominantStreet
    ? dominantStreet.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
    : null;

  const subtitleParts = [
    `${formatCount(summary.parcelCount, "property", "properties")}`,
    streetDisplay ? `primarily on ${streetDisplay}` : null,
  ].filter(Boolean).join(", ");

  return (
    <div className="page-shell">
      <Breadcrumb items={summary.breadcrumbParts} />

      <PageHeader
        eyebrow={summary.level}
        title={summary.levelLabel}
        subtitle={subtitleParts}
      />

      {dominantNeighborhoodLabel && dominantNeighborhoodSlug && (
        <p className="text-sm text-text-muted mb-6">
          In the{" "}
          <Link href={`/neighborhoods/${encodeURIComponent(dominantNeighborhoodSlug)}`} className="text-accent-purple hover:underline">
            {dominantNeighborhoodLabel}
          </Link>{" "}
          neighborhood.
        </p>
      )}

      <PinGroupContent
        prefix={prefix}
        initialDetail={detail}
        mapSlot={
          <MapView
            scope={{
              kind: "subdivision",
              subdivisionId: prefix,
              pins: pins.length > 0 ? pins : undefined,
              bbox: bbox ?? undefined,
            }}
            height="min(520px, 60vh)"
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
