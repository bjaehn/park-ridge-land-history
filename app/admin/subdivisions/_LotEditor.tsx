"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertLot, deleteLot } from "../_actions/subdivisions";

const INPUT = "w-full bg-surface-card border border-surface-border rounded px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-teal/60 transition-colors";
const LABEL = "block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1";
const SELECT = "w-full bg-surface-card border border-surface-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent-teal/60 transition-colors";

type Lot = {
  id: string;
  lot_number: string | null;
  block_number: string | null;
  current_pin: string | null;
  current_address: string | null;
  lot_status: string | null;
  match_method: string | null;
  confidence_level: string;
  notes: string | null;
};

export function LotEditor({ lots, subdivisionId }: { lots: Lot[]; subdivisionId: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editId, setEditId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>, lotId?: string) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErr(null);
    startTransition(() => {
      upsertLot(subdivisionId, lotId ?? null, fd).then((r) => {
        if (r?.error) { setErr(r.error); return; }
        setEditId(null);
        setShowAdd(false);
        router.refresh();
      });
    });
  }

  function del(id: string) {
    if (!confirm("Delete this lot?")) return;
    startTransition(() => {
      deleteLot(id, subdivisionId).then(() => router.refresh());
    });
  }

  return (
    <section className="bg-surface-raised rounded-lg border border-surface-border p-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary">
          Lots <span className="text-text-muted font-normal">({lots.length})</span>
        </h3>
        <button type="button" onClick={() => { setShowAdd(true); setEditId(null); }}
          className="text-xs bg-accent-teal/10 text-accent-teal border border-accent-teal/30 rounded px-3 py-1.5 hover:bg-accent-teal/20 transition-colors">
          + Add Lot
        </button>
      </div>

      {err && <p className="text-accent-red text-xs mb-3">{err}</p>}
      {lots.length === 0 && !showAdd && <p className="text-xs text-text-muted">No lots yet.</p>}

      {lots.length > 0 && (
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-surface-border">
                {["Block", "Lot", "PIN", "Address", "Status", "Confidence", ""].map((h) => (
                  <th key={h} className="text-left px-2 py-2 font-semibold text-text-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border/50">
              {lots.map((lot) =>
                editId === lot.id ? (
                  <tr key={lot.id}>
                    <td colSpan={7} className="py-3 px-2">
                      <LotForm item={lot} onSubmit={(e) => submit(e, lot.id)} onCancel={() => setEditId(null)} />
                    </td>
                  </tr>
                ) : (
                  <tr key={lot.id} className="hover:bg-surface-card transition-colors">
                    <td className="px-2 py-2 text-text-secondary">{lot.block_number ?? "-"}</td>
                    <td className="px-2 py-2 text-text-secondary">{lot.lot_number ?? "-"}</td>
                    <td className="px-2 py-2 font-mono text-text-muted">{lot.current_pin ?? "-"}</td>
                    <td className="px-2 py-2 text-text-secondary max-w-xs truncate">{lot.current_address ?? "-"}</td>
                    <td className="px-2 py-2 text-text-muted">{lot.lot_status ?? "-"}</td>
                    <td className="px-2 py-2 text-text-muted capitalize">{lot.confidence_level}</td>
                    <td className="px-2 py-2 text-right">
                      <button onClick={() => { setEditId(lot.id); setShowAdd(false); }}
                        className="text-text-secondary hover:text-text-primary transition-colors mr-3">Edit</button>
                      <button onClick={() => del(lot.id)}
                        className="text-accent-red hover:opacity-80 transition-opacity">Delete</button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <div className="pt-4 border-t border-surface-border">
          <LotForm onSubmit={(e) => submit(e)} onCancel={() => setShowAdd(false)} />
        </div>
      )}
    </section>
  );
}

function LotForm({ item, onSubmit, onCancel }: { item?: Lot; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <label className={LABEL}>Block</label>
          <input name="block_number" defaultValue={item?.block_number ?? ""} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Lot</label>
          <input name="lot_number" defaultValue={item?.lot_number ?? ""} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Current PIN</label>
          <input name="current_pin" defaultValue={item?.current_pin ?? ""} placeholder="14-digit" className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Confidence</label>
          <select name="confidence_level" defaultValue={item?.confidence_level ?? "unknown"} className={SELECT}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className={LABEL}>Current Address</label>
          <input name="current_address" defaultValue={item?.current_address ?? ""} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Lot Status</label>
          <input name="lot_status" defaultValue={item?.lot_status ?? ""} placeholder="matched, unmatched…" className={INPUT} />
        </div>
      </div>
      <div>
        <label className={LABEL}>Match Method</label>
        <input name="match_method" defaultValue={item?.match_method ?? ""} placeholder="manual, spatial, deed…" className={INPUT} />
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
