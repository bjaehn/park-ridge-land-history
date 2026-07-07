/**
 * Drift guard for the 3 neighborhood-family overview pages:
 * /neighborhoods, /planning-districts, /business-districts.
 *
 * These must stay structurally identical -- same shared map+legend+list
 * component, same section order (Breadcrumb, PageHeader, map, source note),
 * and the same city-wide map extent (fetchAllNeighborhoodsBbox, not a
 * type-scoped bbox) so all 3 maps frame the same area at the same zoom.
 * The bbox requirement exists because this drifted once already: each page
 * fetched its OWN type's bbox, so /neighborhoods (3 narrow corridor
 * districts) zoomed to a tiny sliver of the city instead of showing the
 * whole map, while /planning-districts (7 districts spanning the city)
 * happened to look fine -- an inconsistency invisible from the code for
 * any single page in isolation, only visible comparing all 3.
 *
 * Static source scan, not a rendered-DOM check, matching the precedent in
 * pageWidth.test.ts / sectionOrder.test.ts / neighborhoodTypePages.test.ts.
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const OVERVIEW_PAGES = [
  "app/neighborhoods/page.tsx",
  "app/planning-districts/page.tsx",
  "app/business-districts/page.tsx",
];

function read(file: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
}

describe("neighborhoods/planning-districts/business-districts stay in sync", () => {
  it.each(OVERVIEW_PAGES)("%s renders the shared map+list component, not a hand-built one", (file) => {
    const content = read(file);
    const usesShared =
      content.includes("<NeighborhoodTypeIndexPage") || content.includes("<NeighborhoodTypeOverview");
    expect(usesShared, `${file} must render NeighborhoodTypeIndexPage or NeighborhoodTypeOverview`).toBe(true);
  });

  it.each(OVERVIEW_PAGES)("%s fetches the city-wide bbox, not a type-scoped one", (file) => {
    const content = read(file);
    expect(content, `${file} must call fetchAllNeighborhoodsBbox`).toContain("fetchAllNeighborhoodsBbox");
    expect(content, `${file} must not fetch a type-scoped bbox (breaks the shared map extent)`).not.toContain(
      "fetchNeighborhoodTypeBbox"
    );
  });

  // /planning-districts and /business-districts delegate their entire body
  // to <NeighborhoodTypeIndexPage> (which itself renders Breadcrumb, then
  // PageHeader, then the map, then the source note) rather than assembling
  // those sections inline, so their own file has no literal Breadcrumb/
  // PageHeader/InlineSourceNote tags to order-check -- verifying that
  // wrapper's internal order once covers both. /neighborhoods assembles the
  // sections inline (it has its own intro copy + NeighborhoodCharts before
  // the map), so its order is checked directly against its own file.
  it("NeighborhoodTypeIndexPage (used by /planning-districts and /business-districts) renders Breadcrumb, then PageHeader, then the map, then the source note, in order", () => {
    const content = read("src/components/NeighborhoodTypeIndexPage.tsx");
    const breadcrumbIdx = content.indexOf("<Breadcrumb");
    const headerIdx = content.indexOf("<PageHeader");
    const mapIdx = content.indexOf("<NeighborhoodTypeOverview");
    const sourceNoteIdx = content.indexOf("<InlineSourceNote");

    expect(breadcrumbIdx).toBeGreaterThan(-1);
    expect(headerIdx).toBeGreaterThan(-1);
    expect(mapIdx).toBeGreaterThan(-1);
    expect(sourceNoteIdx).toBeGreaterThan(-1);

    expect(breadcrumbIdx).toBeLessThan(headerIdx);
    expect(headerIdx).toBeLessThan(mapIdx);
    expect(mapIdx).toBeLessThan(sourceNoteIdx);
  });

  it("app/neighborhoods/page.tsx renders Breadcrumb, then PageHeader, then the map, then the source note, in order", () => {
    const file = "app/neighborhoods/page.tsx";
    const content = read(file);
    const breadcrumbIdx = content.indexOf("<Breadcrumb");
    const headerIdx = content.indexOf("<PageHeader");
    const mapIdx = content.indexOf("<NeighborhoodTypeOverview");
    const sourceNoteIdx = content.indexOf("<InlineSourceNote");

    expect(breadcrumbIdx, `<Breadcrumb not found in ${file}`).toBeGreaterThan(-1);
    expect(headerIdx, `<PageHeader not found in ${file}`).toBeGreaterThan(-1);
    expect(mapIdx, `<NeighborhoodTypeOverview not found in ${file}`).toBeGreaterThan(-1);
    expect(sourceNoteIdx, `<InlineSourceNote not found in ${file}`).toBeGreaterThan(-1);

    expect(breadcrumbIdx).toBeLessThan(headerIdx);
    expect(headerIdx).toBeLessThan(mapIdx);
    expect(mapIdx).toBeLessThan(sourceNoteIdx);
  });

  it("NeighborhoodTypeOverview (the shared map+list block) defaults to the neighborhood color lens", () => {
    const content = read("src/components/NeighborhoodTypeIndexPage.tsx");
    expect(content).toContain('defaultLens="neighborhood"');
  });

  it("all 3 pages pass districts + defaultLens through to MapView via the shared components (no page hand-rolls its own MapView call)", () => {
    for (const file of OVERVIEW_PAGES) {
      const content = read(file);
      expect(content, `${file} should not instantiate MapView directly`).not.toContain("<MapView");
    }
  });
});
