/**
 * Drift guard for the 3 neighborhood-family overview pages:
 * /neighborhoods, /planning-districts, /business-districts.
 *
 * These must render ONLY <NeighborhoodTypeIndexPage ... /> -- no page may
 * hand-assemble its own Breadcrumb/PageHeader/charts/source-note, because
 * that fork is exactly what let /neighborhoods silently carry an extra
 * intro paragraph and a NeighborhoodCharts block neither sibling page had.
 * A page that can ONLY call the shared component can't drift from it.
 *
 * The bbox check exists because that drifted once too: each page fetched
 * its OWN type's bbox, so /neighborhoods (3 narrow corridor districts)
 * zoomed to a tiny sliver of the city instead of showing the whole map.
 *
 * Static source scan, not a rendered-DOM check -- see neighborhoodFamilyPage.test.tsx
 * for the actual rendered structural-equality test across all 3 pages.
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
  it.each(OVERVIEW_PAGES)("%s renders exactly one <NeighborhoodTypeIndexPage> and nothing else structural", (file) => {
    const content = read(file);
    const opens = (content.match(/<NeighborhoodTypeIndexPage/g) ?? []).length;
    expect(opens, `${file} must render NeighborhoodTypeIndexPage exactly once`).toBe(1);

    // These must live ONLY inside NeighborhoodTypeIndexPage.tsx now. A page
    // that contains any of these directly has forked away from the shared
    // component again -- the exact regression this guard exists for.
    for (const forbidden of ["<Breadcrumb", "<PageHeader", "<InlineSourceNote", "<NeighborhoodCharts", "<MapView"]) {
      expect(content, `${file} must not render ${forbidden} directly -- it belongs in NeighborhoodTypeIndexPage`).not.toContain(
        forbidden
      );
    }
  });

  it.each(OVERVIEW_PAGES)("%s fetches the city-wide bbox, not a type-scoped one", (file) => {
    const content = read(file);
    expect(content, `${file} must call fetchAllNeighborhoodsBbox`).toContain("fetchAllNeighborhoodsBbox");
    expect(content, `${file} must not fetch a type-scoped bbox (breaks the shared map extent)`).not.toContain(
      "fetchNeighborhoodTypeBbox"
    );
  });

  it.each(OVERVIEW_PAGES)("%s passes siblingLinks pointing at the other 2 pages, never itself", (file) => {
    const content = read(file);
    const hrefs = [...content.matchAll(/href:\s*"([^"]+)"/g)].map((m) => m[1]);
    const ownRoute = "/" + file.split("/")[1];
    expect(hrefs.length, `${file} must pass siblingLinks`).toBeGreaterThanOrEqual(2);
    expect(hrefs, `${file} must not link to itself in siblingLinks`).not.toContain(ownRoute);
  });

  // TopNav links, "/neighborhoods no longer sections official_planning/
  // business_district", and "/neighborhoods shows corridor" are covered by
  // neighborhoodTypePages.test.ts -- not duplicated here.

  it("all 3 pages pass their own neighborhoodTypes through to NeighborhoodCharts (via the shared component), not a hardcoded type", () => {
    // NeighborhoodCharts is now only ever instantiated once, inside
    // NeighborhoodTypeIndexPage.tsx, always with the page's own
    // neighborhoodTypes prop -- this catches a regression to a hardcoded
    // official_planning-only call (the original bug: /neighborhoods showed
    // Planning District chart data mislabeled as its own).
    const content = read("src/components/NeighborhoodTypeIndexPage.tsx");
    expect(content).toContain("<NeighborhoodCharts neighborhoodTypes={neighborhoodTypes}");
  });
});
