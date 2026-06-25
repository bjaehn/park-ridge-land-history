export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { MapView } from "@/components/MapView";
import { NeighborhoodTypePanel } from "@/components/ui/NeighborhoodTypePanel";
import { InlineSourceNote } from "@/components/ui/SourceNote";
import { NeighborhoodPage } from "./_NeighborhoodPage";
import {
  getNeighborhoodMeta,
  getNeighborhoodStats,
  getNeighborhoodBuildHistory,
  getNeighborhoodLinkedSubdivisions,
  getNeighborhoodMapData,
  getNeighborhoodSalesHistory,
  getNeighborhoodPriceSummary,
} from "@/lib/data/neighborhoodPage";
import { NEIGHBORHOOD_NARRATIVES, NEIGHBORHOOD_ERA_LABELS } from "@/lib/content";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = decodeURIComponent(params.slug);
  const meta = await getNeighborhoodMeta(slug).catch(() => null);
  if (!meta) return { title: "Neighborhood not found" };
  const eraLabel = NEIGHBORHOOD_ERA_LABELS[slug];
  const description = eraLabel
    ? `The ${meta.label} neighborhood of Park Ridge. ${eraLabel}.`
    : `Development history for the ${meta.label} neighborhood of Park Ridge.`;
  return {
    title: meta.label,
    description,
    openGraph: {
      title: meta.label,
      description,
      type: "website",
      images: ["/og-default.png"],
    },
  };
}

export default async function NeighborhoodDetailPage({ params }: Props) {
  const slug = decodeURIComponent(params.slug);

  // Round 1: neighborhood identity
  const meta = await getNeighborhoodMeta(slug).catch(() => null);
  if (!meta) notFound();

  // Round 2: all data that depends on the neighborhood id, fully parallel
  const [stats, buildHistory, linkedSubdivisions, mapData] = await Promise.all([
    getNeighborhoodStats(meta.id).catch(() => ({
      parcelCount: 0,
      medianYear: undefined,
      totalPermits: undefined,
      totalSales: undefined,
      recentTeardowns: undefined,
    })),
    getNeighborhoodBuildHistory(meta.id).catch(() => ({ decadeRows: [], streets: [] })),
    getNeighborhoodLinkedSubdivisions(meta.id).catch(() => []),
    getNeighborhoodMapData(meta.id).catch(
      (): { pins: string[]; bbox: [number, number, number, number] | null } => ({
        pins: [],
        bbox: null,
      })
    ),
  ]);

  // Round 3: sales data that depends on pins; cap list for query safety
  const pins = mapData.pins.slice(0, 200);
  const [salesHistory, priceSummary] = await Promise.all([
    getNeighborhoodSalesHistory(pins).catch(() => []),
    getNeighborhoodPriceSummary(pins).catch(() => ({
      year2015: null,
      year2024: null,
      pctChange: null,
    })),
  ]);

  const hasBoundary = mapData.bbox !== null;
  const eraLabel = NEIGHBORHOOD_ERA_LABELS[slug];
  const narrative = meta.historicalSummary ?? NEIGHBORHOOD_NARRATIVES[slug] ?? null;

  const eyebrow =
    meta.neighborhoodType === "official_planning"
      ? "Official Planning Neighborhood"
      : meta.neighborhoodType === "business_district"
      ? "Business District"
      : meta.neighborhoodType === "local_market"
      ? "Local Neighborhood"
      : "Neighborhood";

  const computedSubtitle = [
    stats.parcelCount > 0 ? `${stats.parcelCount.toLocaleString()} properties` : null,
    stats.medianYear ? `typical build year ${stats.medianYear}` : null,
  ]
    .filter(Boolean)
    .join(", ");
  const subtitle = eraLabel ?? (computedSubtitle || undefined);

  const pageData = {
    meta,
    stats,
    buildHistory,
    linkedSubdivisions,
    mapData,
    salesHistory,
    priceSummary,
  };

  const mapSlot =
    mapData.pins.length > 0 || hasBoundary ? (
      <MapView
        scope={{
          kind: "neighborhood",
          neighborhoodId: meta.id,
          pins: mapData.pins,
          bbox: mapData.bbox ?? undefined,
        }}
        height="580px"
        showExpand
      />
    ) : undefined;

  return (
    <div className="page-shell">
      <Breadcrumb
        items={[
          { label: "Park Ridge", href: "/city" },
          { label: meta.label, current: true },
        ]}
      />

      <PageHeader eyebrow={eyebrow} title={meta.label} subtitle={subtitle} />

      {narrative && (
        <div className="mt-4 mb-6">
          <p className="text-text-secondary leading-relaxed max-w-prose">{narrative}</p>
          <InlineSourceNote className="mt-2">
            Historical notes based on assessor build-year data and recorder subdivision records.
            Era characterizations are interpretive. Confidence: Medium.
          </InlineSourceNote>
        </div>
      )}

      <div className="mb-8">
        <NeighborhoodTypePanel
          neighborhoodType={meta.neighborhoodType}
          hasBoundary={hasBoundary}
        />
      </div>

      <NeighborhoodPage data={pageData} eraLabel={eraLabel} mapSlot={mapSlot} />

      <p className="text-xs text-text-muted mt-6 pt-4 border-t border-surface-border">
        <Link href="/sources" className="hover:underline">
          About our data sources
        </Link>
      </p>
    </div>
  );
}
