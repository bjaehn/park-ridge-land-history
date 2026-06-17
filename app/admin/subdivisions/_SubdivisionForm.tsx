"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createSubdivision,
  updateSubdivision,
} from "../_actions/subdivisions";

const INPUT =
  "w-full bg-surface-card border border-surface-border rounded px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-teal/60 transition-colors";
const LABEL = "block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5";
const SELECT =
  "w-full bg-surface-card border border-surface-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent-teal/60 transition-colors";
const TEXTAREA =
  "w-full bg-surface-card border border-surface-border rounded px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-teal/60 transition-colors resize-none";
const SECTION = "bg-surface-raised rounded-lg border border-surface-border p-5 mb-5";

type SubdivisionData = {
  id?: string;
  name?: string | null;
  normalized_name?: string | null;
  display_name?: string | null;
  slug?: string | null;
  alternate_names?: string[] | null;
  entity_type?: string | null;
  recorded_date?: string | null;
  recorded_year?: number | null;
  development_era_start_year?: number | null;
  development_era_end_year?: number | null;
  plat_book?: string | null;
  plat_page?: string | null;
  document_number?: string | null;
  original_owner?: string | null;
  developer?: string | null;
  surveyor?: string | null;
  confidence_level?: string | null;
  confidence_reason?: string | null;
  status?: string | null;
  geometry_status?: string | null;
  source_name?: string | null;
  source_reference?: string | null;
  source_url?: string | null;
  notes?: string | null;
  historical_summary?: string | null;
  parent_subdivision_id?: string | null;
  parcel_count?: number | null;
};

type AllSubdivision = { id: string; name: string };
type ChildSubdivision = { id: string; name: string };

