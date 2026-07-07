import { describe, it, expect } from "vitest";
import { describeLinkResult, type BulkLinkResult } from "./platMappingMessages";

function result(overrides: Partial<BulkLinkResult>): BulkLinkResult {
  return {
    linkedCount: 0,
    totalMatchingCount: 0,
    alreadyLinkedSameCount: 0,
    alreadyLinkedOtherCount: 0,
    conflictingSubdivisionNames: [],
    ...overrides,
  };
}

describe("describeLinkResult", () => {
  it("reports no matching parcels distinctly from a failed link", () => {
    const msg = describeLinkResult(result({ totalMatchingCount: 0 }), "Kinsey's Park Ridge Subdivision");
    expect(msg).toBe("No parcels match this code in Park Ridge.");
  });

  it("reports the normal happy path unchanged", () => {
    const msg = describeLinkResult(
      result({ linkedCount: 3, totalMatchingCount: 3 }),
      "Kinsey's Park Ridge Subdivision"
    );
    expect(msg).toBe("3 parcels linked to Kinsey's Park Ridge Subdivision.");
  });

  it("uses singular wording for exactly one parcel linked", () => {
    const msg = describeLinkResult(result({ linkedCount: 1, totalMatchingCount: 1 }), "Arcadia Gardens");
    expect(msg).toBe("1 parcel linked to Arcadia Gardens.");
  });

  it("flags a partial conflict when some parcels are already linked elsewhere", () => {
    const msg = describeLinkResult(
      result({
        linkedCount: 2,
        totalMatchingCount: 5,
        alreadyLinkedOtherCount: 3,
        conflictingSubdivisionNames: ["Arcadia Gardens"],
      }),
      "Kinsey's Park Ridge Subdivision"
    );
    expect(msg).toContain("2 parcels linked to Kinsey's Park Ridge Subdivision");
    expect(msg).toContain("3 matching parcels are already linked elsewhere (Arcadia Gardens)");
  });

  it("distinguishes 'already linked to this same subdivision, nothing to do' from a real conflict", () => {
    const msg = describeLinkResult(
      result({ linkedCount: 0, totalMatchingCount: 4, alreadyLinkedSameCount: 4 }),
      "Kinsey's Park Ridge Subdivision"
    );
    expect(msg).toBe(
      "All 4 matching parcels are already linked to Kinsey's Park Ridge Subdivision. Nothing to do."
    );
    expect(msg).not.toContain("elsewhere");
  });

  it("the exact regression case: 0 linked because every match is already linked to a DIFFERENT subdivision", () => {
    const msg = describeLinkResult(
      result({
        linkedCount: 0,
        totalMatchingCount: 1,
        alreadyLinkedOtherCount: 1,
        conflictingSubdivisionNames: ["Arcadia Gardens"],
      }),
      "Kinsey's Park Ridge Subdivision"
    );
    expect(msg).toContain("0 parcels linked");
    expect(msg).toContain("already linked to a different subdivision (Arcadia Gardens)");
    expect(msg).toContain("Unlink/Reassign");
  });
});
