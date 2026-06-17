"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateNeighborhoodGeometry } from "../_actions/neighborhoods";

export function BoundaryEditor({
  neighborhoodId,
  hasGeometry,
}: {
  neighborhoodId: string;
  hasGeometry: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [geojson, setGeojson] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (geojson.trim()) {
      try {
        JSON.parse(geojson);
      } catch {
        setError("Invalid JSON - paste a valid GeoJSON Geometry object (e.g. {\"type\":\"Polygon\",\"coordinates\":[...]}).");
        return;
      }
    }

    const fd = new FormData(e.currentTarget);
    startTransition(() => {
      updateNeighborhoodGeometry(neighborhoodId, fd).then((r) => {
        if (r?.error) { setError(r.error); return; }
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        router.refresh();
      });
    });
  }

  return (
    <section className="bg-surface-raised rounded-lg border border-surface-border p-5 mb-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-text-primary">Boundary / Geometry</h3>
        <p className="text-xs text-text-muted mt-1">
          {hasGeometry
            ? "A geometry is currently saved. Paste a new GeoJSON to replace it, or submit with empty field to clear."
            : "No geometry saved yet. Paste a GeoJSON Geometry object to set the boundary."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
            GeoJSON Geometry
          </label>
          <textarea
            name="geojson"
            value={geojson}
            onChange={(e) => setGeojson(e.target.value)}
            rows={8}
            placeholder={`{\n  "type": "Polygon",\n  "coordinates": [[[x1, y1], [x2, y2], ...]]\n}`}
            className="w-full bg-surface-card border border-surface-border rounded px-3 py-2 text-xs font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-teal/60 resize-y"
          />
          <p className="text-xs text-text-muted mt-1">
            Paste a GeoJSON Geometry object (Polygon or MultiPolygon). Coordinates must be [longitude, latitude].
          </p>
        </div>

        {error && <p className="text-accent-red text-xs">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="bg-accent-teal text-surface-base font-semibold px-4 py-2 rounded text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save Geometry"}
          </button>
          {saved && <p className="text-confidence-high text-sm">Saved!</p>}
        </div>
      </form>
    </section>
  );
}
