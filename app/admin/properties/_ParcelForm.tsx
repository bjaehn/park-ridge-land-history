"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateParcel } from "../_actions/properties";

const INPUT = "w-full bg-surface-card border border-surface-border rounded px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-teal/60 transition-colors";
const LABEL = "block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1";
const SECTION = "bg-surface-raised rounded-lg border border-surface-border p-5 mb-5";
const SELECT = "w-full bg-surface-card border border-surface-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent-teal/60 transition-colors";

function DeedNotesField({ defaultValue }: { defaultValue: string }) {
  const [val, setVal] = useState(defaultValue);
  const max = 5000;
  return (
    <div>
      <label className={LABEL}>Deed legal description</label>
      <textarea
        name="deed_notes"
        rows={4}
        maxLength={max}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="Paste deed legal description here…"
        className={`${INPUT} resize-y`}
      />
      <p className="text-xs text-text-muted mt-1 text-right">{val.length} / {max}</p>
    </div>
  );
}

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
};

export function ParcelForm({ parcel, officialPlanningNeighborhoods, businessDistrictNeighborhoods, localMarketNeighborhoods }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
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
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* PIN Decomposition */}
      <div className={SECTION}>
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">PIN Decomposition</h3>
        <p className="text-xs text-text-muted mb-4">Cook County 14-digit PIN: chars 1-2 = township, 3-4 = section, 5-7 = block, 8-10 = parcel, 11-14 = unit.</p>
        <div className="mb-3">
          <label className={LABEL}>Full PIN (read-only)</label>
          <input
            value={parcel.pin_normalized}
            readOnly
            className="w-full bg-surface-card border border-surface-border rounded px-3 py-1.5 text-sm font-mono text-text-muted cursor-not-allowed"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-5">
          <div>
            <label className={LABEL}>Township</label>
            <input name="pin_township" defaultValue={parcel.pin_township ?? parcel.pin_normalized.slice(0, 2)} placeholder="xx" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Section</label>
            <input name="pin_section" defaultValue={parcel.pin_section ?? parcel.pin_normalized.slice(2, 4)} placeholder="xx" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Block</label>
            <input name="pin_block" defaultValue={parcel.pin_block ?? parcel.pin_normalized.slice(4, 7)} placeholder="xxx" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Parcel</label>
            <input name="pin_parcel" defaultValue={parcel.pin_parcel ?? parcel.pin_normalized.slice(7, 10)} placeholder="xxx" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Unit</label>
            <input name="pin_unit" defaultValue={parcel.pin_unit ?? parcel.pin_normalized.slice(10, 14)} placeholder="xxxx" className={INPUT} />
          </div>
        </div>
      </div>

      {/* Core Fields */}
      <div className={SECTION}>
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Core Fields</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={LABEL}>Address</label>
            <input name="address" defaultValue={parcel.address ?? ""} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Year Built</label>
            <input name="year_built" type="number" defaultValue={parcel.year_built ?? ""} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Property Class</label>
            <input name="property_class" defaultValue={parcel.property_class ?? ""} placeholder="2-02, 5-11…" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Building Sq Ft</label>
            <input name="building_sqft" type="number" step="0.01" defaultValue={parcel.building_sqft ?? ""} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Land Sq Ft</label>
            <input name="land_sqft" type="number" step="0.01" defaultValue={parcel.land_sqft ?? ""} className={INPUT} />
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL}>Municipality</label>
            <input name="municipality" defaultValue={parcel.municipality ?? ""} className={INPUT} />
          </div>
        </div>
      </div>

      {/* Deed Record */}
      <div className={SECTION}>
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Deed Record</h3>
        <DeedNotesField defaultValue={parcel.deed_notes ?? ""} />
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

      <div className="flex items-center gap-3">
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
