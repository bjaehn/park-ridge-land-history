"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertTimelineEvent, deleteTimelineEvent } from "../_actions/subdivisions";

const INPUT = "w-full bg-surface-card border border-surface-border rounded px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-teal/60 transition-colors";
const LABEL = "block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1";
const SELECT = "w-full bg-surface-card border border-surface-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent-teal/60 transition-colors";

type Event = {
  id: string;
  event_year: number | null;
  event_date: string | null;
  event_type: string;
  title: string;
  description: string | null;
  source_name: string | null;
  source_reference: string | null;
  confidence_level: string;
};

export function TimelineEventEditor({
  events,
  subdivisionId,
}: {
  events: Event[];
  subdivisionId: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editId, setEditId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>, eventId?: string) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErr(null);
    startTransition(() => {
      upsertTimelineEvent(subdivisionId, eventId ?? null, fd).then((r) => {
        if (r?.error) { setErr(r.error); return; }
        setEditId(null);
        setShowAdd(false);
        router.refresh();
      });
    });
  }

  function del(id: string) {
    if (!confirm("Delete this timeline event?")) return;
    startTransition(() => {
      deleteTimelineEvent(id, subdivisionId).then(() => router.refresh());
    });
  }

  return (
    <section className="bg-surface-raised rounded-lg border border-surface-border p-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary">Timeline Events</h3>
        <button
          type="button"
          onClick={() => { setShowAdd(true); setEditId(null); }}
          className="text-xs bg-accent-teal/10 text-accent-teal border border-accent-teal/30 rounded px-3 py-1.5 hover:bg-accent-teal/20 transition-colors"
        >
          + Add Event
        </button>
      </div>

      {err && <p className="text-accent-red text-xs mb-3">{err}</p>}
      {events.length === 0 && !showAdd && <p className="text-xs text-text-muted">No events yet.</p>}

      <div className="divide-y divide-surface-border/50">
        {events.map((ev) =>
          editId === ev.id ? (
            <div key={ev.id} className="py-3">
              <EventForm
                item={ev}
                onSubmit={(e) => submit(e, ev.id)}
                onCancel={() => setEditId(null)}
              />
            </div>
          ) : (
            <div key={ev.id} className="py-2.5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs text-text-muted tabular-nums">{ev.event_year ?? "?"}</span>
                  <span className="text-xs font-medium text-text-secondary">{ev.event_type}</span>
                  <span className="text-xs text-text-muted capitalize">[{ev.confidence_level}]</span>
                </div>
                <p className="text-sm text-text-primary font-medium">{ev.title}</p>
                {ev.description && <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">{ev.description}</p>}
              </div>
              <div className="flex gap-3 shrink-0">
                <button onClick={() => { setEditId(ev.id); setShowAdd(false); }}
                  className="text-xs text-text-secondary hover:text-text-primary transition-colors">Edit</button>
                <button onClick={() => del(ev.id)}
                  className="text-xs text-accent-red hover:opacity-80 transition-opacity">Delete</button>
              </div>
            </div>
          )
        )}
      </div>

      {showAdd && (
        <div className="mt-4 pt-4 border-t border-surface-border">
          <EventForm onSubmit={(e) => submit(e)} onCancel={() => setShowAdd(false)} />
        </div>
      )}
    </section>
  );
}

function EventForm({
  item,
  onSubmit,
  onCancel,
}: {
  item?: Event;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className={LABEL}>Year</label>
          <input name="event_year" type="number" defaultValue={item?.event_year ?? ""} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Date</label>
          <input name="event_date" type="date" defaultValue={item?.event_date ?? ""} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Type</label>
          <input name="event_type" defaultValue={item?.event_type ?? ""} required placeholder="plat_recorded, sale…" className={INPUT} />
        </div>
      </div>
      <div>
        <label className={LABEL}>Title <span className="text-accent-red">*</span></label>
        <input name="title" defaultValue={item?.title ?? ""} required className={INPUT} />
      </div>
      <div>
        <label className={LABEL}>Description</label>
        <textarea name="description" defaultValue={item?.description ?? ""} rows={2}
          className="w-full bg-surface-card border border-surface-border rounded px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-teal/60 resize-none" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={LABEL}>Source Name</label>
          <input name="source_name" defaultValue={item?.source_name ?? ""} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Source Reference</label>
          <input name="source_reference" defaultValue={item?.source_reference ?? ""} className={INPUT} />
        </div>
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
      <div className="flex gap-2">
        <button type="submit" className="bg-accent-teal text-surface-base font-semibold px-3 py-1.5 rounded text-xs hover:opacity-90 transition-opacity">Save</button>
        <button type="button" onClick={onCancel} className="bg-surface-card border border-surface-border text-text-secondary rounded px-3 py-1.5 text-xs hover:border-accent-teal/30 transition-colors">Cancel</button>
      </div>
    </form>
  );
}
