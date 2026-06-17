"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  upsertNeighborhoodSubdivisionLink,
  deleteNeighborhoodSubdivisionLink,
} from "../_actions/neighborhoods";

const INPUT = "w-full bg-surface-card border border-surface-border rounded px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-teal/60 transition-colors";
const LABEL = "block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1";
const SELECT = "w-full bg-surface-card border border-surface-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent-teal/60 transition-colors";

type SubdivisionLink = {
  id: string;
  subdivision_id: string | null;
  subdivision_name: string | null;
  relationship_type: string | null;
  notes: string | null;
};

type Subdivision = { id: string; name: string };

export function NeighborhoodSubdivisionLinkEditor({
  links,
  neighborhoodId,
  allSubdivisions,
}: {
  links: SubdivisionLink[];
  neighborhoodId: string;
  allSubdivisions: Subdivision[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editId, setEditId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>, linkId?: string) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErr(null);
    startTransition(() => {
      upsertNeighborhoodSubdivisionLink(neighborhoodId, linkId ?? null, fd).then((r) => {
        if (r?.error) { setErr(r.error); return; }
        setEditId(null);
        setShowAdd(false);
        router.refresh();
      });
    });
  }

  function del(linkId: string) {
    if (!confirm("Remove this subdivision link?")) return;
    startTransition(() => {
      deleteNeighborhoodSubdivisionLink(linkId, neighborhoodId).then(() => router.refresh());
    });
  }

  return (
    <section className="bg-surface-raised rounded-lg border border-surface-border p-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary">
          Subdivision Links <span className="text-text-muted font-normal">({links.length})</span>
        </h3>
        <button
          type="button"
          onClick={() => { setShowAdd(true); setEditId(null); }}
          className="text-xs bg-accent-teal/10 text-accent-teal border border-accent-teal/30 rounded px-3 py-1.5 hover:bg-accent-teal/20 transition-colors"
        >
          + Add Link
        </button>
      </div>

      {err && <p className="text-accent-red text-xs mb-3">{err}</p>}
      {links.length === 0 && !showAdd && (
        <p className="text-xs text-text-muted">No subdivision links yet.</p>
      )}

      <div className="divide-y divide-surface-border/50">
        {links.map((link) =>
          editId === link.id ? (
            <div key={link.id} className="py-3">
              <LinkForm
                item={link}
                allSubdivisions={allSubdivisions}
                onSubmit={(e) => submit(e, link.id)}
                onCancel={() => setEditId(null)}
              />
            </div>
          ) : (
            <div key={link.id} className="py-2.5 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-text-primary font-medium">
                  {link.subdivision_name ?? link.subdivision_id ?? "-"}
                </p>
                {link.relationship_type && (
                  <p className="text-xs text-text-muted">{link.relationship_type}</p>
                )}
                {link.notes && (
                  <p className="text-xs text-text-secondary mt-0.5">{link.notes}</p>
                )}
              </div>
              <div className="flex gap-3 shrink-0">
                <button
                  onClick={() => { setEditId(link.id); setShowAdd(false); }}
                  className="text-xs text-text-secondary hover:text-text-primary transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => del(link.id)}
                  className="text-xs text-accent-red hover:opacity-80 transition-opacity"
                >
                  Remove
                </button>
              </div>
            </div>
          )
        )}
      </div>

      {showAdd && (
        <div className="mt-4 pt-4 border-t border-surface-border">
          <LinkForm
            allSubdivisions={allSubdivisions}
            onSubmit={(e) => submit(e)}
            onCancel={() => setShowAdd(false)}
          />
        </div>
      )}
    </section>
  );
}

function LinkForm({
  item,
  allSubdivisions,
  onSubmit,
  onCancel,
}: {
  item?: SubdivisionLink;
  allSubdivisions: Subdivision[];
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className={LABEL}>Subdivision <span className="text-accent-red">*</span></label>
        <select name="subdivision_id" defaultValue={item?.subdivision_id ?? ""} required className={SELECT}>
          <option value="">-- select --</option>
          {allSubdivisions.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={LABEL}>Relationship Type</label>
        <input
          name="relationship_type"
          defaultValue={item?.relationship_type ?? ""}
          placeholder="contains, overlaps, adjacent…"
          className={INPUT}
        />
      </div>
      <div>
        <label className={LABEL}>Notes</label>
        <input name="notes" defaultValue={item?.notes ?? ""} className={INPUT} />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="bg-accent-teal text-surface-base font-semibold px-3 py-1.5 rounded text-xs hover:opacity-90 transition-opacity">Save</button>
        <button type="button" onClick={onCancel} className="bg-surface-card border border-surface-border text-text-secondary rounded px-3 py-1.5 text-xs hover:border-accent-teal/30 transition-colors">Cancel</button>
      </div>
    </form>
  );
}
