import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge";
import { SourceNote } from "@/components/ui/SourceNote";
import { MapView } from "@/components/MapView";
import { SubdivisionDetailContent } from "./_SubdivisionDetailContent";
import { SubdivisionHistoryPanel } from "@/components/ui/SubdivisionHistoryPanel";
import { fetchSubdivisionFullDetail } from "@/lib/supabase/subdivisionQueries";
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
  const subOrNull = await fetchSubdivisionFullDetail(id).catch(() => null);

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
    <div className="page-shell">
      <Breadcrumb
        items={[
          { label: "Park Ridge", href: "/city" },
          { label: "Subdivisions", href: "/subdivisions" },
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
        <p className="text-text-secondary leading-relaxed mb-8 max-w-prose">{sub.notes}</p>
      )}

      {/* Historical context panel */}
      <div className="mb-8">
        <SubdivisionHistoryPanel subdivision={sub} />
      </div>

      <SubdivisionDetailContent subdivisionId={id} recordedYear={sub.recorded_year ?? null} />

      <div className="mt-8">
        <p className="section-heading">Subdivision map</p>
        <MapView
          scope={{ kind: "subdivision", subdivisionId: id }}
          height="400px"
          showExpand
        />
      </div>

      <SourceNote
        sources={["recorder", "cookGis", "assessor"]}
        note={sub.source_reference ? `Source: ${sub.source_reference}` : undefined}
      />
    </div>
  );
}
