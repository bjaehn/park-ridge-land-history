"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignParcelsToNeighborhoodByStreet } from "../_actions/neighborhoods";

const TEXTAREA = "w-full bg-surface-card border border-surface-border rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-teal/60 resize-y font-mono";

type Props = {
  neighborhoodId: string;
  neighborhoodType: string;
  currentStreets: Array<{ name: string; displayName: string; parcelCount: number }>;
};

export function StreetAssignmentEditor({ neighborhoodId, neighborhoodType, currentStreets }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [streetInput, setStreetInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    const streets = streetInput
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (streets.length === 0) { setError("Enter at least one street name."); return; }
    setError(null);
    setResult(null);
    startTransition(() => {
      assignParcelsToNeighborhoodByStreet(neighborhoodId, neighborhoodType, streets).then((r) => {
        if (r?.error) { setError(r.error); return; }
        setResult(`Assigned ${r?.updated ?? 0} parcels on ${streets.length} street(s).`);
        setStreetInput("");
        router.refresh();
      });
    });
  }

  return (
    <div className="bg-surface-raised rounded-lg border border-surface-border p-5 mb-5">
      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">
        Parcel Assignment by Street
      </h3>

      {currentStreets.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-text-muted mb-2">
            Currently assigned streets ({currentStreets.length}):
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
            {currentStreets.map((s) => (
              <span
                key={s.name}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-card border border-surface-border rounded text-xs text-text-secondary"
              >
                {s.displayName}
                <span className="text-text-muted">({s.parcelCount})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {currentStreets.length === 0 && (
        <p className="text-xs text-text-muted mb-4 italic">No streets assigned yet.</p>
      )}

      <form onSubmit={handleAssign} className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
            Streets to assign
          </label>
          <textarea
            value={streetInput}
            onChange={(e) => setStreetInput(e.target.value)}
            rows={4}
            placeholder={"elm street\noak avenue\nwillow road"}
            className={TEXTAREA}
          />
          <p className="text-xs text-text-muted mt-1">
            One street per line or comma-separated. Must match normalized street names (lowercase, no house numbers).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending || !streetInput.trim()}
            className="bg-accent-teal text-surface-base font-semibold px-4 py-1.5 rounded text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isPending ? "Assigning…" : "Assign Streets"}
          </button>
          {error && <p className="text-accent-red text-sm">{error}</p>}
          {result && <p className="text-confidence-high text-sm">{result}</p>}
        </div>
      </form>
    </div>
  );
}
