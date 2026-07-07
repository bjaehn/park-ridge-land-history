import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { PageHeader } from "@/components/ui/PageHeader";
import { InlineSourceNote } from "@/components/ui/SourceNote";
import { EntityCard } from "@/components/ui/EntityCard";
import { MapView } from "@/components/MapView";
import { getEraColor } from "@/lib/mapConfig";
import { formatCount } from "@/lib/formatters";
import { NEIGHBORHOOD_BOUNDARY_DISCLAIMER } from "@/lib/content";
import type { NeighborhoodSummary } from "@/lib/data/neighborhoods";

type Props = {
  neighborhoodType: "official_planning" | "business_district";
  breadcrumbLabel: string;
  title: string;
  subtitle: string;
  summaries: NeighborhoodSummary[];
  bbox: [number, number, number, number] | null;
};

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

export function NeighborhoodTypeIndexPage({
  neighborhoodType,
  breadcrumbLabel,
  title,
  subtitle,
  summaries,
  bbox,
}: Props) {
  const decades = groupByDecade(summaries);

  return (
    <div className="page-shell">
      <Breadcrumb
        items={[
          { label: "Park Ridge", href: "/city" },
          { label: breadcrumbLabel, current: true },
        ]}
      />
      <PageHeader eyebrow="Park Ridge" title={title} subtitle={subtitle} />

      <div className="mb-10">
        <MapView
          scope={{ kind: "neighborhood-type-overview", neighborhoodType, bbox: bbox ?? undefined }}
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

      <InlineSourceNote>{NEIGHBORHOOD_BOUNDARY_DISCLAIMER}</InlineSourceNote>
    </div>
  );
}
