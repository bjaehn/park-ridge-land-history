import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge";
import { MapView } from "@/components/MapView";
import { SubdivisionDetailContent } from "./_SubdivisionDetailContent";
import { SubdivisionHistoryPanel } from "@/components/ui/SubdivisionHistoryPanel";
import { fetchSubdivisionFullDetail, fetchSubdivisionMapData, fetchParentSubdivision, fetchSubdivisionGisLots, fetchBboxForPins } from "@/lib/supabase/subdivisionQueries";
import type { ConfidenceLevel } from "@/lib/formatters";

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const sub = await fetchSubdivisionFullDetail(decodeURIComponent(params.id)).catch(() => null);
  if (!sub) return { title: "Subdivision not found" };
  return {
    title: sub.name,
    description: `History of the ${sub.name} subdivision plat in Park Ridge.`,
  };
}

export default async function SubdivisionDetailPage({ params }: Props) {
  const id = decodeURIComponent(params.id);
  const [subOrNull, mapData, parentSub, gisLots] = await Promise.all([
    fetchSubdivisionFullDetail(id).catch(() => null),
    fetchSubdivisionMapData(id).catch(() => ({ pins: [], bbox: null })),
    fetchParentSubdivision(id).catch(() => null),
    fetchSubdivisionGisLots(id).catch(() => []),
  ]);

  // Merge deed-verified PINs with GIS-matched PINs so the map shows all known parcels
  const gisPins = gisLots.filter((l) => l.pin_normalized).map((l) => l.pin_normalized!);
  const allPins = [...new Set([...mapData.pins, ...gisPins])];

  // Recompute bbox from all pins when GIS expands beyond deed-only coverage
  const allBbox =
    allPins.length > mapData.pins.length
      ? await fetchBboxForPins(allPins).catch(() => mapData.bbox)
      : mapData.bbox;

  if (!subOrNull) notFound();

  // notFound() throws, so subOrNull is non-null past this point.
  const sub = subOrNull!;

  const confidence = sub.confidence_level as ConfidenceLevel;

  const subtitle = [
    sub.recorded_year ? `Recorded ${sub.recorded_year}` : "Recording date uncertain",
    sub.original_owner ? `Developer: ${sub.original_owner}` : null,
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <div className="page-shell max-w-none">
      <Breadcrumb
        items={[
          { label: "Park Ridge", href: "/city" },
          { label: sub.name, current: true },
        ]}
      />

      <div className="flex items-start justify-between gap-4 mb-4">
        <PageHeader
          eyebrow="Recorded plat"
          title={sub.name}
          subtitle={subtitle}
        />
        <ConfidenceBadge level={confidence} showDescription />
      </div>

      {/* Alias chips below the header */}
      {sub.aliases && sub.aliases.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-6">
          {sub.aliases.map((alias) => (
            <span
              key={alias.id}
              className="text-xs px-2 py-0.5 rounded bg-surface-raised border border-surface-border text-text-muted"
            >
              {alias.alias}
            </span>
          ))}
        </div>
      )}

      {sub.notes && (
        <p className="text-text-secondary leading-relaxed mb-8">{sub.notes}</p>
      )}

      {sub.historical_summary && (
        <div className="mb-8">
          {sub.historical_summary.split('\n\n').map((para, i) => (
            <p key={i} className="text-text-secondary leading-relaxed mb-4 last:mb-0">
              {para}
            </p>
          ))}
        </div>
      )}

      {/* Historical context panel */}
      <div className="mb-8">
        <SubdivisionHistoryPanel subdivision={sub} />
      </div>

      <SubdivisionDetailContent
        subdivisionId={id}
        recordedYear={sub.recorded_year ?? null}
        entityType={(sub.entity_type as string | null) ?? null}
        geometryStatus={(sub.geometry_status as string | null) ?? null}
        parentSubdivision={parentSub}
        mapSlot={
          allPins.length > 0 || allBbox ? (
            <MapView
              scope={{
                kind: "subdivision",
                subdivisionId: id,
                pins: allPins.length > 0 ? allPins : undefined,
                bbox: allBbox ?? undefined,
              }}
              height="560px"
              showExpand
            />
          ) : null
        }
      />

      <p className="text-xs text-text-muted mt-6 pt-4 border-t border-surface-border">
        <Link href="/sources" className="hover:underline">About our data sources</Link>
      </p>
    </div>
  );
}
