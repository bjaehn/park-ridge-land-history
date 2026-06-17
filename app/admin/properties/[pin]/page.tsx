import { notFound } from "next/navigation";
import Link from "next/link";
import { adminSupabase } from "@/lib/supabase/adminClient";
import { ParcelForm } from "../_ParcelForm";
import { SubdivisionLinkEditor } from "../_SubdivisionLinkEditor";
import { PropertyEventEditor } from "../_PropertyEventEditor";
import { ChangeEventEditor } from "../_ChangeEventEditor";

export default async function EditPropertyPage({ params }: { params: { pin: string } }) {
  const pin = decodeURIComponent(params.pin);

  const [
    { data: parcel },
    { data: linksRaw },
    { data: eventsRaw },
    { data: changeEventsRaw },
    { data: allSubdivisionsRaw },
  ] = await Promise.all([
    adminSupabase
      .from("parcels")
      .select("pin_normalized, address, year_built, property_class, building_sqft, land_sqft, municipality, pin_township, pin_section, pin_block, pin_parcel, pin_unit")
      .eq("pin_normalized", pin)
      .single(),
    adminSupabase
      .from("property_subdivision_links")
      .select("id, subdivision_id, lot_number, block_number, match_method, confidence_level, confidence_reason, source_name, source_reference, subdivisions(name)")
      .eq("pin", pin)
      .order("confidence_level"),
    adminSupabase
      .from("property_events")
      .select("id, event_type, event_year, event_date, title, description, price, amount")
      .eq("pin", pin)
      .order("event_year", { ascending: false, nullsFirst: false }),
    adminSupabase
      .from("parcel_change_events")
      .select("id, event_type, event_date, event_year, date_precision, description, plat_book, plat_page, document_number, confidence_level, notes, parcel_lineage_edges(id, pin, side, notes)")
      .order("event_year", { ascending: false, nullsFirst: false }),
    adminSupabase.from("subdivisions").select("id, name").order("name"),
  ]);

  if (!parcel) notFound();

  const links = linksRaw ?? [];
  const events = eventsRaw ?? [];
  const changeEvents = changeEventsRaw ?? [];
  const allSubdivisions = allSubdivisionsRaw ?? [];

  // Shape links to include a flat subdivision_name
  const shapedLinks = links.map((l) => ({
    ...l,
    subdivision_name: ((l.subdivisions as unknown) as { name: string } | null)?.name ?? null,
  }));

  // Shape change events to include nested edges
  const shapedChangeEvents = changeEvents.map((ev) => ({
    ...ev,
    edges: ((ev.parcel_lineage_edges ?? []) as unknown) as Array<{ id: string; pin: string; side: string; notes: string | null }>,
  }));

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-widest uppercase text-text-secondary mb-2">
          Admin ·{" "}
          <Link href="/admin/properties" className="hover:text-text-primary transition-colors">
            Properties
          </Link>
        </p>
        <h1 className="text-2xl font-bold text-text-primary font-mono">{pin}</h1>
        {parcel.address && (
          <p className="text-sm text-text-secondary mt-1">{parcel.address}</p>
        )}
      </div>

      <ParcelForm parcel={parcel} />

      <SubdivisionLinkEditor
        links={shapedLinks}
        pin={pin}
        allSubdivisions={allSubdivisions}
      />

      <PropertyEventEditor events={events} pin={pin} />

      <ChangeEventEditor events={shapedChangeEvents} />
    </div>
  );
}
