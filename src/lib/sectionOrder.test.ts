/**
 * Regression test: /neighborhoods renders an Era portrait + Median sale
 * price chart section (NeighborhoodCharts) in that order, right after the
 * page header/hero and before the primary listing component. /subdivisions
 * used to render the same pair via SubdivisionEraPriceCharts plus a
 * separate SubdivisionCharts component ("Plats recorded by decade" and
 * "Longest wait: plat to first home built"), but all of that except the
 * Median sale price chart has since been removed -- SubdivisionCharts and
 * its build-gap chart were deleted entirely. Nothing previously enforced
 * the ordering, so a future edit could silently move, reorder, or drop the
 * remaining chart, or accidentally reintroduce a removed section.
 *
 * This is a static source scan, not a rendered-DOM check, matching the
 * precedent in pageWidth.test.ts.
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("chart section order stays in sync between /neighborhoods and /subdivisions", () => {
  it("NeighborhoodCharts renders Era portrait before Median sale price", () => {
    const file = "src/components/ui/NeighborhoodCharts.tsx";
    const eraHeading = "Era portrait: when each neighborhood was built";
    const priceHeading = "Median sale price by neighborhood, 2015 vs. 2024";
    const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
    const eraIdx = content.indexOf(eraHeading);
    const priceIdx = content.indexOf(priceHeading);
    expect(eraIdx, `"${eraHeading}" not found in ${file}`).toBeGreaterThan(-1);
    expect(priceIdx, `"${priceHeading}" not found in ${file}`).toBeGreaterThan(-1);
    expect(eraIdx).toBeLessThan(priceIdx);
  });

  it("SubdivisionEraPriceCharts no longer renders an Era portrait section", () => {
    const file = "app/subdivisions/_SubdivisionEraPriceCharts.tsx";
    const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
    expect(content).not.toContain("Era portrait");
    expect(content).toContain("Median sale price by subdivision, 2015 vs. 2024");
  });

  it("SubdivisionCharts (Plats recorded by decade / Longest wait) was removed entirely", () => {
    const file = path.resolve(process.cwd(), "app/subdivisions/_SubdivisionCharts.tsx");
    expect(fs.existsSync(file)).toBe(false);

    const pageContent = fs.readFileSync(
      path.resolve(process.cwd(), "app/subdivisions/page.tsx"),
      "utf-8"
    );
    expect(pageContent).not.toContain("SubdivisionCharts");
  });

  it.each([
    {
      file: "app/neighborhoods/page.tsx",
      heroTag: "<PageHeader",
      chartsTag: "<NeighborhoodCharts",
      listTag: "<NeighborhoodsGrid",
    },
    {
      file: "app/subdivisions/page.tsx",
      heroTag: "<SubdivisionsHero",
      chartsTag: "<SubdivisionEraPriceCharts",
      listTag: "<SubdivisionsContent",
    },
  ])("$file renders its chart section between hero and primary listing", ({ file, heroTag, chartsTag, listTag }) => {
    const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
    const heroIdx = content.indexOf(heroTag);
    const chartsIdx = content.indexOf(chartsTag);
    const listIdx = content.indexOf(listTag);

    expect(heroIdx, `${heroTag} not found in ${file}`).toBeGreaterThan(-1);
    expect(chartsIdx, `${chartsTag} not found in ${file}`).toBeGreaterThan(-1);
    expect(listIdx, `${listTag} not found in ${file}`).toBeGreaterThan(-1);

    expect(chartsIdx).toBeGreaterThan(heroIdx);
    expect(chartsIdx).toBeLessThan(listIdx);
  });
});
