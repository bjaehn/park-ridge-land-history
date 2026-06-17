"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertSource, deleteSource } from "../_actions/subdivisions";

const INPUT = "w-full bg-surface-card border border-surface-border rounded px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-teal/60 transition-colors";
const LABEL = "block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1";

type Source = {
  id: string;
  source_type: string | null;
  source_name: string;
  source_reference: string | null;
  source_url: string | null;
  retrieved_at: string | null;
  notes: string | null;
};

export function SourceEditor({ sources, subdivisionId }: { sources: Source[]; subdivisionId: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editId, setEditId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>, sourceId?: string) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErr(null);
    startTransition(() => {
      upsertSource(subdivisionId, sourceId ?? null, fd).then((r) => {
        if (r?.error) { setErr(r.error); return; }
        setEditId(null);
        setShowAdd(false);
        router.refresh();
      });
    });
  }

  function del(id: string) {
    if (!confirm("Delete this source?")) return;
    startTransition(() => {
      deleteSource(id, subdivisionId).then(() => router.refresh());
    });
  }

  return (
    <section className="bg-surface-raised rounded-lg border border-surface-border p-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary">Sources</h3>
        <button type="button" onClick={() => { setShowAdd(true); setEditId(null); }}
          className="text-xs bg-accent-teal/10 text-accent-teal border border-accent-teal/30 rounded px-3 py-1.5 hover:bg-accent-teal/20 transition-colors">
          + Add Source
        </button>
      </div>

      {err && <p className="text-accent-red text-xs mb-3">{err}</p>}
      {sources.length === 0 && !showAdd && <p className="text-xs text-text-muted">No sources yet.</p>}

      <div className="divide-y divide-surface-border/50">
        {sources.map((s) =>
          editId === s.id ? (
            <div key={s.id} className="py-3">
              <SourceForm item={s} onSubmit={(e) => submit(e, s.id)} onCancel={() => setEditId(null)} />
            </div>
          ) : (
            <div key={s.id} className="py-2.5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {s.source_type && <span className="text-xs text-text-muted">{s.source_type}</span>}
                </div>
                <p className="text-sm text-text-primary font-medium">{s.source_name}</p>
                {s.source_reference && <p className="text-xs text-text-secondary mt-0.5">{s.source_reference}</p>}
                {s.source_url && (
                  <a href={s.source_url} target="_blank" rel="noopener" className="text-xs text-accent-purple hover:underline truncate block max-w-xs mt-0.5">
                    {s.source_url}
                  </a>
                )}
              </div>
              <div className="flex gap-3 shrink-0">
                <button onClick={() => { setEditId(s.id); setShowAdd(false); }}
                  className="text-xs text-text-secondary hover:text-text-primary transition-colors">Edit</button>
                <button onClick={() => del(s.id)}
                  className="text-xs text-accent-red hover:opacity-80 transition-opacity">Delete</button>
              </div>
            </div>
          )
        )}
      </div>

      {showAdd && (
        <div className="mt-4 pt-4 border-t border-surface-border">
          <SourceForm onSubmit={(e) => submit(e)} onCancel={() => setShowAdd(false)} />
        </div>
      )}
    </section>
  );
}

function SourceForm({ item, onSubmit, onCancel }: { item?: Source; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={LABEL}>Source Name <span className="text-accent-red">*</span></label>
          <input name="source_name" defaultValue={item?.source_name ?? ""} required className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Source Type</label>
          <input name="source_type" defaultValue={item?.source_type ?? ""} placeholder="plat_record, deed, map…" className={INPUT} />
        </div>
      </div>
      <div>
        <label className={LABEL}>Reference</label>
        <input name="source_reference" defaultValue={item?.source_reference ?? ""} className={INPUT} />
      </div>
      <div>
        <label className={LABEL}>URL</label>
        <input name="source_url" type="url" defaultValue={item?.source_url ?? ""} placeholder="https://…" className={INPUT} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={LABEL}>Retrieved At</label>
          <input name="retrieved_at" type="date" defaultValue={item?.retrieved_at?.slice(0, 10) ?? ""} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Notes</label>
          <input name="notes" defaultValue={item?.notes ?? ""} className={INPUT} />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="bg-accent-teal text-surface-base font-semibold px-3 py-1.5 rounded text-xs hover:opacity-90 transition-opacity">Save</button>
        <button type="button" onClick={onCancel} className="bg-surface-card border border-surface-border text-text-secondary rounded px-3 py-1.5 text-xs hover:border-accent-teal/30 transition-colors">Cancel</button>
      </div>
    </form>
  );
}
