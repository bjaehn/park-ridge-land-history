/**
 * Regression guard for app/admin/_actions/platMapping.ts's Unlink/Reassign
 * predicates. subdivision_match_method = 'gis_page_code' is written by
 * exactly one code path in the whole codebase (verified by hand: the
 * historical ingestion script writes deed-derived match_method values, and
 * manual admin edits go through property_subdivision_links, never touching
 * this column) -- so it's the load-bearing safety clause that lets Unlink
 * and Reassign undo exactly what bulkLinkParcelsByPageCodes did, without
 * ever touching deed-verified, manually-confirmed, or GIS-lot spatial-
 * matched links. This codebase has already been bitten once by a subtly
 * wrong WHERE clause in this exact area (20260704000000_clear_orphaned_
 * placeholder_subdivision_ids.sql), so this is a static source scan --
 * matching the precedent in pageWidth.test.ts and sectionOrder.test.ts --
 * asserting the safety clause can't be silently dropped from a future edit.
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

function readSection(content: string, functionName: string): string {
  const start = content.indexOf(`function ${functionName}(`);
  expect(start, `function ${functionName} not found`).toBeGreaterThan(-1);
  // Every action in this file is terminated by a blank line before the next
  // top-level export/comment block -- slice to the next "export " after the
  // function start, which is always present since none of these are the
  // last export in the file.
  const nextExport = content.indexOf("\nexport ", start + 1);
  return content.slice(start, nextExport === -1 ? undefined : nextExport);
}

describe("platMapping.ts Unlink/Reassign safety predicates", () => {
  const file = path.resolve(process.cwd(), "app/admin/_actions/platMapping.ts");
  const content = fs.readFileSync(file, "utf-8");

  it("unlinkParcelsByPageCodes filters on the exclusive gis_page_code match method", () => {
    const section = readSection(content, "unlinkParcelsByPageCodes");
    expect(section).toContain(`.eq("subdivision_match_method", "gis_page_code")`);
    expect(section).toContain(`.eq("subdivision_id", subdivisionId)`);
    expect(section).toContain(`.in("subdivision_name", subdivisionNames)`);
  });

  it("fetchLinkedParcelsForPageCodes previews exactly what Unlink would affect (identical predicate)", () => {
    const section = readSection(content, "fetchLinkedParcelsForPageCodes");
    expect(section).toContain(`.eq("subdivision_match_method", "gis_page_code")`);
    expect(section).toContain(`.eq("subdivision_id", subdivisionId)`);
  });

  it("bulkLinkParcelsByPageCodes still only touches unassigned parcels (the pre-existing safety clause)", () => {
    const section = readSection(content, "bulkLinkParcelsByPageCodes");
    expect(section).toContain(`.is("subdivision_id", null)`);
  });

  it("reassignParcelsByPageCodes composes the unlink and link actions rather than a bespoke predicate", () => {
    const section = readSection(content, "reassignParcelsByPageCodes");
    expect(section).toContain("unlinkParcelsByPageCodes(fromSubdivisionId, gisPageCodes)");
    expect(section).toContain("bulkLinkParcelsByPageCodes(toSubdivisionId, gisPageCodes)");
  });

  it("every parcel-mutating action revalidates /admin/plat-mapping (Step 4's status list would otherwise go stale)", () => {
    for (const fn of [
      "bulkLinkParcelsByPageCodes",
      "unlinkParcelsByPageCodes",
      "reassignParcelsByPageCodes",
    ]) {
      const section = readSection(content, fn);
      expect(section, `${fn} missing revalidatePath("/admin/plat-mapping")`).toContain(
        `revalidatePath("/admin/plat-mapping")`
      );
    }
  });
});
