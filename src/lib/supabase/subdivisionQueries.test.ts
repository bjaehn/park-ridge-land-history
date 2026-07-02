/**
 * Regression test for the 2026-07 bug class: a subdivision's property count
 * showed different numbers on different pages (e.g. Kinsey's Park Ridge
 * Subdivision showed 80 on one page and 396 on another) because each page's
 * data-fetching function queried a different, independently-wrong linkage
 * source instead of the canonical union. See CLAUDE.md, "Subdivision ->
 * parcel linkage - always union all 3 sources".
 *
 * These tests hit the live Supabase database directly -- this class of bug
 * can only be caught by comparing what each page's real data-fetching
 * function actually returns, not by mocking. When Supabase credentials
 * aren't configured (e.g. a local machine with no NEXT_PUBLIC_SUPABASE_URL
 * set), the suite skips instead of failing, so it doesn't block builds that
 * can't reach the database. Wherever it CAN run -- including the production
 * build, which has real credentials -- it must pass.
 */

import { describe, it, expect } from "vitest";
import { supabase } from "./client";
import { fetchSubdivisionIndex, fetchSubdivisionParcels, fetchSubdivisionMapData } from "./subdivisionQueries";

describe.skipIf(!supabase)("subdivision property counts match across pages", () => {
  it("every subdivision's linked_parcel_count (shown on the /subdivisions index page) matches the canonical linked-pin union", async () => {
    const index = await fetchSubdivisionIndex();
    const withParcels = index.filter((s) => (s.linked_parcel_count ?? 0) > 0);
    expect(withParcels.length).toBeGreaterThan(0);

    for (const sub of withParcels) {
      const { data, error } = await supabase!.rpc("get_linked_pins_for_subdivision", {
        p_subdivision_id: sub.id,
      });
      expect(error, sub.name).toBeNull();
      const pinCount = (data as Array<{ pin: string }> | null)?.length ?? 0;
      expect(pinCount, `${sub.name}: index shows ${sub.linked_parcel_count}, union RPC returns ${pinCount}`).toBe(
        sub.linked_parcel_count
      );
    }
  }, 60000);

  it("the detail page's property list and map match the index page's count, for the largest subdivisions", async () => {
    const index = await fetchSubdivisionIndex();
    const largest = [...index]
      .filter((s) => (s.linked_parcel_count ?? 0) > 0)
      .sort((a, b) => (b.linked_parcel_count ?? 0) - (a.linked_parcel_count ?? 0))
      .slice(0, 5);
    expect(largest.length).toBeGreaterThan(0);

    for (const sub of largest) {
      const parcels = await fetchSubdivisionParcels(sub.id);
      expect(
        parcels.length,
        `${sub.name}: index shows ${sub.linked_parcel_count}, detail page property list has ${parcels.length}`
      ).toBe(sub.linked_parcel_count);

      const mapData = await fetchSubdivisionMapData(sub.id);
      expect(
        mapData.pins.length,
        `${sub.name}: index shows ${sub.linked_parcel_count}, detail page map has ${mapData.pins.length} pins`
      ).toBe(sub.linked_parcel_count);
    }
  }, 60000);

  it("no linked pin is returned twice by the canonical union (each parcel counted once)", async () => {
    const index = await fetchSubdivisionIndex();
    const sample = [...index]
      .filter((s) => (s.linked_parcel_count ?? 0) > 0)
      .sort((a, b) => (b.linked_parcel_count ?? 0) - (a.linked_parcel_count ?? 0))
      .slice(0, 5);

    for (const sub of sample) {
      const { data } = await supabase!.rpc("get_linked_pins_for_subdivision", {
        p_subdivision_id: sub.id,
      });
      const pins = (data as Array<{ pin: string }> | null)?.map((r) => r.pin) ?? [];
      expect(new Set(pins).size, sub.name).toBe(pins.length);
    }
  }, 60000);
});
