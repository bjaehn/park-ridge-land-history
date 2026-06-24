"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { bulkLinkParcelsByPageCodes } from "../_actions/platMapping";

export function CandidatePropertiesPanel({
  subdivisionId,
  gisPageCodes,
  candidateCount,
  alreadyLinkedCount,
  sampleAddresses,
}: {
  subdivisionId: string;
  gisPageCodes: string[];
  candidateCount: number;
  alreadyLinkedCount: number;
  sampleAddresses: { address: string; pin_normalized: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [linkedCount, setLinkedCount] = useState<number | null>(null);

  function handleBulkLink() {
    startTransition(async () => {
      const count = await bulkLinkParcelsByPageCodes(subdivisionId, gisPageCodes);
      setLinkedCount(count);
    });
  }

  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold text-text-primary mb-1">
        Candidate Properties via GIS
      </h2>

      {gisPageCodes.length === 0 ? (
        <div className="bg-surface-raised border border-surface-border rounded-lg px-5 py-4">
          <p className="text-xs text-text-muted">
            No GIS page codes linked to this subdivision yet.{" "}
            <Link href="/admin/plat-mapping" className="text-accent-teal hover:underline">
              Open the Recorder Plat Index
            </Link>{" "}
            to find the matching plat entry and set its GIS page codes.
          </p>
        </div>
      ) : (
        <div className="bg-surface-raised border border-surface-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="flex flex-wrap gap-1 mb-1">
                {gisPageCodes.map((c) => (
                  <span
                    key={c}
                    className="inline-block font-mono text-[10px] bg-accent-teal/10 border border-accent-teal/20 rounded px-1.5 py-0.5 text-accent-teal"
                  >
                    {c}
                  </span>
                ))}
              </div>
              <p className="text-sm text-text-primary">
                {linkedCount !== null ? (
                  <span className="text-accent-teal font-medium">
                    {linkedCount} {linkedCount === 1 ? "property" : "properties"} linked.
                  </span>
                ) : candidateCount === 0 ? (
                  <span className="text-text-muted">
                    All {alreadyLinkedCount} parcels for {gisPageCodes.length === 1 ? "this code are" : "these codes are"} already linked.
                  </span>
                ) : (
                  <>
                    <span className="font-semibold text-amber-400">{candidateCount}</span>{" "}
                    {candidateCount === 1 ? "property" : "properties"} match{candidateCount === 1 ? "es" : ""} and{" "}
                    {candidateCount === 1 ? "isn't" : "aren't"} linked to any subdivision yet.
                    {alreadyLinkedCount > 0 && (
                      <span className="text-text-muted ml-1">
                        ({alreadyLinkedCount} already linked to another subdivision)
                      </span>
                    )}
                  </>
                )}
              </p>
            </div>

            {candidateCount > 0 && linkedCount === null && (
              <button
                onClick={handleBulkLink}
                disabled={isPending}
                className="shrink-0 px-4 py-2 bg-accent-teal text-surface-base text-xs font-semibold rounded hover:bg-accent-teal/80 disabled:opacity-50 transition-colors"
              >
                {isPending
                  ? "Linking…"
                  : `Link all ${candidateCount} ${candidateCount === 1 ? "property" : "properties"}`}
              </button>
            )}
          </div>

          {sampleAddresses.length > 0 && linkedCount === null && (
            <ul className="divide-y divide-surface-border">
              {sampleAddresses.map((p) => (
                <li
                  key={p.pin_normalized}
                  className="px-5 py-2 flex items-center justify-between gap-4"
                >
                  <span className="text-xs text-text-primary">{p.address}</span>
                  <Link
                    href={`/properties/${p.pin_normalized}`}
                    target="_blank"
                    className="text-[10px] text-accent-teal/70 hover:text-accent-teal hover:underline shrink-0 transition-colors"
                  >
                    {p.pin_normalized} ↗
                  </Link>
                </li>
              ))}
              {candidateCount > sampleAddresses.length && (
                <li className="px-5 py-2 text-xs text-text-muted italic">
                  …and {candidateCount - sampleAddresses.length} more
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
