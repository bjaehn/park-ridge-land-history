"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ParcelForm } from "./_ParcelForm";
import { DeedAnalysisPanel } from "./_DeedAnalysisPanel";
import { updateParcel } from "../_actions/properties";

const LABEL = "block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1";
const SECTION = "bg-surface-raised rounded-lg border border-surface-border p-5 mb-5";
const SELECT = "w-full bg-surface-card border border-surface-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent-teal/60 transition-colors";

type Neighborhood = { id: string; label: string };

type Parcel = {
  pin_normalized: string;
  address: string | null;
  year_built: number | null;
  property_class: string | null;
  building_sqft: number | null;
  land_sqft: number | null;
  municipality: string | null;
  pin_township: string | null;
  pin_section: string | null;
  pin_block: string | null;
  pin_parcel: string | null;
  pin_unit: string | null;
  deed_notes: string | null;
  official_planning_neighborhood_id?: string | null;
  business_district_id?: string | null;
  local_neighborhood_id?: string | null;
};

type Props = {
  parcel: Parcel;
  officialPlanningNeighborhoods: Neighborhood[];
  businessDistrictNeighborhoods: Neighborhood[];
  localMarketNeighborhoods: Neighborhood[];
  allSubdivisions: { id: string; name: string }[];
};

export function PropertyDeedShell({
  parcel,
  officialPlanningNeighborhoods,
  businessDistrictNeighborhoods,
  localMarketNeighborhoods,
  allSubdivisions,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [deedNotes, setDeedNotes] = useState(parcel.deed_notes ?? "");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("deed_notes", deedNotes);
    setError(null);
    setSaved(false);
    startTransition(() => {
      updateParcel(parcel.pin_normalized, fd).then((r) => {
        if (r?.error) { setError(r.error); return; }
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        router.refresh();
      });
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* PIN / Core Fields / Deed Record */}
      <ParcelForm
        parcel={parcel}
        deedNotes={deedNotes}
        onDeedNotesChange={setDeedNotes}
      />

      {/* AI Deed Analysis — not a form input, just rendered inside the form */}
      <div className="mt-8">
      <DeedAnalysisPanel
        pin={parcel.pin_normalized}
        address={parcel.address}
        deedNotes={deedNotes}
        allSubdivisions={allSubdivisions}
        onDeedNotesExtracted={setDeedNotes}
      />
      </div>

      {/* Neighborhood Assignment */}
      <div className={SECTION}>
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Neighborhood Assignment</h3>
        <div className="space-y-4">
          <div>
            <label className={LABEL}>Official Planning Neighborhood</label>
            <select name="official_planning_neighborhood_id" defaultValue={parcel.official_planning_neighborhood_id ?? ""} className={SELECT}>
              <option value="">(none)</option>
              {officialPlanningNeighborhoods.map((n) => (
                <option key={n.id} value={n.id}>{n.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Business District</label>
            <select name="business_district_id" defaultValue={parcel.business_district_id ?? ""} className={SELECT}>
              <option value="">(none)</option>
              {businessDistrictNeighborhoods.map((n) => (
                <option key={n.id} value={n.id}>{n.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Local / Market Neighborhood</label>
            <select name="local_neighborhood_id" defaultValue={parcel.local_neighborhood_id ?? ""} className={SELECT}>
              <option value="">(none)</option>
              {localMarketNeighborhoods.map((n) => (
                <option key={n.id} value={n.id}>{n.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 mt-2 mb-10">
        <button
          type="submit"
          disabled={isPending}
          className="bg-accent-teal text-surface-base font-semibold px-5 py-2 rounded text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save Changes"}
        </button>
        {error && <p className="text-accent-red text-sm">{error}</p>}
        {saved && <p className="text-confidence-high text-sm">Saved!</p>}
      </div>
    </form>
  );
}
