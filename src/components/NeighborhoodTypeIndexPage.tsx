import type { ReactNode } from "react";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { PageHeader } from "@/components/ui/PageHeader";
import { InlineSourceNote } from "@/components/ui/SourceNote";
import { EntityCard } from "@/components/ui/EntityCard";
import { NeighborhoodCharts } from "@/components/ui/NeighborhoodCharts";
import { DecadeGroup } from "@/components/ui/DecadeGroup";
import { MapView } from "@/components/MapView";
import { formatCount } from "@/lib/formatters";
import { NEIGHBORHOOD_BOUNDARY_DISCLAIMER } from "@/lib/content";
import type { NeighborhoodSummary, NeighborhoodType } from "@/lib/data/neighborhoods";

type SiblingLink = { label: string; href: string };

type OverviewProps = {
  neighborhoodTypes: NeighborhoodType[];
  summaries: NeighborhoodSummary[];
  bbox: [number, number, number, number] | null;
};

type Props = OverviewProps & {
  breadcrumbLabel: string;
  title: string;
  subtitle: string;
  siblingLinks: SiblingLink[];
  icon: ReactNode;
};

// Chronological by earliestYear (first built), Unknown last -- this is the
// SAME order used to assign map/legend colors, so the map, the legend, and
// this card list can never disagree about which district is which color.
function sortChronological(items: NeighborhoodSummary[]): NeighborhoodSummary[] {
  return [...items].sort((a, b) => (a.earliestYear ?? Infinity) - (b.earliestYear ?? Infinity));
}

/**
 * The uniform "See X or Y." cross-link paragraph shown identically on
 * /neighborhoods, /planning-districts, and /business-districts -- one
 * component so the 3 pages can't drift into differently worded or
 * differently placed versions of the same link.
 */
function NeighborhoodFamilyLinks({ links }: { links: SiblingLink[] }) {
  if (links.length === 0) return null;
  return (
    <p data-section="links" className="text-sm text-text-secondary mb-8 -mt-6">
      See{" "}
      {links.map((link, i) => (
        <span key={link.href}>
          <Link href={link.href} className="text-text-link hover:underline">
            {link.label}
          </Link>
          {i < links.length - 1 ? (links.length > 2 ? ", " : " ") : ""}
          {i === links.length - 2 ? "or " : ""}
        </span>
      ))}
      .
    </p>
  );
}

/**
 * Map + decade-grouped district cards, shared by /planning-districts,
 * /business-districts, and /neighborhoods (Corridor + Local/Market).
 */
export function NeighborhoodTypeOverview({ neighborhoodTypes, summaries, bbox }: OverviewProps) {
  const ordered = sortChronological(summaries);
  const legendDistricts = ordered.map((n) => ({ id: n.id, label: n.label, slug: n.slug }));

  return (
    <>
      <div data-section="map" className="mb-10">
        <MapView
          scope={{ kind: "neighborhood-type-overview", neighborhoodTypes, bbox: bbox ?? undefined }}
          districts={legendDistricts}
          defaultLens="neighborhood"
          height="420px"
          showExpand
        />
      </div>

      <div data-section="list">
        {summaries.length === 0 ? (
          <p className="text-sm text-text-muted">No records yet.</p>
        ) : (
          <DecadeGroup
            items={ordered}
            getYear={(n) => n.earliestYear ?? null}
            getKey={(n) => n.id}
            formatCount={(count) => formatCount(count, "district", "districts")}
            renderItem={(n) => (
              <EntityCard
                href={`/neighborhoods/${encodeURIComponent(n.slug)}`}
                eyebrow={`${n.parcelCount} properties`}
                title={n.label}
                subtitle={
                  n.earliestYear
                    ? `First built ${n.earliestYear}${n.medianYear ? ` · Median ${n.medianYear}` : ""}`
                    : n.medianYear
                    ? `Median ${n.medianYear}`
                    : undefined
                }
              />
            )}
          />
        )}
      </div>
    </>
  );
}

/**
 * The one page body shared by /neighborhoods, /planning-districts, and
 * /business-districts. Every one of those 3 routes must render ONLY this
 * component -- no page may hand-assemble its own Breadcrumb/PageHeader/
 * charts/source-note, or it can silently end up with content the other
 * two don't have (this happened once already: /neighborhoods hand-rolled
 * an extra intro paragraph and a NeighborhoodCharts block neither sibling
 * page had). Section order fixed here matches CLAUDE.md's canonical order:
 * intro links -> stat grid (charts) -> map -> sub-entity list -> source note.
 */
export function NeighborhoodTypeIndexPage({
  neighborhoodTypes,
  breadcrumbLabel,
  title,
  subtitle,
  summaries,
  bbox,
  siblingLinks,
  icon,
}: Props) {
  return (
    <div className="page-shell">
      <div data-section="breadcrumb">
        <Breadcrumb
          items={[
            { label: "Park Ridge", href: "/city" },
            { label: breadcrumbLabel, current: true },
          ]}
        />
      </div>
      <div data-section="header">
        <PageHeader eyebrow="Park Ridge" title={title} subtitle={subtitle} icon={icon} />
      </div>

      <NeighborhoodFamilyLinks links={siblingLinks} />

      <div data-section="charts" className="mb-10">
        <NeighborhoodCharts neighborhoodTypes={neighborhoodTypes} />
      </div>

      <NeighborhoodTypeOverview neighborhoodTypes={neighborhoodTypes} summaries={summaries} bbox={bbox} />

      <div data-section="source-note">
        <InlineSourceNote>{NEIGHBORHOOD_BOUNDARY_DISCLAIMER}</InlineSourceNote>
      </div>
    </div>
  );
}
