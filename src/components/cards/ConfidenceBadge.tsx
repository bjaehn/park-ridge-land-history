import type { ConfidenceLevel } from "../../lib/propertyConfidence";

type ConfidenceBadgeProps = {
  level: ConfidenceLevel;
  label: string;
  explanation: string;
};

const levelMeta: Record<ConfidenceLevel, { colorClass: string; icon: JSX.Element }> = {
  high: {
    colorClass: "cb-high",
    icon: (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    )
  },
  medium: {
    colorClass: "cb-medium",
    icon: (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    )
  },
  limited: {
    colorClass: "cb-limited",
    icon: (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    )
  }
};

export function ConfidenceBadge({ level, label, explanation }: ConfidenceBadgeProps) {
  const meta = levelMeta[level];
  return (
    <span
      className={`confidence-badge ${meta.colorClass}`}
      title={explanation}
      aria-label={`Data confidence: ${label}. ${explanation}`}
    >
      {meta.icon}
      {label} confidence
    </span>
  );
}
