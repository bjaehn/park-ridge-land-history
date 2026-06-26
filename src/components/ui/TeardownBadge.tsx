"use client";

import { useState } from "react";
import { Flame } from "lucide-react";

type Props = {
  confidence?: string | null;
};

export function TeardownBadge({ confidence }: Props) {
  const [open, setOpen] = useState(false);
  const isHigh = confidence === "high";

  const tooltipText = isHigh
    ? "Rebuild confirmed: permit records show demolition or new single-family construction on this parcel."
    : "Rebuild inferred: build year is 1990 or later and significantly newer than the first assessment on record. This heuristic can produce false positives — verify with permit records before relying on this flag.";

  return (
    <span className="relative inline-flex items-center gap-1">
      <span
        className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded border bg-amber-500/15 text-amber-600 border-amber-500/30"
      >
        <Flame className="w-3 h-3 shrink-0" aria-hidden="true" />
        Teardown rebuild
        {!isHigh && <span className="font-normal opacity-75"> · inferred</span>}
      </span>
      <button
        type="button"
        className="text-[10px] text-text-muted hover:text-text-secondary cursor-pointer select-none focus:outline-none"
        aria-expanded={open}
        aria-label="What does teardown rebuild mean?"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
      >
        (?)
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-0 top-full mt-1 z-50 w-72 rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-xs text-text-secondary shadow-lg leading-relaxed"
        >
          {tooltipText}
        </span>
      )}
    </span>
  );
}
