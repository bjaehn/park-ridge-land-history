import type { ConfidenceLevel } from "@/lib/formatters";
import { CONFIDENCE_DESCRIPTION } from "@/lib/formatters";

type Props = {
  level: ConfidenceLevel;
  showDescription?: boolean;
};

const LEVEL_STYLES: Record<ConfidenceLevel, string> = {
  High:   "bg-confidence-high/15 text-confidence-high border-confidence-high/30",
  Medium: "bg-confidence-medium/15 text-confidence-medium border-confidence-medium/30",
  Low:    "bg-confidence-low/15 text-confidence-low border-confidence-low/30",
};

/**
 * Single confidence badge. One definition of Low/Medium/High.
 * All pages and components that show confidence use this one component.
 */
export function ConfidenceBadge({ level, showDescription = false }: Props) {
  return (
    <span className="inline-flex flex-col gap-0.5">
      <span
        className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded border ${LEVEL_STYLES[level]}`}
        title={CONFIDENCE_DESCRIPTION[level]}
      >
        <span
          className="w-1.5 h-1.5 rounded-full bg-current opacity-70"
          aria-hidden="true"
        />
        {level} confidence
      </span>
      {showDescription && (
        <span className="text-xs text-text-muted">{CONFIDENCE_DESCRIPTION[level]}</span>
      )}
    </span>
  );
}
