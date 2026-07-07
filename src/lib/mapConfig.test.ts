import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  buildNeighborhoodFillExpression,
  neighborhoodPropertyGetter,
  NEIGHBORHOOD_CATEGORICAL_PALETTE,
  NEIGHBORHOOD_FALLBACK_COLOR,
  NEIGHBORHOOD_TYPE_PROPERTY_KEYS,
  DEFAULT_NEIGHBORHOOD_TYPE,
} from "./mapConfig";

// ---------------------------------------------------------------------------
// buildNeighborhoodFillExpression
// ---------------------------------------------------------------------------
describe("buildNeighborhoodFillExpression", () => {
  const districts = [
    { id: "official_planning:a", label: "Uptown", slug: "uptown" },
    { id: "official_planning:b", label: "Downtown", slug: "downtown" },
    { id: "official_planning:c", label: "Westside", slug: "westside" },
  ];

  it("assigns colors in fixed palette order, not cycled or sorted", () => {
    const { legend } = buildNeighborhoodFillExpression(["get", "official_planning_neighborhood_id"], districts);
    expect(legend.map((e) => e.color)).toEqual(NEIGHBORHOOD_CATEGORICAL_PALETTE.slice(0, 3));
  });

  it("preserves district order, id, label, and slug in the legend", () => {
    const { legend } = buildNeighborhoodFillExpression(["get", "official_planning_neighborhood_id"], districts);
    expect(legend).toEqual(
      districts.map((d, i) => ({ ...d, color: NEIGHBORHOOD_CATEGORICAL_PALETTE[i] }))
    );
  });

  it("every legend entry carries a slug for its detail-page link", () => {
    const { legend } = buildNeighborhoodFillExpression(["get", "official_planning_neighborhood_id"], districts);
    legend.forEach((entry) => {
      expect(entry.slug).toBeTruthy();
    });
  });

  it("falls back to the neutral gray beyond the 8-hue palette", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      id: `d${i}`,
      label: `District ${i}`,
      slug: `d${i}`,
    }));
    const { legend } = buildNeighborhoodFillExpression(["get", "official_planning_neighborhood_id"], many);
    expect(legend[8].color).toBe(NEIGHBORHOOD_FALLBACK_COLOR);
    expect(legend[9].color).toBe(NEIGHBORHOOD_FALLBACK_COLOR);
  });

  it("builds a match expression ending in the fallback color", () => {
    const { expression } = buildNeighborhoodFillExpression(["get", "official_planning_neighborhood_id"], districts);
    expect(expression[0]).toBe("match");
    expect(expression[expression.length - 1]).toBe(NEIGHBORHOOD_FALLBACK_COLOR);
  });
});

// ---------------------------------------------------------------------------
// neighborhoodPropertyGetter
// ---------------------------------------------------------------------------
describe("neighborhoodPropertyGetter", () => {
  it("defaults to the official planning column when no types given", () => {
    expect(neighborhoodPropertyGetter([])).toEqual([
      "get",
      NEIGHBORHOOD_TYPE_PROPERTY_KEYS[DEFAULT_NEIGHBORHOOD_TYPE],
    ]);
  });

  it("resolves a single type to a plain get expression", () => {
    expect(neighborhoodPropertyGetter(["business_district"])).toEqual([
      "get",
      "business_district_id",
    ]);
  });

  it("coalesces multiple types into one expression", () => {
    expect(neighborhoodPropertyGetter(["corridor", "local_market"])).toEqual([
      "coalesce",
      ["get", "corridor_id"],
      ["get", "local_neighborhood_id"],
    ]);
  });
});

// ---------------------------------------------------------------------------
// The static parcel GeoJSON regeneration script must keep carrying the 4
// typed taxonomy columns -- this silently regressed once already (the file
// predated the neighborhood-model restructure and had none of them), which
// is why the "Neighborhood" map lens rendered everything in flat gray.
// ---------------------------------------------------------------------------
describe("update_map_geojson.py taxonomy columns", () => {
  it("MAP_FIELDS includes all 4 typed neighborhood/district FK columns", () => {
    const file = "scripts/data/update_map_geojson.py";
    const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
    for (const col of [
      "official_planning_neighborhood_id",
      "business_district_id",
      "local_neighborhood_id",
      "corridor_id",
    ]) {
      expect(content, `MAP_FIELDS missing ${col}`).toContain(col);
    }
  });
});
