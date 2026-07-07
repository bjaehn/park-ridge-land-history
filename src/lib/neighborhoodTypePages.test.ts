/**
 * Regression test for the /planning-districts and /business-districts
 * split off /neighborhoods: both must share the same page layout component
 * (NeighborhoodTypeIndexPage) rather than drifting into two hand-built
 * pages, both must be reachable from the header nav, and the corridor-
 * district display bug fixed alongside this change (corridor-type
 * neighborhoods have neighborhoodType set, so they were never caught by
 * the old "Other" section, which only caught null-type rows) must not
 * regress.
 *
 * Static source scan, not a rendered-DOM check, matching the precedent in
 * pageWidth.test.ts / sectionOrder.test.ts.
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("planning-districts and business-districts share one page layout", () => {
  it.each([
    { file: "app/planning-districts/page.tsx", neighborhoodType: "official_planning" },
    { file: "app/business-districts/page.tsx", neighborhoodType: "business_district" },
  ])("$file renders the shared NeighborhoodTypeIndexPage with the right type", ({ file, neighborhoodType }) => {
    const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
    expect(content).toContain("<NeighborhoodTypeIndexPage");
    expect(content).toContain(neighborhoodType);
  });

  it("both new routes are linked from the header nav", () => {
    const file = "src/components/TopNav.tsx";
    const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
    expect(content).toContain('"/planning-districts"');
    expect(content).toContain('"/business-districts"');
  });

  it("/neighborhoods no longer sections Official Planning Neighborhoods or Business Districts (moved to their own pages)", () => {
    const file = "app/neighborhoods/page.tsx";
    const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
    expect(content).not.toContain("official_planning");
    expect(content).not.toContain("business_district");
  });

  it("/neighborhoods shows Corridor Districts (regression guard for the pre-existing display bug)", () => {
    const file = "app/neighborhoods/page.tsx";
    const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
    expect(content).toContain('"corridor"');
  });
});
