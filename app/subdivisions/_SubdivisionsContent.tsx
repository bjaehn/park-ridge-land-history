"use client";

import { useState, useEffect } from "react";
import { EntityCard } from "@/components/ui/EntityCard";
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge";
import { LoadingSkeleton, EmptyState } from "@/components/ui/EmptyState";
import { formatCount, confidenceFor } from "@/lib/formatters";
import type { ConfidenceLevel } from "@/lib/formatters";
import { fetchSubdivisions } from "@/lib/supabase/subdivisionQueries";

type FilterEra = "all" | "pre1920" | "1920s" | "1930s" | "1940s" | "1950s" | "post1960";
type FilterConfidence = "all" | "high" | "medium" | "low";

export function SubdivisionsContent() {
  const [subdivisions, setSubdivisions] = useState<Awaited<ReturnType<typeof fetchSubdivisions>>>([]);
  const [loading, setLoading] = useState(true);
  const [filterEra, setFilterEra] = useState<FilterEra>("all");
  const [filterConfidence, setFilterConfidence] = useState<FilterConfidence>("all");

  useEffect(() => {
    fetchSubdivisions()
      .then(setSubdivisions)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => <LoadingSkeleton key={i} rows={1} className="h-32" />)}
      </div>
    );
  }

  const filtered = subdivisions.filter((s) => {
    if (filterConfidence !== "all" && s.confidence_level !== filterConfidence) return false;
    if (filterEra !== "all") {
      const y = s.recorded_year;
      if (!y) return false;
      if (filterEra === "pre1920" && y >= 1920) return false;
      if (filterEra === "1920s" && (y < 1920 || y >= 1930)) return false;
      if (filterEra === "1930s" && (y < 1930 || y >= 1940)) return false;
      if (filterEra === "1940s" && (y < 1940 || y >= 1950)) return false;
      if (filterEra === "1950s" && (y < 1950 || y >= 1960)) return false;
      if (filterEra === "post1960" && y < 1960) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1 flex-wrap">
          {(["all", "pre1920", "1920s", "1930s", "1940s", "1950s", "post1960"] as FilterEra[]).map((era) => (
            <button
              key={era}
              type="button"
              onClick={() => setFilterEra(era)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${filterEra === era ? "bg-accent-purple/20 border-accent-purple/40 text-accent-purple font-medium" : "border-surface-border text-text-secondary hover:text-text-primary"}`}
            >
              {era === "all" ? "All eras" : era === "pre1920" ? "Before 1920" : era === "post1960" ? "1960 and later" : `${era}s`}
            </button>
          ))}
        </div>
        <div className="flex gap-1 flex-wrap">
          {(["all", "high", "medium", "low"] as FilterConfidence[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFilterConfidence(c)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${filterConfidence === c ? "bg-accent-purple/20 border-accent-purple/40 text-accent-purple font-medium" : "border-surface-border text-text-secondary hover:text-text-primary"}`}
            >
              {c === "all" ? "Any confidence" : `${c.charAt(0).toUpperCase() + c.slice(1)} confidence`}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          heading="No subdivisions match these filters"
          body="Try removing a filter to see more plats."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => {
            const confidence = s.confidence_level as ConfidenceLevel;
            const subtitle = [
              s.recorded_year ? `Recorded ${s.recorded_year}` : "Recording date uncertain",
              s.original_owner ? `Developer: ${s.original_owner}` : null,
              s.parcel_count ? formatCount(s.parcel_count, "lot", "lots") : null,
            ]
              .filter(Boolean)
              .join(". ");
            return (
              <div key={s.id} className="relative">
                <EntityCard
                  href={`/subdivisions/${encodeURIComponent(s.id)}`}
                  eyebrow={s.recorded_year ? `Recorded ${s.recorded_year}` : "Date uncertain"}
                  title={s.name}
                  subtitle={subtitle}
                />
                <div className="absolute top-3 right-3">
                  <ConfidenceBadge level={confidence} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-text-muted">
        Showing {formatCount(filtered.length, "plat", "plats")} of {formatCount(subdivisions.length, "total", "total")}.
      </p>
    </div>
  );
}
