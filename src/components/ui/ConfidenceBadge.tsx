import type { ConfidenceLevel } from "@/lib/formatters";
import { CONFIDENCE_DESCRIPTION, CONFIDENCE_TOOLTIP } from "@/lib/formatters";

type Props = {
  level: ConfidenceLevel;
  showDescription?: boolean;
};

const LEVEL_STYLES: Record<ConfidenceLevel, string> = {
  High:   "bg-confidence-high/15 text-confidence-high border-confidence-high/30",
  Medium: "bg-confidence-medium/15 text-confidence-medium border-confidence-medium/30",
  Low:    "bg-confidence-low/15 text-confidence-low border-confidence-low/30",
};

export function ConfidenceBadge({ level, showDescription = false }: Props) {
  return (
    <span className="inline-flex flex-col gap-0.5">
      <span className="inline-flex items-center gap-1.5">
        <span
          className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded border ${LEVEL_STYLES[level]}`}
        >
          <span
            className="w-1.5 h-1.5 rounded-full bg-current opacity-70"
            aria-hidden="true"
          />
          {level} confidence
        </span>
        <span
          className="text-[10px] text-text-muted cursor-help select-none"
          title={CONFIDENCE_TOOLTIP}
          aria-label={`What does this mean? ${CONFIDENCE_TOOLTIP}`}
        >
          (?)
        </span>
      </span>
      {showDescription && (
        <span className="text-xs text-text-muted">{CONFIDENCE_DESCRIPTION[level]}</span>
      )}
    </span>
  );
}
