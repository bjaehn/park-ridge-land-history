/**
 * Shared decade-bucketing logic for every "grouped by decade built" list in
 * the app (property lists, street lists, subdivision lists, neighborhood
 * lists). See src/components/ui/DecadeGroup.tsx for the rendering shell that
 * consumes this.
 *
 * Deliberately does not collapse old years into a "Pre-1900" bucket the way
 * mapConfig.ts's ERA_PALETTE / formatters.ts's formatDecade() do for the map
 * legend -- every one of these lists has always given a home built in 1875
 * its own real "1870s" group, and CLAUDE.md's decade-grouping convention
 * never documents a Pre-1900 exception for lists, only for the map legend.
 */

export type DecadeGroupResult<T> = {
  key: string;
  label: string;
  repYear: number | null;
  items: T[];
};

export type FixedBucketDef = {
  key: string;
  label: string;
  repYear: number | null;
  test: (year: number | null) => boolean;
};

export const UNKNOWN_ERA_LABEL = "Unknown era";
const UNKNOWN_KEY = "Unknown";

function decadeKey(year: number): string {
  return `${Math.floor(year / 10) * 10}s`;
}

function byYearAscendingUnknownsLast<T>(getYear: (item: T) => number | null) {
  return (a: T, b: T): number => {
    const ay = getYear(a);
    const by = getYear(b);
    if (ay == null && by == null) return 0;
    if (ay == null) return 1;
    if (by == null) return -1;
    return ay - by;
  };
}

/**
 * Buckets items into single-decade groups (e.g. "1920s"), sorted
 * chronologically with the "Unknown" (no year) bucket always last.
 */
export function groupByDecade<T>(
  items: readonly T[],
  getYear: (item: T) => number | null
): DecadeGroupResult<T>[] {
  const sorted = [...items].sort(byYearAscendingUnknownsLast(getYear));

  const buckets = new Map<string, T[]>();
  for (const item of sorted) {
    const year = getYear(item);
    const key = year ? decadeKey(year) : UNKNOWN_KEY;
    const arr = buckets.get(key) ?? [];
    arr.push(item);
    buckets.set(key, arr);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => {
      if (a === UNKNOWN_KEY) return 1;
      if (b === UNKNOWN_KEY) return -1;
      return a.localeCompare(b);
    })
    .map(([key, groupItems]) => ({
      key,
      label: key === UNKNOWN_KEY ? UNKNOWN_ERA_LABEL : key,
      repYear: key === UNKNOWN_KEY ? null : parseInt(key, 10),
      items: groupItems,
    }));
}

/**
 * Buckets items into a caller-supplied set of fixed (possibly multi-decade)
 * groups, e.g. the streets index's "Pre-1920s" / "1920s-1930s" / ... scheme.
 * Bucket order follows the order `buckets` is declared in -- declare the
 * "unknown" bucket last. Empty buckets are dropped from the result.
 */
export function groupByFixedBuckets<T>(
  items: readonly T[],
  getYear: (item: T) => number | null,
  buckets: readonly FixedBucketDef[]
): DecadeGroupResult<T>[] {
  const byBucket = new Map<string, T[]>();
  for (const bucket of buckets) byBucket.set(bucket.key, []);

  for (const item of items) {
    const year = getYear(item);
    const bucket = buckets.find((b) => b.test(year)) ?? buckets[buckets.length - 1];
    byBucket.get(bucket.key)!.push(item);
  }

  const sortWithinBucket = byYearAscendingUnknownsLast(getYear);
  for (const groupItems of byBucket.values()) {
    groupItems.sort(sortWithinBucket);
  }

  return buckets
    .map((bucket) => ({
      key: bucket.key,
      label: bucket.label,
      repYear: bucket.repYear,
      items: byBucket.get(bucket.key) ?? [],
    }))
    .filter((group) => group.items.length > 0);
}
