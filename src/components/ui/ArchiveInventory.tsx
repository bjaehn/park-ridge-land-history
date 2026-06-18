import { AssessmentIcon, SaleIcon, PermitIcon, ComparisonIcon, TimelineIcon } from "@/lib/icons";

const RECORDS = [
  { icon: AssessmentIcon, count: "369K", label: "assessment records" },
  { icon: SaleIcon, count: "14,965", label: "sale records" },
  { icon: PermitIcon, count: "8,955", label: "permit records" },
  { icon: ComparisonIcon, count: "26,876", label: "assessment appeals" },
  { icon: TimelineIcon, count: "418K+", label: "historical events" },
];

export function ArchiveInventory({ cardMode }: { cardMode?: boolean }) {
  if (cardMode) {
    return (
      <>
        {RECORDS.map((r) => (
          <div
            key={r.label}
            className="bg-surface-card border border-surface-border rounded-lg p-4"
          >
            <div className="flex items-center gap-1.5 mb-2">
              <r.icon size={12} strokeWidth={1.8} className="text-text-muted" aria-hidden="true" />
              <p className="text-xs text-text-muted">{r.label}</p>
            </div>
            <p className="text-2xl font-semibold tabular-nums text-text-primary">{r.count}</p>
          </div>
        ))}
      </>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {RECORDS.map((r) => (
        <div
          key={r.label}
          className="flex items-center gap-2 bg-surface-card border border-surface-border rounded-lg px-3 py-2"
        >
          <r.icon size={13} strokeWidth={1.8} className="text-text-muted shrink-0" aria-hidden="true" />
          <span className="text-sm font-semibold text-text-primary">{r.count}</span>
          <span className="text-xs text-text-muted">{r.label}</span>
        </div>
      ))}
    </div>
  );
}
