/**
 * Regression test: /neighborhoods and /subdivisions both render the shared
 * NeighborhoodCharts component (Era portrait + Median sale price sections)
 * in the same relative position -- right after the page header/hero and
 * before the primary listing component. Nothing previously enforced this,
 * so a future edit could silently move or drop the charts on just one page.
 *
 * This is a static source scan, not a rendered-DOM check, matching the
 * precedent in pageWidth.test.ts.
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("chart section order stays in sync between /neighborhoods and /subdivisions", () => {
  it("NeighborhoodCharts renders Era portrait before Median sale price", () => {
    const content = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/ui/NeighborhoodCharts.tsx"),
      "utf-8"
    );
    const eraIdx = content.indexOf("Era portrait: when each neighborhood was built");
    const priceIdx = content.indexOf("Median sale price by neighborhood, 2015 vs. 2024");
    expect(eraIdx).toBeGreaterThan(-1);
    expect(priceIdx).toBeGreaterThan(-1);
    expect(eraIdx).toBeLessThan(priceIdx);
  });

  it.each([
    { file: "app/neighborhoods/page.tsx", heroTag: "<PageHeader", listTag: "<NeighborhoodsGrid" },
    { file: "app/subdivisions/page.tsx", heroTag: "<SubdivisionsHero", listTag: "<SubdivisionCharts" },
  ])("$file renders <NeighborhoodCharts between hero and primary listing", ({ file, heroTag, listTag }) => {
    const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
    const heroIdx = content.indexOf(heroTag);
    const chartsIdx = content.indexOf("<NeighborhoodCharts");
    const listIdx = content.indexOf(listTag);

    expect(heroIdx, `${heroTag} not found in ${file}`).toBeGreaterThan(-1);
    expect(chartsIdx, `<NeighborhoodCharts not found in ${file}`).toBeGreaterThan(-1);
    expect(listIdx, `${listTag} not found in ${file}`).toBeGreaterThan(-1);

    expect(chartsIdx).toBeGreaterThan(heroIdx);
    expect(chartsIdx).toBeLessThan(listIdx);
  });
});