export function SubdivisionForm({
  subdivision,
  allSubdivisions,
  children: childSubdivisions = [],
}: {
  subdivision?: SubdivisionData;
  allSubdivisions: AllSubdivision[];
  children?: ChildSubdivision[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [altNames, setAltNames] = useState<string[]>(subdivision?.alternate_names ?? []);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isEdit = !!subdivision?.id;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    // Inject current altNames as form data entries
    fd.delete("alternate_names");
    altNames.filter(Boolean).forEach((n) => fd.append("alternate_names", n));

    setError(null);
    setSaved(false);

    startTransition(() => {
      if (isEdit) {
        updateSubdivision(subdivision!.id!, fd).then((r) => {
          if (r?.error) { setError(r.error); return; }
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
          router.refresh();
        });
      } else {
        createSubdivision(fd).then((r) => {
          if (r?.error) { setError(r.error); return; }
          if (r?.id) router.push(`/admin/subdivisions/${r.id}`);
        });
      }
    });
  }

  const others = allSubdivisions.filter((s) => s.id !== subdivision?.id);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* ── Core ── */}
      <div className={SECTION}>
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Core</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL}>Name <span className="text-accent-red">*</span></label>
            <input name="name" defaultValue={subdivision?.name ?? ""} required className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Display Name</label>
            <input name="display_name" defaultValue={subdivision?.display_name ?? ""} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Normalized Name</label>
            <input name="normalized_name" defaultValue={subdivision?.normalized_name ?? ""} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Slug</label>
            <input name="slug" defaultValue={subdivision?.slug ?? ""} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Entity Type</label>
            <select name="entity_type" defaultValue={subdivision?.entity_type ?? ""} className={SELECT}>
              <option value="">— select —</option>
              <option value="subdivision">Subdivision</option>
              <option value="estate">Estate</option>
              <option value="parent_plat">Parent Plat</option>
              <option value="plat">Plat</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Parcel Count</label>
            <input name="parcel_count" type="number" defaultValue={subdivision?.parcel_count ?? ""} className={INPUT} />
          </div>
        </div>

        {/* Alternate Names */}
        <div className="mt-4">
          <label className={LABEL}>Alternate Names</label>
          <div className="space-y-2">
            {altNames.map((name, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    const u = [...altNames];
                    u[i] = e.target.value;
                    setAltNames(u);
                  }}
                  className={INPUT + " flex-1"}
                  placeholder="Alternate name…"
                />
                <button
                  type="button"
                  onClick={() => setAltNames(altNames.filter((_, j) => j !== i))}
                  className="text-accent-red border border-accent-red/30 rounded px-2 py-1 text-xs hover:bg-accent-red/10 transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setAltNames([...altNames, ""])}
              className="text-xs text-text-secondary border border-surface-border rounded px-3 py-1.5 hover:border-accent-teal/30 transition-colors"
            >
              + Add Name
            </button>
          </div>
        </div>
      </div>

      {/* ── Dates ── */}
      <div className={SECTION}>
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Dates</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={LABEL}>Recorded Date</label>
            <input name="recorded_date" type="date" defaultValue={subdivision?.recorded_date ?? ""} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Recorded Year</label>
            <input name="recorded_year" type="number" defaultValue={subdivision?.recorded_year ?? ""} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Era Start Year</label>
            <input name="development_era_start_year" type="number" defaultValue={subdivision?.development_era_start_year ?? ""} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Era End Year</label>
            <input name="development_era_end_year" type="number" defaultValue={subdivision?.development_era_end_year ?? ""} className={INPUT} />
          </div>
        </div>
      </div>

      {/* ── Plat Reference ── */}
      <div className={SECTION}>
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Plat Reference</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={LABEL}>Plat Book</label>
            <input name="plat_book" defaultValue={subdivision?.plat_book ?? ""} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Plat Page</label>
            <input name="plat_page" defaultValue={subdivision?.plat_page ?? ""} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Document Number</label>
            <input name="document_number" defaultValue={subdivision?.document_number ?? ""} className={INPUT} />
          </div>
        </div>
      </div>

      {/* ── People ── */}
      <div className={SECTION}>
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">People</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={LABEL}>Original Owner</label>
            <input name="original_owner" defaultValue={subdivision?.original_owner ?? ""} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Developer</label>
            <input name="developer" defaultValue={subdivision?.developer ?? ""} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Surveyor</label>
            <input name="surveyor" defaultValue={subdivision?.surveyor ?? ""} className={INPUT} />
          </div>
        </div>
      </div>

      {/* ── Confidence & Status ── */}
      <div className={SECTION}>
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Confidence &amp; Status</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL}>Confidence Level</label>
            <select name="confidence_level" defaultValue={subdivision?.confidence_level ?? "unknown"} className={SELECT}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Research Status</label>
            <select name="status" defaultValue={subdivision?.status ?? ""} className={SELECT}>
              <option value="">— select —</option>
              <option value="verified">Verified</option>
              <option value="partially_verified">Partially Verified</option>
              <option value="research_candidate">Research Candidate</option>
              <option value="needs_manual_review">Needs Manual Review</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL}>Confidence Reason</label>
            <input name="confidence_reason" defaultValue={subdivision?.confidence_reason ?? ""} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Geometry Status</label>
            <select name="geometry_status" defaultValue={subdivision?.geometry_status ?? ""} className={SELECT}>
              <option value="">— select —</option>
              <option value="not_started">Not Started</option>
              <option value="needs_source">Needs Source</option>
              <option value="in_progress">In Progress</option>
              <option value="complete">Complete</option>
              <option value="approximate">Approximate</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Reference ── */}
      <div className={SECTION}>
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Primary Reference</h3>
        <div className="grid gap-4">
          <div>
            <label className={LABEL}>Source Name</label>
            <input name="source_name" defaultValue={subdivision?.source_name ?? ""} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Source Reference</label>
            <input name="source_reference" defaultValue={subdivision?.source_reference ?? ""} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Source URL</label>
            <input name="source_url" type="url" defaultValue={subdivision?.source_url ?? ""} className={INPUT} placeholder="https://…" />
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className={SECTION}>
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Content</h3>
        <div className="space-y-4">
          <div>
            <label className={LABEL}>Historical Summary</label>
            <textarea name="historical_summary" defaultValue={subdivision?.historical_summary ?? ""} rows={4} className={TEXTAREA} />
          </div>
          <div>
            <label className={LABEL}>Internal Notes</label>
            <textarea name="notes" defaultValue={subdivision?.notes ?? ""} rows={3} className={TEXTAREA} />
          </div>
        </div>
      </div>

      {/* ── Hierarchy ── */}
      <div className={SECTION}>
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Hierarchy</h3>
        <div>
          <label className={LABEL}>Parent Subdivision</label>
          <select name="parent_subdivision_id" defaultValue={subdivision?.parent_subdivision_id ?? ""} className={SELECT}>
            <option value="">— none —</option>
            {others.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        {childSubdivisions.length > 0 && (
          <div className="mt-4">
            <p className={LABEL}>Child Subdivisions</p>
            <ul className="space-y-1">
              {childSubdivisions.map((c) => (
                <li key={c.id}>
                  <a
                    href={`/admin/subdivisions/${c.id}`}
                    className="text-sm text-accent-purple hover:underline"
                  >
                    {c.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── Actions ── */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="bg-accent-teal text-surface-base font-semibold px-5 py-2 rounded text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Subdivision"}
        </button>
        {error && <p className="text-accent-red text-sm">{error}</p>}
        {saved && <p className="text-confidence-high text-sm">Saved!</p>}
      </div>
    </form>
  );
}
