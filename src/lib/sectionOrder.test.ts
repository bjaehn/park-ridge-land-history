/**
 * Regression test: /neighborhoods and /subdivisions each render their own
 * Era portrait + Median sale price chart section (NeighborhoodCharts on
 * /neighborhoods, SubdivisionEraPriceCharts on /subdivisions -- separate
 * components since they're scoped to different data, but both must keep
 * Era portrait before Median sale price, and both sections must sit right
 * after the page header/hero and before the primary listing component.
 * Nothing previously enforced this, so a future edit could silently move,
 * reorder, or drop the charts on just one page.
 *
 * This is a static source scan, not a rendered-DOM check, matching the
 * precedent in pageWidth.test.ts.
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("chart section order stays in sync between /neighborhoods and /subdivisions", () => {
  it.each([
    {
      file: "src/components/ui/NeighborhoodCharts.tsx",
      eraHeading: "Era portrait: when each neighborhood was built",
      priceHeading: "Median sale price by neighborhood, 2015 vs. 2024",
    },
    {
      file: "app/subdivisions/_SubdivisionEraPriceCharts.tsx",
      eraHeading: "Era portrait: when each subdivision was built",
      priceHeading: "Median sale price by subdivision, 2015 vs. 2024",
    },
  ])("$file renders Era portrait before Median sale price", ({ file, eraHeading, priceHeading }) => {
    const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
    const eraIdx = content.indexOf(eraHeading);
    const priceIdx = content.indexOf(priceHeading);
    expect(eraIdx, `"${eraHeading}" not found in ${file}`).toBeGreaterThan(-1);
    expect(priceIdx, `"${priceHeading}" not found in ${file}`).toBeGreaterThan(-1);
    expect(eraIdx).toBeLessThan(priceIdx);
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
      listTag: "<SubdivisionCharts",
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
