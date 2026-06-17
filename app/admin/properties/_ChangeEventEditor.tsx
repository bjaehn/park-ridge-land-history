"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  upsertChangeEvent,
  deleteChangeEvent,
  upsertLineageEdge,
  deleteLineageEdge,
} from "../_actions/properties";

const INPUT = "w-full bg-surface-card border border-surface-border rounded px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-teal/60 transition-colors";
const LABEL = "block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1";
const SELECT = "w-full bg-surface-card border border-surface-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent-teal/60 transition-colors";

type LineageEdge = {
  id: string;
  pin: string;
  side: string;
  notes: string | null;
};

type ChangeEvent = {
  id: string;
  event_type: string;
  event_date: string | null;
  event_year: number | null;
  date_precision: string | null;
  description: string | null;
  plat_book: string | null;
  plat_page: string | null;
  document_number: string | null;
  confidence_level: string;
  notes: string | null;
  edges: LineageEdge[];
};

export function ChangeEventEditor({ events }: { events: ChangeEvent[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editId, setEditId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function submitEvent(e: React.FormEvent<HTMLFormElement>, eventId?: string) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErr(null);
    startTransition(() => {
      upsertChangeEvent(eventId ?? null, fd).then((r) => {
        if (r?.error) { setErr(r.error); return; }
        setEditId(null);
        setShowAdd(false);
        router.refresh();
      });
    });
  }

  function delEvent(eventId: string) {
    if (!confirm("Delete this change event and all its lineage edges?")) return;
    startTransition(() => {
      deleteChangeEvent(eventId).then(() => router.refresh());
    });
  }

  return (
    <section className="bg-surface-raised rounded-lg border border-surface-border p-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary">
          Parcel Change Events <span className="text-text-muted font-normal">({events.length})</span>
        </h3>
        <button
          type="button"
          onClick={() => { setShowAdd(true); setEditId(null); }}
          className="text-xs bg-accent-teal/10 text-accent-teal border border-accent-teal/30 rounded px-3 py-1.5 hover:bg-accent-teal/20 transition-colors"
        >
          + Add Change Event
        </button>
      </div>

      {err && <p className="text-accent-red text-xs mb-3">{err}</p>}
      {events.length === 0 && !showAdd && (
        <p className="text-xs text-text-muted">
          No change events yet. Add events to track splits, consolidations, or boundary adjustments.
        </p>
      )}

      <div className="divide-y divide-surface-border/50">
        {events.map((ev) =>
          editId === ev.id ? (
            <div key={ev.id} className="py-3">
              <ChangeEventForm
                item={ev}
                onSubmit={(e) => submitEvent(e, ev.id)}
                onCancel={() => setEditId(null)}
              />
            </div>
          ) : (
            <div key={ev.id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  className="text-left min-w-0 flex-1"
                  onClick={() => setExpandedId(expandedId === ev.id ? null : ev.id)}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs text-text-muted tabular-nums">
                      {ev.event_date ?? ev.event_year ?? "?"}
                    </span>
                    <span className="text-xs font-medium text-text-secondary">{ev.event_type}</span>
                    <span className="text-xs text-text-muted capitalize">[{ev.confidence_level}]</span>
                    <span className="text-xs text-text-muted">
                      {ev.edges.length} PIN{ev.edges.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {ev.description && (
                    <p className="text-sm text-text-primary line-clamp-1">{ev.description}</p>
                  )}
                </button>
                <div className="flex gap-3 shrink-0">
                  <button
                    onClick={() => { setEditId(ev.id); setShowAdd(false); setExpandedId(null); }}
                    className="text-xs text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => delEvent(ev.id)}
                    className="text-xs text-accent-red hover:opacity-80 transition-opacity"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {expandedId === ev.id && (
                <div className="mt-3 pl-3 border-l-2 border-surface-border">
                  <LineageEdgeManager edges={ev.edges} changeEventId={ev.id} />
                </div>
              )}
            </div>
          )
        )}
      </div>

      {showAdd && (
        <div className="mt-4 pt-4 border-t border-surface-border">
          <ChangeEventForm onSubmit={(e) => submitEvent(e)} onCancel={() => setShowAdd(false)} />
        </div>
      )}
    </section>
  );
}

function ChangeEventForm({
  item,
  onSubmit,
  onCancel,
}: {
  item?: ChangeEvent;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className={LABEL}>Event Type <span className="text-accent-red">*</span></label>
          <select name="event_type" defaultValue={item?.event_type ?? "boundary_adj"} className={SELECT}>
            <option value="subdivision">Subdivision (split)</option>
            <option value="consolidation">Consolidation</option>
            <option value="boundary_adj">Boundary Adjustment</option>
            <option value="resubdivision">Resubdivision</option>
            <option value="creation">Creation</option>
            <option value="annexation">Annexation</option>
            <option value="acquisition">Acquisition</option>
          </select>
        </div>
        <div>
          <label className={LABEL}>Year</label>
          <input name="event_year" type="number" defaultValue={item?.event_year ?? ""} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Date</label>
          <input name="event_date" type="date" defaultValue={item?.event_date ?? ""} className={INPUT} />
        </div>
      </div>
      <div>
        <label className={LABEL}>Description</label>
        <textarea
          name="description"
          defaultValue={item?.description ?? ""}
          rows={2}
          className="w-full bg-surface-card border border-surface-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent-teal/60 resize-none"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className={LABEL}>Plat Book</label>
          <input name="plat_book" defaultValue={item?.plat_book ?? ""} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Plat Page</label>
          <input name="plat_page" defaultValue={item?.plat_page ?? ""} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Document #</label>
          <input name="document_number" defaultValue={item?.document_number ?? ""} className={INPUT} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={LABEL}>Confidence</label>
          <select name="confidence_level" defaultValue={item?.confidence_level ?? "unknown"} className={SELECT}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>
        <div>
          <label className={LABEL}>Date Precision</label>
          <select name="date_precision" defaultValue={item?.date_precision ?? "unknown"} className={SELECT}>
            <option value="exact">Exact</option>
            <option value="month">Month</option>
            <option value="year">Year</option>
            <option value="decade">Decade</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>
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

function LineageEdgeManager({
  edges,
  changeEventId,
}: {
  edges: LineageEdge[];
  changeEventId: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function addEdge(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErr(null);
    startTransition(() => {
      upsertLineageEdge(changeEventId, null, fd).then((r) => {
        if (r?.error) { setErr(r.error); return; }
        setShowAdd(false);
        router.refresh();
      });
    });
  }

  function delEdge(edgeId: string) {
    if (!confirm("Remove this PIN from the change event?")) return;
    startTransition(() => {
      deleteLineageEdge(edgeId).then(() => router.refresh());
    });
  }

  const predecessors = edges.filter((e) => e.side === "predecessor");
  const successors = edges.filter((e) => e.side === "successor");

  return (
    <div>
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Related PINs</p>
      {edges.length === 0 && !showAdd && (
        <p className="text-xs text-text-muted mb-2">No PINs linked yet.</p>
      )}
      {predecessors.length > 0 && (
        <div className="mb-2">
          <p className="text-xs text-text-muted mb-1">Predecessors (before change):</p>
          {predecessors.map((edge) => (
            <div key={edge.id} className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-text-secondary">{edge.pin}</span>
              {edge.notes && <span className="text-xs text-text-muted">{edge.notes}</span>}
              <button
                onClick={() => delEdge(edge.id)}
                className="text-xs text-accent-red hover:opacity-80 ml-1"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      {successors.length > 0 && (
        <div className="mb-2">
          <p className="text-xs text-text-muted mb-1">Successors (after change):</p>
          {successors.map((edge) => (
            <div key={edge.id} className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-text-secondary">{edge.pin}</span>
              {edge.notes && <span className="text-xs text-text-muted">{edge.notes}</span>}
              <button
                onClick={() => delEdge(edge.id)}
                className="text-xs text-accent-red hover:opacity-80 ml-1"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {err && <p className="text-accent-red text-xs mb-2">{err}</p>}

      {showAdd ? (
        <form onSubmit={addEdge} className="flex gap-2 mt-2 flex-wrap">
          <input
            name="pin"
            required
            placeholder="PIN (14 digits)"
            className="bg-surface-card border border-surface-border rounded px-2 py-1 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-teal/60 w-40"
          />
          <select
            name="side"
            className="bg-surface-card border border-surface-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent-teal/60"
          >
            <option value="predecessor">Predecessor</option>
            <option value="successor">Successor</option>
          </select>
          <input
            name="notes"
            placeholder="Notes (optional)"
            className="bg-surface-card border border-surface-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent-teal/60 flex-1 min-w-24"
          />
          <button type="submit" className="bg-accent-teal text-surface-base font-semibold px-2 py-1 rounded text-xs hover:opacity-90">Add</button>
          <button type="button" onClick={() => setShowAdd(false)} className="text-xs text-text-secondary hover:text-text-primary">Cancel</button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="text-xs text-accent-teal hover:opacity-80 transition-opacity"
        >
          + Add PIN
        </button>
      )}
    </div>
  );
}
