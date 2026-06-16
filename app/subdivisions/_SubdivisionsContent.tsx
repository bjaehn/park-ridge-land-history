"use client";

import { useState, useEffect } from "react";
import { LoadingSkeleton } from "@/components/ui/EmptyState";
import { fetchSubdivisions } from "@/lib/supabase/subdivisionQueries";
import { SubdivisionTree } from "./_SubdivisionTree";
import type { TreeSubdivision } from "./_SubdivisionTree";

export function SubdivisionsContent() {
  const [subdivisions, setSubdivisions] = useState<TreeSubdivision[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubdivisions()
      .then((data) =>
        setSubdivisions(
          data.map((s) => ({
            id: s.id,
            name: s.name,
            recorded_year: s.recorded_year ?? null,
            parcel_count: s.parcel_count ?? null,
            confidence_level: s.confidence_level ?? null,
            parent_subdivision_id: s.parent_subdivision_id ?? null,
          }))
        )
      )
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-0 py-8">
        <LoadingSkeleton rows={1} className="h-14 w-40 mb-8" />
        <div className="flex gap-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <LoadingSkeleton key={i} rows={3} className="w-44 h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (subdivisions.length === 0) {
    return (
      <p className="text-text-muted text-sm text-center py-12">No subdivisions on record yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto pb-6">
      <div className="min-w-max mx-auto py-4">
        <SubdivisionTree subdivisions={subdivisions} />
      </div>
    </div>
  );
}
