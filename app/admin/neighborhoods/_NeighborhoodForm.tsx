"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createNeighborhood, updateNeighborhood } from "../_actions/neighborhoods";

const INPUT = "w-full bg-surface-card border border-surface-border rounded px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-teal/60 transition-colors";
const LABEL = "block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5";
const TEXTAREA = "w-full bg-surface-card border border-surface-border rounded px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-teal/60 resize-none";
const SECTION = "bg-surface-raised rounded-lg border border-surface-border p-5 mb-5";

type NeighborhoodData = {
  id?: string;
  label?: string | null;
  description?: string | null;
  slug?: string | null;
  historical_summary?: string | null;
  established_year?: number | null;
  notes?: string | null;
};

export function NeighborhoodForm({ neighborhood }: { neighborhood?: NeighborhoodData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isEdit = !!neighborhood?.id;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    setSaved(false);

    startTransition(() => {
      if (isEdit) {
        updateNeighborhood(neighborhood!.id!, fd).then((r) => {
          if (r?.error) { setError(r.error); return; }
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
          router.refresh();
        });
      } else {
        createNeighborhood(fd).then((r) => {
          if (r?.error) { setError(r.error); return; }
          if (r?.id) router.push(`/admin/neighborhoods/${encodeURIComponent(r.id)}`);
        });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className={SECTION}>
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Core</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {!isEdit && (
            <div className="sm:col-span-2">
              <label className={LABEL}>ID <span className="text-accent-red">*</span></label>
              <input
                name="id"
                required
                placeholder="neighborhood:uptown"
                className={INPUT}
              />
              <p className="text-xs text-text-muted mt-1">
                Use format <code className="font-mono">neighborhood:slug</code>. Cannot be changed after creation.
              </p>
            </div>
          )}
          <div>
            <label className={LABEL}>Label <span className="text-accent-red">*</span></label>
            <input name="label" defaultValue={neighborhood?.label ?? ""} required className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Slug</label>
            <input name="slug" defaultValue={neighborhood?.slug ?? ""} placeholder="uptown" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Established Year</label>
            <input name="established_year" type="number" defaultValue={neighborhood?.established_year ?? ""} className={INPUT} />
          </div>
        </div>
        <div className="mt-4">
          <label className={LABEL}>Description</label>
          <textarea name="description" defaultValue={neighborhood?.description ?? ""} rows={3} className={TEXTAREA} />
        </div>
      </div>

      <div className={SECTION}>
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Content</h3>
        <div className="space-y-4">
          <div>
            <label className={LABEL}>Historical Summary</label>
            <textarea name="historical_summary" defaultValue={neighborhood?.historical_summary ?? ""} rows={4} className={TEXTAREA} />
          </div>
          <div>
            <label className={LABEL}>Internal Notes</label>
            <textarea name="notes" defaultValue={neighborhood?.notes ?? ""} rows={3} className={TEXTAREA} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="bg-accent-teal text-surface-base font-semibold px-5 py-2 rounded text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Neighborhood"}
        </button>
        {error && <p className="text-accent-red text-sm">{error}</p>}
        {saved && <p className="text-confidence-high text-sm">Saved!</p>}
      </div>
    </form>
  );
}
