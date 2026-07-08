import { Fragment, type ReactNode } from "react";
import { getEraColor } from "@/lib/mapConfig";
import { groupByDecade, groupByFixedBuckets, type FixedBucketDef } from "@/lib/decadeGrouping";

const UNKNOWN_DOT_FALLBACK = "#64748b";

type Props<T> = {
  items: readonly T[];
  getYear: (item: T) => number | null;
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  /** Fixed multi-decade bucket scheme (e.g. the streets index); omit for default single-decade grouping. */
  buckets?: readonly FixedBucketDef[];
  /** Transforms the group's raw label ("1920s" / "Unknown era") for display, e.g. to prefix "First built ". */
  formatLabel?: (label: string) => string;
  /** Formats the group's item count for the header, e.g. pluralization. Defaults to a bare number. */
  formatCount?: (count: number) => string;
};

/**
 * Shared decade-grouped list layout: era-color dot + label + rule + count
 * header, followed by a responsive card grid. Per CLAUDE.md's "Decade
 * grouping" convention, every list grouped by construction era uses this
 * component rather than a one-off reimplementation of the header row.
 */
export function DecadeGroup<T>({
  items,
  getYear,
  getKey,
  renderItem,
  buckets,
  formatLabel = (label) => label,
  formatCount = (count) => String(count),
}: Props<T>) {
  const groups = buckets
    ? groupByFixedBuckets(items, getYear, buckets)
    : groupByDecade(items, getYear);

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <div key={group.key}>
          <div className="flex items-center gap-3 mb-3">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: getEraColor(group.repYear ?? undefined) ?? UNKNOWN_DOT_FALLBACK }}
              aria-hidden="true"
            />
            <span className="text-sm font-semibold text-text-secondary tracking-wide">
              {formatLabel(group.label)}
            </span>
            <div className="flex-1 border-t border-surface-border" />
            <span className="text-xs text-text-muted">{formatCount(group.items.length)}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {group.items.map((item) => (
              <Fragment key={getKey(item)}>{renderItem(item)}</Fragment>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
