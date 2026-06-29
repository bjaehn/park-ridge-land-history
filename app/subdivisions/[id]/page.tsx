import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge";
import { MapView } from "@/components/MapView";
import { SubdivisionDetailContent } from "./_SubdivisionDetailContent";
import { SubdivisionHistoryPanel } from "@/components/ui/SubdivisionHistoryPanel";
import { SubdivisionLegalIdentity } from "./_SubdivisionLegalIdentity";
import {
  fetchSubdivisionFullDetail,
  fetchSubdivisionMapData,
  fetchParentSubdivision,
  fetchSubdivisionLineage,
} from "@/lib/supabase/subdivisionQueries";
import { statusLabel } from "@/lib/subdivisionTypes";
import type { ConfidenceLevel } from "@/lib/formatters";

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const sub = await fetchSubdivisionFullDetail(
    decodeURIComponent(params.id)
  ).catch(() => null);
  if (!sub) return { title: "Subdivision not found" };
  const year = sub.recorded_year ? ` (${sub.recorded_year})` : "";
  const title = sub.display_name ?? sub.name;
  const description = `Land history of the ${sub.name} subdivision plat in Park Ridge, Illinois${year}. View matched properties, plat records, and historical facts.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: ["/og-default.png"],
    },
  };
}

export default async function SubdivisionDetailPage({ params }: Props) {
  const id = decodeURIComponent(params.id);

  const [subOrNull, mapData, parentSub, lineage] = await Promise.all([
    fetchSubdivisionFullDetail(id).catch(() => null),
    fetchSubdivisionMapData(id).catch(() => ({ pins: [], bbox: null })),
    fetchParentSubdivision(id).catch(() => null),
    fetchSubdivisionLineage(id).catch(() => []),
  ]);

  if (!subOrNull) notFound();
  const sub = subOrNull;

  const allPins = mapData.pins;
  const allBbox = mapData.bbox;

  const confidence = sub.confidence_level as ConfidenceLevel;

  // Build subtitle: recorded year + developer, omitting empty parts
  const subtitleParts = [
    sub.recorded_year ? `Recorded ${sub.recorded_year}` : "Recording date uncertain",
    sub.original_owner
      ? `Developer: ${sub.original_owner}`
      : sub.developer
      ? `Developer: ${sub.developer}`
      : null,
  ].filter(Boolean);
  const subtitle = subtitleParts.join(". ");

  // Eyebrow: entity type label
  const eyebrow =
    sub.entity_type === "estate"
      ? "Historical estate"
      : sub.entity_type === "parent_plat"
      ? "Parent plat"
      : "Recorded plat";

  const hasHistoryContent =
    (sub.facts?.length ?? 0) > 0 || (sub.research_tasks?.length ?? 0) > 0;

  return (
    <div className="page-shell max-w-none">
      <Breadcrumb
        items={[
          { label: "Park Ridge", href: "/city" },
          { label: "Subdivisions", href: "/subdivisions" },
          { label: sub.display_name ?? sub.name, current: true },
        ]}
      />

      {/* ---- Header ---- */}
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <PageHeader
          eyebrow={eyebrow}
          title={sub.display_name ?? sub.name}
          subtitle={subtitle}
        />
        <div className="flex flex-col gap-2 items-end shrink-0">
          <ConfidenceBadge level={confidence} showDescription />
          {sub.status && sub.status !== "verified" && (
            <span className="text-xs text-text-muted">
              {statusLabel(sub.status)}
            </span>
          )}
        </div>
      </div>

      {/* ---- Alias chips ---- */}
      {sub.aliases && sub.aliases.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-6" aria-label="Also known as">
          <span className="text-xs text-text-muted self-center">Also known as:</span>
          {sub.aliases.map((alias) => (
            <span
              key={alias.id}
              className="text-xs px-2 py-0.5 rounded bg-surface-raised border border-surface-border text-text-muted"
              title={alias.alias_type ?? undefined}
            >
              {alias.alias}
            </span>
          ))}
        </div>
      )}

      {/* ---- Notes ---- */}
      {sub.notes && (
        <p className="text-text-secondary leading-relaxed mb-6">{sub.notes}</p>
      )}

      {/* ---- Historical summary ---- */}
      {sub.historical_summary && (
        <div className="mb-8">
          {sub.historical_summary.split("\n\n").map((para, i) => (
            <p
              key={i}
              className="text-text-secondary leading-relaxed mb-4 last:mb-0"
            >
              {para}
            </p>
          ))}
        </div>
      )}

      {/* ---- Historical context panel ---- */}
      {(hasHistoryContent || sub.status) && (
        <div className="mb-8">
          <SubdivisionHistoryPanel subdivision={sub} />
        </div>
      )}

      {/* ---- Plat and legal identity ---- */}
      <SubdivisionLegalIdentity sub={sub} lineage={lineage} />

      {/* ---- Dynamic content (stats, map, properties, etc.) ---- */}
      <SubdivisionDetailContent
        subdivisionId={id}
        recordedYear={sub.recorded_year ?? null}
        entityType={(sub.entity_type as string | null) ?? null}
        geometryStatus={(sub.geometry_status as string | null) ?? null}
        parentSubdivision={parentSub}
        sources={sub.sources ?? []}
        mapSlot={
          allPins.length > 0 || allBbox ? (
            <MapView
              scope={{
                kind: "subdivision",
                subdivisionId: id,
                pins: allPins.length > 0 ? allPins : undefined,
                bbox: allBbox ?? undefined,
              }}
              height="min(560px, 60vh)"
              showExpand
            />
          ) : null
        }
      />

      {/* ---- Footer ---- */}
      <p className="text-xs text-text-muted mt-8 pt-4 border-t border-surface-border">
        <Link href="/sources" className="hover:underline">
          About our data sources
        </Link>
        {" "}and methodology.
      </p>
    </div>
  );
}
