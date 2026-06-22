import { notFound } from "next/navigation";
import Link from "next/link";
import { adminSupabase } from "@/lib/supabase/adminClient";
import { NeighborhoodForm } from "../_NeighborhoodForm";
import { BoundaryEditor } from "../_BoundaryEditor";
import { NeighborhoodSubdivisionLinkEditor } from "../_SubdivisionLinkEditor";
import { StreetAssignmentEditor } from "../_StreetAssignmentEditor";

export default async function EditNeighborhoodPage({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id);

  const [
    { data: neighborhood },
    { data: links = [] },
    { data: allSubdivisions = [] },
    { data: streetRows = [] },
  ] = await Promise.all([
    adminSupabase
      .from("neighborhoods")
      .select("id, label, description, slug, historical_summary, established_year, notes, geometry, neighborhood_type")
      .eq("id", id)
      .single(),
    adminSupabase
      .from("neighborhood_subdivision_links")
      .select("id, subdivision_id, relationship_type, notes, subdivisions(name)")
      .eq("neighborhood_id", id)
      .order("subdivision_id"),
    adminSupabase.from("subdivisions").select("id, name").order("name"),
    adminSupabase.rpc("neighborhood_streets", { p_neighborhood_id: id }),
  ]);

  if (!neighborhood) notFound();

  const shapedLinks = (links ?? []).map((l) => ({
    ...l,
    subdivision_name: ((l.subdivisions as unknown) as { name: string } | null)?.name ?? null,
  }));

  const currentStreets = (streetRows ?? []).map((r: { street_name: string; display_name: string; parcel_count: number }) => ({
    name: r.street_name,
    displayName: r.display_name,
    parcelCount: Number(r.parcel_count),
  }));

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-widest uppercase text-text-secondary mb-2">
          Admin ·{" "}
          <Link href="/admin/neighborhoods" className="hover:text-text-primary transition-colors">
            Neighborhoods
          </Link>
        </p>
        <h1 className="text-2xl font-bold text-text-primary">{neighborhood.label}</h1>
        <p className="text-xs font-mono text-text-muted mt-1">{neighborhood.id}</p>
      </div>

      <NeighborhoodForm neighborhood={neighborhood} />

      <BoundaryEditor
        neighborhoodId={id}
        neighborhoodLabel={neighborhood.label}
        hasGeometry={neighborhood.geometry != null}
      />

      <NeighborhoodSubdivisionLinkEditor
        links={shapedLinks}
        neighborhoodId={id}
        allSubdivisions={allSubdivisions ?? []}
      />

      <StreetAssignmentEditor
        neighborhoodId={id}
        neighborhoodType={neighborhood.neighborhood_type ?? "official_planning"}
        currentStreets={currentStreets}
      />
    </div>
  );
}
