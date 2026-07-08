import { describe, it, expect } from "vitest";
import { groupByDecade, groupByFixedBuckets, UNKNOWN_ERA_LABEL, type FixedBucketDef } from "./decadeGrouping";

type Item = { id: string; year: number | null };
const getYear = (item: Item) => item.year;

describe("groupByDecade", () => {
  it("buckets items by decade and sorts groups chronologically", () => {
    const items: Item[] = [
      { id: "a", year: 1925 },
      { id: "b", year: 1918 },
      { id: "c", year: 1932 },
    ];
    const groups = groupByDecade(items, getYear);
    expect(groups.map((g) => g.key)).toEqual(["1910s", "1920s", "1930s"]);
    expect(groups.find((g) => g.key === "1910s")!.items.map((i) => i.id)).toEqual(["b"]);
  });

  it("does not collapse pre-1900 years into a combined bucket -- every decade gets its own group", () => {
    const items: Item[] = [
      { id: "old", year: 1875 },
      { id: "older", year: 1862 },
    ];
    const groups = groupByDecade(items, getYear);
    expect(groups.map((g) => g.key)).toEqual(["1860s", "1870s"]);
  });

  it("sorts items within a decade ascending by year", () => {
    const items: Item[] = [
      { id: "later", year: 1929 },
      { id: "earlier", year: 1921 },
    ];
    const groups = groupByDecade(items, getYear);
    expect(groups[0].items.map((i) => i.id)).toEqual(["earlier", "later"]);
  });

  it("always sorts the Unknown bucket last, labeled 'Unknown era', with repYear null", () => {
    const items: Item[] = [
      { id: "unknown", year: null },
      { id: "known", year: 1950 },
    ];
    const groups = groupByDecade(items, getYear);
    expect(groups.map((g) => g.key)).toEqual(["1950s", "Unknown"]);
    const unknownGroup = groups[groups.length - 1];
    expect(unknownGroup.label).toBe(UNKNOWN_ERA_LABEL);
    expect(unknownGroup.repYear).toBeNull();
  });

  it("returns an empty array for an empty input", () => {
    expect(groupByDecade([], getYear)).toEqual([]);
  });
});

describe("groupByFixedBuckets", () => {
  const buckets: FixedBucketDef[] = [
    { key: "pre1920", label: "Pre-1920s", repYear: 1910, test: (y) => y != null && y < 1920 },
    { key: "1920s-1930s", label: "1920s–1930s", repYear: 1925, test: (y) => y != null && y >= 1920 && y < 1940 },
    { key: "unknown", label: "Unknown era", repYear: null, test: (y) => y == null },
  ];

  it("assigns items to the declared buckets in declared order", () => {
    const items: Item[] = [
      { id: "a", year: 1935 },
      { id: "b", year: 1905 },
      { id: "c", year: null },
    ];
    const groups = groupByFixedBuckets(items, getYear, buckets);
    expect(groups.map((g) => g.key)).toEqual(["pre1920", "1920s-1930s", "unknown"]);
  });

  it("drops empty buckets from the result", () => {
    const items: Item[] = [{ id: "a", year: 1905 }];
    const groups = groupByFixedBuckets(items, getYear, buckets);
    expect(groups.map((g) => g.key)).toEqual(["pre1920"]);
  });

  it("sorts items within each bucket ascending by year, unknowns last", () => {
    const items: Item[] = [
      { id: "later", year: 1915 },
      { id: "earlier", year: 1901 },
    ];
    const groups = groupByFixedBuckets(items, getYear, buckets);
    expect(groups[0].items.map((i) => i.id)).toEqual(["earlier", "later"]);
  });
});
