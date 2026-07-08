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

describe("subdivision detail page follows canonical section order (A2.2)", () => {
  const file = "app/subdivisions/[id]/_SubdivisionDetailContent.tsx";

  it("renders 'Home sales in this subdivision' before the highlight reel", () => {
    const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
    const marketHistoryIdx = content.indexOf("Home sales in this subdivision");
    const highlightReelIdx = content.indexOf("<HighlightReel");
    expect(marketHistoryIdx, `"Home sales in this subdivision" not found in ${file}`).toBeGreaterThan(-1);
    expect(highlightReelIdx, `<HighlightReel not found in ${file}`).toBeGreaterThan(-1);
    expect(marketHistoryIdx).toBeLessThan(highlightReelIdx);
  });

  it("does not render a 'Median sale price, 2015 vs. 2024' comparison section (deliberately exempted, see file comment)", () => {
    const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
    expect(content).not.toContain("2015 vs. 2024");
  });
});

describe("chart colors are sourced from chartTheme.ts, not hardcoded hex literals (A2.4)", () => {
  // Each of these files used to hardcode its own approximation of the app's
  // design tokens (e.g. #a78bfa instead of the real accent.purple #8b7ff0),
  // so charts visibly didn't match the surrounding UI or each other. This
  // guards against a hex literal creeping back in outside chartTheme.ts /
  // mapConfig.ts (both of which are allowed to define the real hex values).
  const files = [
    "app/properties/[pin]/_AssessmentChart.tsx",
    "app/properties/[pin]/_SalesPriceChart.tsx",
    "src/components/ui/AppealsChart.tsx",
    "src/components/ui/AssessmentTrendChart.tsx",
    "src/components/ui/MarketHistoryChart.tsx",
    "src/components/ui/PermitActivityChart.tsx",
    "src/components/ui/SubdivisionPlatChart.tsx",
  ];

  it.each(files)("%s contains no raw hex color literal", (file) => {
    const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
    const hexMatches = content.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    expect(hexMatches, `unexpected hex literal(s) in ${file}: ${hexMatches.join(", ")}`).toEqual([]);
  });

  it("EraPortraitChart.tsx derives its palette from getEraColor(), not a hardcoded hex per segment", () => {
    const file = "src/components/ui/EraPortraitChart.tsx";
    const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
    expect(content).toContain("getEraColor(segment.repYear)");
    const hexMatches = content.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    // The one remaining hex is the shared "#64748b" unknown-color fallback,
    // same as every DecadeGroup/decade-grouping call site -- not a per-era hardcode.
    expect(hexMatches, `unexpected hex literal(s) in ${file}: ${hexMatches.join(", ")}`).toEqual(["#64748b"]);
  });
});

describe("PageHeader is used by every top-level page (A2.1)", () => {
  // These 4 pages used to hand-roll their own eyebrow/h1/subtitle markup
  // instead of using the shared PageHeader component, each drifting to a
  // slightly different heading size. Static source scan, same precedent as
  // the chart-order tests above.
  it.each([
    { file: "app/page.tsx", removedMarkup: "text-3xl md:text-4xl font-bold text-text-primary leading-tight" },
    { file: "app/permits/_PermitsContent.tsx", removedMarkup: "text-2xl font-bold text-text-primary" },
    { file: "app/streets/_StreetsContent.tsx", removedMarkup: "text-2xl font-bold text-text-primary" },
    { file: "app/subdivisions/_SubdivisionsHero.tsx", removedMarkup: "text-3xl font-bold text-text-primary tracking-tight" },
  ])("$file renders <PageHeader and no longer hand-rolls its own heading", ({ file, removedMarkup }) => {
    const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
    expect(content, `<PageHeader not found in ${file}`).toContain("<PageHeader");
    expect(content, `old hand-rolled heading markup still present in ${file}`).not.toContain(removedMarkup);
  });
});
