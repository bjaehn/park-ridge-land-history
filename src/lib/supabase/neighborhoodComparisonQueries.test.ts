/**
 * Regression guard for the neighborhood_price_comparison /
 * neighborhood_era_distribution RPC signature change (both went from
 * argless to accepting p_types text[] in
 * 20260707000015_neighborhood_charts_rpcs_by_type.sql, generalizing them
 * off a hardcoded official_planning_neighborhood_id scope). A silent
 * revert to the old argless .rpc() call would 404 against the new SQL
 * signature -- this mocks the Supabase client and asserts the call shape
 * directly, so it doesn't depend on live credentials or migration state.
 */

import { describe, it, expect, vi } from "vitest";

// vi.mock() factories are hoisted above top-level const declarations, so
// the mock fns must be created via vi.hoisted() -- a plain top-level const
// here would throw "Cannot access before initialization".
const { rpcMock, fromMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(() => Promise.resolve({ data: [], error: null })),
  fromMock: vi.fn(() => ({
    select: () => ({
      in: () => Promise.resolve({ data: [] }),
    }),
  })),
}));

vi.mock("./client", () => ({
  supabase: {
    rpc: rpcMock,
    from: fromMock,
  },
}));

import { fetchNeighborhoodPriceComparison, fetchNeighborhoodEraDistribution } from "./neighborhoodComparisonQueries";

describe("neighborhoodComparisonQueries pass p_types through to the RPCs", () => {
  it("fetchNeighborhoodPriceComparison calls neighborhood_price_comparison with p_types", async () => {
    rpcMock.mockClear();
    await fetchNeighborhoodPriceComparison(["business_district"]);
    expect(rpcMock).toHaveBeenCalledWith("neighborhood_price_comparison", { p_types: ["business_district"] });
  });

  it("fetchNeighborhoodEraDistribution calls neighborhood_era_distribution with p_types", async () => {
    rpcMock.mockClear();
    await fetchNeighborhoodEraDistribution(["corridor", "local_market"]);
    expect(rpcMock).toHaveBeenCalledWith("neighborhood_era_distribution", {
      p_types: ["corridor", "local_market"],
    });
  });

  it("both fetchers short-circuit to [] without calling the RPC when types is empty", async () => {
    rpcMock.mockClear();
    const price = await fetchNeighborhoodPriceComparison([]);
    const era = await fetchNeighborhoodEraDistribution([]);
    expect(price).toEqual([]);
    expect(era).toEqual([]);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
