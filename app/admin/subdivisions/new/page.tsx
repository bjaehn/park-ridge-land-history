import { adminSupabase } from "@/lib/supabase/adminClient";
import { SubdivisionForm } from "../_SubdivisionForm";

export default async function NewSubdivisionPage() {
  const { data: allSubdivisionsRaw } = await adminSupabase
    .from("subdivisions")
    .select("id, name")
    .order("name");
  const allSubdivisions = allSubdivisionsRaw ?? [];

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-widest uppercase text-text-secondary mb-2">
          Admin · Subdivisions
        </p>
        <h1 className="text-2xl font-bold text-text-primary">New Subdivision</h1>
      </div>
      <SubdivisionForm allSubdivisions={allSubdivisions} />
    </div>
  );
}
