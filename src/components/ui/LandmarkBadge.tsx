"use client";

import { useState } from "react";
import { Landmark as LandmarkIcon } from "lucide-react";

type Props = {
  year?: number | string | null;
};

export function LandmarkBadge({ year }: Props) {
  const [open, setOpen] = useState(false);

  const tooltipText = year
    ? `Designated a Park Ridge landmark by the Historic Preservation Commission in ${year}.`
    : "Designated a Park Ridge landmark by the Historic Preservation Commission.";

  return (
    <span className="relative inline-flex items-center gap-1">
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded border bg-accent-purple/15 text-accent-purple border-accent-purple/30">
        <LandmarkIcon className="w-3 h-3 shrink-0" aria-hidden="true" />
        Designated Landmark
        {year && <span className="font-normal opacity-75"> · {year}</span>}
      </span>
      <button
        type="button"
        className="text-[10px] text-text-muted hover:text-text-secondary cursor-pointer select-none focus:outline-none"
        aria-expanded={open}
        aria-label="What does designated landmark mean?"
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
