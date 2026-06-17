import { notFound } from "next/navigation";
import Link from "next/link";
import { adminSupabase } from "@/lib/supabase/adminClient";
import { SubdivisionForm } from "../_SubdivisionForm";
import { TimelineEventEditor } from "../_TimelineEventEditor";
import { SourceEditor } from "../_SourceEditor";
import { AliasEditor } from "../_AliasEditor";
import { LotEditor } from "../_LotEditor";
import { DeleteSubdivisionButton } from "../_DeleteButton";

export default async function EditSubdivisionPage({ params }: { params: { id: string } }) {
  const { id } = params;

  const [
    { data: subdivision },
    { data: eventsRaw },
    { data: sourcesRaw },
    { data: aliasesRaw },
    { data: lotsRaw },
    { data: allSubdivisionsRaw },
    { data: childrenRaw },
  ] = await Promise.all([
    adminSupabase.from("subdivisions").select("*").eq("id", id).single(),
    adminSupabase
      .from("subdivision_timeline_events")
      .select("id, event_year, event_date, event_type, title, description, source_name, source_reference, confidence_level")
      .eq("subdivision_id", id)
      .order("event_year", { ascending: true, nullsFirst: false }),
    adminSupabase
      .from("subdivision_sources")
      .select("id, source_type, source_name, source_reference, source_url, retrieved_at, notes")
      .eq("subdivision_id", id)
      .order("source_name"),
    adminSupabase
      .from("subdivision_aliases")
      .select("id, alias, alias_type, confidence")
      .eq("subdivision_id", id)
      .order("alias"),
    adminSupabase
      .from("subdivision_lots")
      .select("id, lot_number, block_number, current_pin, current_address, lot_status, match_method, confidence_level, notes")
      .eq("subdivision_id", id)
      .order("block_number", { ascending: true, nullsFirst: false })
      .order("lot_number"),
    adminSupabase.from("subdivisions").select("id, name").order("name"),
    adminSupabase
      .from("subdivisions")
      .select("id, name")
      .eq("parent_subdivision_id", id)
      .order("name"),
  ]);

  if (!subdivision) notFound();

  const events = eventsRaw ?? [];
  const sources = sourcesRaw ?? [];
  const aliases = aliasesRaw ?? [];
  const lots = lotsRaw ?? [];
  const allSubdivisions = allSubdivisionsRaw ?? [];
  const children = childrenRaw ?? [];

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-text-secondary mb-2">
            Admin ·{" "}
            <Link href="/admin/subdivisions" className="hover:text-text-primary transition-colors">
              Subdivisions
            </Link>
          </p>
          <h1 className="text-2xl font-bold text-text-primary">{subdivision.name}</h1>
          {subdivision.entity_type && (
            <p className="text-sm text-text-secondary mt-1 capitalize">{subdivision.entity_type}</p>
          )}
        </div>
        <DeleteSubdivisionButton id={id} />
      </div>

      <SubdivisionForm
        subdivision={subdivision}
        allSubdivisions={allSubdivisions}
        children={children}
      />

      <TimelineEventEditor events={events} subdivisionId={id} />
      <SourceEditor sources={sources} subdivisionId={id} />
      <AliasEditor aliases={aliases} subdivisionId={id} />
      <LotEditor lots={lots} subdivisionId={id} />
    </div>
  );
}
