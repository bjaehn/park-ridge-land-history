import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { PageHeader } from "@/components/ui/PageHeader";
import { InlineSourceNote } from "@/components/ui/SourceNote";
import { EntityCard } from "@/components/ui/EntityCard";
import { MapView } from "@/components/MapView";
import { getEraColor } from "@/lib/mapConfig";
import { formatCount } from "@/lib/formatters";
import { NEIGHBORHOOD_BOUNDARY_DISCLAIMER } from "@/lib/content";
import type { NeighborhoodSummary, NeighborhoodType } from "@/lib/data/neighborhoods";

type OverviewProps = {
  neighborhoodTypes: NeighborhoodType[];
  summaries: NeighborhoodSummary[];
  bbox: [number, number, number, number] | null;
};

type Props = OverviewProps & {
  breadcrumbLabel: string;
  title: string;
  subtitle: string;
};

// Chronological by earliestYear (first built), Unknown last -- this is the
// SAME order used to assign map/legend colors, so the map, the legend, and
// this card list can never disagree about which district is which color.
function sortChronological(items: NeighborhoodSummary[]): NeighborhoodSummary[] {
  return [...items].sort((a, b) => (a.earliestYear ?? Infinity) - (b.earliestYear ?? Infinity));
}

// Same decade-grouping structure as app/pin/[prefix]/_PinGroupContent.tsx
// (lines 310-352, per CLAUDE.md) -- grouped by earliestYear (first built),
// not medianYear, per the "organize by first built year" requirement.
function groupByDecade(items: NeighborhoodSummary[]): [string, NeighborhoodSummary[]][] {
  const byDecade = new Map<string, NeighborhoodSummary[]>();
  items.forEach((n) => {
    const key = n.earliestYear ? `${Math.floor(n.earliestYear / 10) * 10}s` : "Unknown";
    const arr = byDecade.get(key) ?? [];
    arr.push(n);
    byDecade.set(key, arr);
  });
  return Array.from(byDecade.entries()).sort(([a], [b]) => {
    if (a === "Unknown") return 1;
    if (b === "Unknown") return -1;
    return a.localeCompare(b);
  });
}

/**
 * Map + decade-grouped district cards, shared by /planning-districts,
 * /business-districts, and /neighborhoods (Corridor + Local/Market). Has no
 * breadcrumb/header/source-note of its own so a caller can embed it inside
 * a page with its own intro text or extra sections (e.g. /neighborhoods'
 * NeighborhoodCharts) while still sharing this exact map+legend+list layout.
 */
export function NeighborhoodTypeOverview({ neighborhoodTypes, summaries, bbox }: OverviewProps) {
  const ordered = sortChronological(summaries);
  const decades = groupByDecade(ordered);
  const legendDistricts = ordered.map((n) => ({ id: n.id, label: n.label, slug: n.slug }));

  return (
    <>
      <div className="mb-10">
        <MapView
          scope={{ kind: "neighborhood-type-overview", neighborhoodTypes, bbox: bbox ?? undefined }}
          districts={legendDistricts}
          defaultLens="neighborhood"
          height="420px"
          showExpand
        />
      </div>

      {summaries.length === 0 ? (
        <p className="text-sm text-text-muted">No records yet.</p>
      ) : (
        <div className="space-y-8">
          {decades.map(([decade, group]) => {
            const decadeYear = decade === "Unknown" ? null : parseInt(decade);
            return (
              <div key={decade}>
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: getEraColor(decadeYear ?? undefined) ?? "#64748b" }}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-semibold text-text-secondary tracking-wide">
                    {decadeYear ? decade : "Unknown era"}
                  </span>
                  <div className="flex-1 border-t border-surface-border" />
                  <span className="text-xs text-text-muted">
                    {formatCount(group.length, "district", "districts")}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.map((n) => (
                    <EntityCard
                      key={n.id}
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
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

export function NeighborhoodTypeIndexPage({
  neighborhoodTypes,
  breadcrumbLabel,
  title,
  subtitle,
  summaries,
  bbox,
}: Props) {
  return (
    <div className="page-shell">
      <Breadcrumb
        items={[
          { label: "Park Ridge", href: "/city" },
          { label: breadcrumbLabel, current: true },
        ]}
      />
      <PageHeader eyebrow="Park Ridge" title={title} subtitle={subtitle} />

      <NeighborhoodTypeOverview neighborhoodTypes={neighborhoodTypes} summaries={summaries} bbox={bbox} />

      <InlineSourceNote>{NEIGHBORHOOD_BOUNDARY_DISCLAIMER}</InlineSourceNote>
    </div>
  );
}
