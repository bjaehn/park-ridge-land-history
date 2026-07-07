/**
 * Rendered-DOM structural-equality test for the 3 neighborhood-family
 * overview pages (/neighborhoods, /planning-districts, /business-districts).
 *
 * The prior drift guard (neighborhoodOverviewConsistency.test.ts, before
 * this rewrite) only checked the relative order of 4 specific tags and
 * whether each page used the shared component -- it never actually
 * rendered the pages and compared the full section list, so it couldn't
 * catch /neighborhoods carrying an extra intro paragraph + charts block
 * the other two pages didn't have. This test renders the real shared
 * component (@testing-library/react + jsdom, both already project
 * dependencies but unused until now) with the exact prop shapes each of
 * the 3 real pages passes, and asserts the section list is identical.
 */

import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { NeighborhoodTypeIndexPage } from "../components/NeighborhoodTypeIndexPage";

// MapView needs WebGL/canvas and network data unavailable in jsdom;
// NeighborhoodCharts fetches over the network via useEffect. Both are
// irrelevant to section ORDER, which is what this test verifies -- stub
// them out so the render is synchronous and deterministic. The
// NeighborhoodCharts stub is a spy so a later test can assert it always
// receives that page's OWN neighborhoodTypes (the original bug: /neighborhoods
// showed Planning District chart data mislabeled as its own).
const neighborhoodChartsSpy = vi.fn((_props: { neighborhoodTypes: readonly string[] }) => (
  <div data-testid="charts-mock" />
));

vi.mock("@/components/MapView", () => ({
  MapView: () => <div data-testid="map-mock" />,
}));
vi.mock("@/components/ui/NeighborhoodCharts", () => ({
  NeighborhoodCharts: (props: { neighborhoodTypes: readonly string[] }) => neighborhoodChartsSpy(props),
}));

// Mirrors the exact props each real app/*/page.tsx passes to
// NeighborhoodTypeIndexPage (see those files for the source of truth).
const PAGE_PROPS = [
  {
    name: "/neighborhoods",
    props: {
      neighborhoodTypes: ["corridor", "local_market"] as const,
      breadcrumbLabel: "Neighborhoods",
      title: "Neighborhoods",
      subtitle: "Park Ridge's corridor districts and local, informal names, each with its own construction history.",
      summaries: [],
      bbox: null,
      siblingLinks: [
        { label: "Planning Districts", href: "/planning-districts" },
        { label: "Business Districts", href: "/business-districts" },
      ],
    },
  },
  {
    name: "/planning-districts",
    props: {
      neighborhoodTypes: ["official_planning"] as const,
      breadcrumbLabel: "Planning Districts",
      title: "Official Planning Districts",
      subtitle: "Park Ridge's official planning neighborhoods, each with its own construction history.",
      summaries: [],
      bbox: null,
      siblingLinks: [
        { label: "Neighborhoods", href: "/neighborhoods" },
        { label: "Business Districts", href: "/business-districts" },
      ],
    },
  },
  {
    name: "/business-districts",
    props: {
      neighborhoodTypes: ["business_district"] as const,
      breadcrumbLabel: "Business Districts",
      title: "Business Districts",
      subtitle: "Park Ridge's commercial and mixed-use districts, each with its own construction history.",
      summaries: [],
      bbox: null,
      siblingLinks: [
        { label: "Neighborhoods", href: "/neighborhoods" },
        { label: "Planning Districts", href: "/planning-districts" },
      ],
    },
  },
] as const;

function sectionOrder(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("[data-section]")).map((el) =>
    el.getAttribute("data-section")
  ) as string[];
}

describe("NeighborhoodTypeIndexPage renders identical section order for all 3 pages", () => {
  it("every page's section list is non-empty and includes the full canonical set", () => {
    for (const { name, props } of PAGE_PROPS) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { container } = render(<NeighborhoodTypeIndexPage {...(props as any)} />);
      const order = sectionOrder(container);
      expect(order, `${name} rendered no data-section markers`).toEqual([
        "breadcrumb",
        "header",
        "links",
        "charts",
        "map",
        "list",
        "source-note",
      ]);
    }
  });

  it("all 3 pages produce the exact same section order as each other", () => {
    const orders = PAGE_PROPS.map(({ props }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { container } = render(<NeighborhoodTypeIndexPage {...(props as any)} />);
      return sectionOrder(container);
    });
    expect(orders[0]).toEqual(orders[1]);
    expect(orders[1]).toEqual(orders[2]);
  });

  it.each(PAGE_PROPS)("$name links to its 2 siblings, never itself", ({ name, props }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { container } = render(<NeighborhoodTypeIndexPage {...(props as any)} />);
    const links = Array.from(container.querySelectorAll('[data-section="links"] a')).map((a) =>
      a.getAttribute("href")
    );
    expect(links).toHaveLength(2);
    expect(links).not.toContain(name);
  });

  it.each(PAGE_PROPS)("$name's charts receive that page's own neighborhoodTypes, not a fixed default", ({ props }) => {
    neighborhoodChartsSpy.mockClear();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<NeighborhoodTypeIndexPage {...(props as any)} />);
    expect(neighborhoodChartsSpy).toHaveBeenCalledTimes(1);
    expect(neighborhoodChartsSpy).toHaveBeenCalledWith({ neighborhoodTypes: props.neighborhoodTypes });
  });
});
