/**
 * Regression test: /neighborhoods renders an Era portrait + Median sale
 * price chart section (NeighborhoodCharts) in that order, right after the
 * page header/hero and before the primary listing component.
 *
 * /subdivisions used to render the same pair via SubdivisionEraPriceCharts
 * plus a separate SubdivisionCharts component ("Plats recorded by decade"
 * and "Longest wait: plat to first home built"), but all of it -- including
 * the last-remaining Median sale price chart -- has since been removed at
 * the user's request; both components were deleted entirely rather than
 * left as empty shells. Nothing previously enforced the ordering, so a
 * future edit could silently move, reorder, or drop the remaining chart on
 * /neighborhoods, or accidentally reintroduce a removed section on
 * /subdivisions.
 *
 * This is a static source scan, not a rendered-DOM check, matching the
 * precedent in pageWidth.test.ts.
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("chart section order stays in sync between /neighborhoods and /subdivisions", () => {
  // Headings are parameterized by entityLabel (this component is shared by
  // /neighborhoods, /planning-districts, /business-districts, each of which
  // needs its own noun here, not a hardcoded "neighborhood" -- so this
  // checks the stable surrounding text, not the full literal heading.
  it("NeighborhoodCharts renders Era portrait before Median sale price", () => {
    const file = "src/components/ui/NeighborhoodCharts.tsx";
    const eraHeading = "Era portrait: when each {entityLabel} was built";
    const priceHeading = "Median sale price by {entityLabel}, 2015 vs. 2024";
    const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
    const eraIdx = content.indexOf(eraHeading);
    const priceIdx = content.indexOf(priceHeading);
    expect(eraIdx, `"${eraHeading}" not found in ${file}`).toBeGreaterThan(-1);
    expect(priceIdx, `"${priceHeading}" not found in ${file}`).toBeGreaterThan(-1);
    expect(eraIdx).toBeLessThan(priceIdx);
  });

  it("NeighborhoodCharts labels each section by the page's own entity type, not a hardcoded 'neighborhood'", () => {
    const file = "src/components/ui/NeighborhoodCharts.tsx";
    const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
    expect(content).toContain('case "official_planning": return "planning district"');
    expect(content).toContain('case "business_district":  return "business district"');
  });

  // /neighborhoods, /planning-districts, and /business-districts all
  // render their body through the ONE shared NeighborhoodTypeIndexPage
  // component now (see neighborhoodOverviewConsistency.test.ts -- none of
  // the 3 page.tsx files may reference PageHeader/NeighborhoodCharts
  // directly anymore), so this order only needs checking once, on the
  // shared component, to cover all 3 pages.
  it("NeighborhoodTypeIndexPage renders NeighborhoodCharts between the header and the map+list", () => {
    const file = "src/components/NeighborhoodTypeIndexPage.tsx";
    const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
    const heroIdx = content.indexOf("<PageHeader");
    const chartsIdx = content.indexOf("<NeighborhoodCharts");
    const listIdx = content.indexOf("<NeighborhoodTypeOverview");

    expect(heroIdx, `<PageHeader not found in ${file}`).toBeGreaterThan(-1);
    expect(chartsIdx, `<NeighborhoodCharts not found in ${file}`).toBeGreaterThan(-1);
    expect(listIdx, `<NeighborhoodTypeOverview not found in ${file}`).toBeGreaterThan(-1);
    expect(chartsIdx).toBeGreaterThan(heroIdx);
    expect(chartsIdx).toBeLessThan(listIdx);
  });

  it.each([
    { name: "SubdivisionCharts", file: "app/subdivisions/_SubdivisionCharts.tsx" },
    { name: "SubdivisionEraPriceCharts", file: "app/subdivisions/_SubdivisionEraPriceCharts.tsx" },
  ])("$name (removed entirely) does not exist and is not referenced by /subdivisions", ({ name, file }) => {
    expect(fs.existsSync(path.resolve(process.cwd(), file))).toBe(false);

    const pageContent = fs.readFileSync(
      path.resolve(process.cwd(), "app/subdivisions/page.tsx"),
      "utf-8"
    );
    expect(pageContent).not.toContain(name);
  });

  it("/subdivisions no longer renders any chart section (Plats recorded by decade, Longest wait, or Median sale price)", () => {
    const file = "app/subdivisions/page.tsx";
    const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
    expect(content).not.toContain("Plats recorded by decade");
    expect(content).not.toContain("Longest wait");
    expect(content).not.toContain("Median sale price");
    expect(content).not.toContain("Era portrait");
  });
});
