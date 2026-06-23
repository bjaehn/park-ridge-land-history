"use client";

import { useState, useEffect, useMemo } from "react";
import { LoadingSkeleton } from "@/components/ui/EmptyState";
import { EntityCard } from "@/components/ui/EntityCard";
import type { MetaItem } from "@/components/ui/EntityCard";
import { SubdivisionIcon } from "@/lib/icons";
import { formatCount } from "@/lib/formatters";
import { getEraColor } from "@/lib/mapConfig";
import { fetchSubdivisions } from "@/lib/supabase/subdivisionQueries";
import type { SubdivisionSummary } from "@/lib/subdivisionTypes";

export function SubdivisionsContent() {
  const [subdivisions, setSubdivisions] = useState<SubdivisionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubdivisions()
      .then((data) => setSubdivisions(data))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    subdivisions.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [subdivisions]);

  const grouped = useMemo(() => {
    const byDecade = new Map<string, SubdivisionSummary[]>();
    subdivisions.forEach((s) => {
      const key = s.recorded_year
        ? `${Math.floor(s.recorded_year / 10) * 10}s`
        : "Date uncertain";
      const arr = byDecade.get(key) ?? [];
      arr.push(s);
      byDecade.set(key, arr);
    });
    return Array.from(byDecade.entries()).sort(([a], [b]) => {
      if (a === "Date uncertain") return 1;
      if (b === "Date uncertain") return -1;
      return a.localeCompare(b);
    });
  }, [subdivisions]);

  if (loading) return <LoadingSkeleton rows={3} />;

  if (subdivisions.length === 0) {
    return (
      <p className="text-text-muted text-sm py-12">No subdivisions on record yet.</p>
    );
  }

  return (
    <div className="space-y-8">
      {grouped.map(([decade, group]) => {
        const decadeYear = decade === "Date uncertain" ? null : parseInt(decade);
        return (
          <div key={decade} id={`decade-${decade.replace(/\s/g, "-")}`}>
            <div className="flex items-center gap-3 mb-3">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: getEraColor(decadeYear ?? undefined) ?? "#64748b" }}
                aria-hidden="true"
              />
              <span className="text-sm font-semibold text-text-secondary tracking-wide">
                {decade}
              </span>
              <div className="flex-1 border-t border-surface-border" />
              <span className="text-xs text-text-muted">
                {formatCount(group.length, "plat", "plats")}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {group.map((s) => {
                const developer = s.original_owner ?? s.developer ?? null;
                const parentName = s.parent_subdivision_id
                  ? (nameById.get(s.parent_subdivision_id) ?? null)
                  : null;
                const metaItems: MetaItem[] = s.parcel_count != null
                  ? [{ icon: <SubdivisionIcon size={11} />, value: formatCount(s.parcel_count, "lot", "lots") }]
                  : [];
                return (
                  <EntityCard
                    key={s.id}
                    href={`/subdivisions/${encodeURIComponent(s.id)}`}
                    title={s.name}
                    subtitle={developer ?? undefined}
                    meta={parentName ? `Part of ${parentName}` : undefined}
                    metaItems={metaItems}
                    eraSwatch={getEraColor(s.recorded_year) ?? undefined}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
