"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertAlias, deleteAlias } from "../_actions/subdivisions";

const INPUT = "w-full bg-surface-card border border-surface-border rounded px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-teal/60 transition-colors";
const LABEL = "block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1";
const SELECT = "w-full bg-surface-card border border-surface-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent-teal/60 transition-colors";

type Alias = { id: string; alias: string; alias_type: string | null; confidence: string };

export function AliasEditor({ aliases, subdivisionId }: { aliases: Alias[]; subdivisionId: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editId, setEditId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>, aliasId?: string) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErr(null);
    startTransition(() => {
      upsertAlias(subdivisionId, aliasId ?? null, fd).then((r) => {
        if (r?.error) { setErr(r.error); return; }
        setEditId(null);
        setShowAdd(false);
        router.refresh();
      });
    });
  }

  function del(id: string) {
    if (!confirm("Delete this alias?")) return;
    startTransition(() => {
      deleteAlias(id, subdivisionId).then(() => router.refresh());
    });
  }

  return (
    <section className="bg-surface-raised rounded-lg border border-surface-border p-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary">Aliases</h3>
        <button type="button" onClick={() => { setShowAdd(true); setEditId(null); }}
          className="text-xs bg-accent-teal/10 text-accent-teal border border-accent-teal/30 rounded px-3 py-1.5 hover:bg-accent-teal/20 transition-colors">
          + Add Alias
        </button>
      </div>

      {err && <p className="text-accent-red text-xs mb-3">{err}</p>}
      {aliases.length === 0 && !showAdd && <p className="text-xs text-text-muted">No aliases yet.</p>}

      <div className="divide-y divide-surface-border/50">
        {aliases.map((a) =>
          editId === a.id ? (
            <div key={a.id} className="py-3">
              <AliasForm item={a} onSubmit={(e) => submit(e, a.id)} onCancel={() => setEditId(null)} />
            </div>
          ) : (
            <div key={a.id} className="py-2.5 flex items-center justify-between gap-3">
              <div>
                <span className="text-sm text-text-primary">{a.alias}</span>
                {a.alias_type && <span className="ml-2 text-xs text-text-muted">({a.alias_type})</span>}
                <span className="ml-2 text-xs text-text-muted capitalize">[{a.confidence}]</span>
              </div>
              <div className="flex gap-3 shrink-0">
                <button onClick={() => { setEditId(a.id); setShowAdd(false); }}
                  className="text-xs text-text-secondary hover:text-text-primary transition-colors">Edit</button>
                <button onClick={() => del(a.id)}
                  className="text-xs text-accent-red hover:opacity-80 transition-opacity">Delete</button>
              </div>
            </div>
          )
        )}
      </div>

      {showAdd && (
        <div className="mt-4 pt-4 border-t border-surface-border">
          <AliasForm onSubmit={(e) => submit(e)} onCancel={() => setShowAdd(false)} />
        </div>
      )}
    </section>
  );
}

function AliasForm({ item, onSubmit, onCancel }: { item?: Alias; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className={LABEL}>Alias <span className="text-accent-red">*</span></label>
          <input name="alias" defaultValue={item?.alias ?? ""} required className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Type</label>
          <input name="alias_type" defaultValue={item?.alias_type ?? ""} placeholder="common_name, abbreviation…" className={INPUT} />
        </div>
      </div>
      <div>
        <label className={LABEL}>Confidence</label>
        <select name="confidence" defaultValue={item?.confidence ?? "unknown"} className={SELECT}>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
          <option value="unknown">Unknown</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="bg-accent-teal text-surface-base font-semibold px-3 py-1.5 rounded text-xs hover:opacity-90 transition-opacity">Save</button>
        <button type="button" onClick={onCancel} className="bg-surface-card border border-surface-border text-text-secondary rounded px-3 py-1.5 text-xs hover:border-accent-teal/30 transition-colors">Cancel</button>
      </div>
    </form>
  );
}
