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

describe("subdivision detail page has an explicit 'not yet linked' state (A3.2)", () => {
  const file = "app/subdivisions/[id]/_SubdivisionDetailContent.tsx";

  it("renders the new banner before the stat grid, and no longer repeats the old EmptyState at the bottom", () => {
    const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
    const bannerIdx = content.indexOf("Not yet linked to any parcels.");
    const statGridIdx = content.indexOf("<StatGrid");
    expect(bannerIdx, `banner text not found in ${file}`).toBeGreaterThan(-1);
    expect(statGridIdx, `<StatGrid not found in ${file}`).toBeGreaterThan(-1);
    expect(bannerIdx).toBeLessThan(statGridIdx);
    expect(content).not.toContain("No properties found");
  });
});

describe("property page suppresses the redundant land-ancestry widget only when deed lineage exists (A3.3)", () => {
  it("gates LandAncestryPanel on landLineage.length === 0, not just presence of landAncestry", () => {
    const file = "app/properties/[pin]/_PropertyDetailContent.tsx";
    const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
    expect(content).toContain("landAncestry && landLineage.length === 0 && <LandAncestryPanel");
    expect(content).not.toMatch(/\{landAncestry && <LandAncestryPanel/);
  });
});

describe("historical_facts scoping migration exists with the expected columns (A3.4)", () => {
  it("adds subdivision_id and street_name_normalized", () => {
    const file = "supabase/migrations/20260708000000_add_subdivision_and_street_scoping_to_historical_facts.sql";
    expect(fs.existsSync(path.resolve(process.cwd(), file)), `${file} does not exist`).toBe(true);
    const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
    expect(content).toContain("subdivision_id uuid REFERENCES subdivisions(id)");
    expect(content).toContain("street_name_normalized text");
  });
});

describe("street detail page has a construction chart, citations, and correct section order (A3.4)", () => {
  const file = "app/streets/[street]/_StreetDetailContent.tsx";

  it("renders ConstructionByDecadeChart before the highlight reel", () => {
    const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
    const chartIdx = content.indexOf("<ConstructionByDecadeChart");
    const highlightIdx = content.indexOf("<HighlightReel");
    expect(chartIdx, `<ConstructionByDecadeChart not found in ${file}`).toBeGreaterThan(-1);
    expect(highlightIdx, `<HighlightReel not found in ${file}`).toBeGreaterThan(-1);
    expect(chartIdx).toBeLessThan(highlightIdx);
  });

  it("cites Cook County Assessor build-year data and street-matched parcel records", () => {
    const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
    expect(content).toContain("Cook County Assessor build-year data.");
    expect(content).toContain("Cook County Assessor parcel records, matched by street name.");
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

describe("Sparkline stat card components deleted, not wired (A4.2)", () => {
  it.each([
    "src/components/ui/SparklinePriceCard.tsx",
    "src/components/ui/SparklinePermitCard.tsx",
    "src/components/ui/SparklineSalesVolumeCard.tsx",
  ])("%s does not exist", (file) => {
    expect(fs.existsSync(path.resolve(process.cwd(), file))).toBe(false);
  });
});

describe("shareable property-summary view (A4.1)", () => {
  it("the summary route exists", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "app/properties/[pin]/summary/page.tsx"))).toBe(true);
    expect(fs.existsSync(path.resolve(process.cwd(), "app/properties/[pin]/summary/_PropertySummaryContent.tsx"))).toBe(true);
  });

  it("the main property page header links to the summary route", () => {
    const file = "app/properties/[pin]/page.tsx";
    const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
    expect(content).toContain("/summary");
  });

  it("_PropertyDetailContent.tsx no longer builds its own inline sharing blurb", () => {
    const file = "app/properties/[pin]/_PropertyDetailContent.tsx";
    const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
    expect(content).not.toContain("buildQuickSummary");
    expect(content).not.toContain("Property summary for sharing");
  });

  it("nav and footer chrome are hidden on print", () => {
    const navContent = fs.readFileSync(path.resolve(process.cwd(), "src/components/TopNav.tsx"), "utf-8");
    const layoutContent = fs.readFileSync(path.resolve(process.cwd(), "app/layout.tsx"), "utf-8");
    expect(navContent).toContain("print:hidden");
    expect(layoutContent).toContain("print:hidden");
  });
});

describe("compare-nearby-homes view (A4.3)", () => {
  const file = "app/properties/[pin]/_PropertyDetailContent.tsx";

  it("renders 'Nearby homes on this block' after 'How this property compares'", () => {
    const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
    const comparesIdx = content.indexOf("How this property compares");
    const nearbyIdx = content.indexOf("Nearby homes on this block");
    expect(comparesIdx, `"How this property compares" not found in ${file}`).toBeGreaterThan(-1);
    expect(nearbyIdx, `"Nearby homes on this block" not found in ${file}`).toBeGreaterThan(-1);
    expect(nearbyIdx).toBeGreaterThan(comparesIdx);
  });

  it("excludes the current property by PIN, not just by styling", () => {
    const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
    expect(content).toContain("p.pin !== pin");
  });

  it("renders nearby homes through <DecadeGroup>, not a flat grid (B1.1)", () => {
    const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
    const nearbyIdx = content.indexOf("Nearby homes on this block");
    const decadeGroupIdx = content.indexOf("<DecadeGroup");
    expect(decadeGroupIdx, `<DecadeGroup not found in ${file}`).toBeGreaterThan(-1);
    expect(decadeGroupIdx).toBeGreaterThan(nearbyIdx);
  });
});

describe("dead code removed (A5.2)", () => {
  it.each([
    "src/styles/global.css",
    "src/components/ui/CoverageTable.tsx",
    "src/components/ui/EraPortrait.tsx",
  ])("%s does not exist", (file) => {
    expect(fs.existsSync(path.resolve(process.cwd(), file))).toBe(false);
  });

  it("fetchParcelsInSubdivision is no longer defined", () => {
    const file = "src/lib/supabase/subdivisionQueries.ts";
    const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
    expect(content).not.toContain("fetchParcelsInSubdivision");
  });
});
