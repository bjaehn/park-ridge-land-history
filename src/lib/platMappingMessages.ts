export type BulkLinkResult = {
  /** Rows actually updated by this call. */
  linkedCount: number;
  /** Rows matching municipality + subdivision_name, regardless of current link state. */
  totalMatchingCount: number;
  /** Matched rows already pointing at this same subdivisionId (no-op, not an error). */
  alreadyLinkedSameCount: number;
  /** Matched rows pointing at a DIFFERENT subdivision_id -- a real conflict. */
  alreadyLinkedOtherCount: number;
  /** Distinct names of those "other" subdivisions, for the result message. */
  conflictingSubdivisionNames: string[];
};

/**
 * Turns a BulkLinkResult into the exact result message shown on
 * /admin/plat-mapping and the subdivision detail page's Candidate
 * Properties panel, distinguishing "nothing matched," "already linked here,"
 * "linked to a different subdivision" (a real conflict), and the normal
 * happy path -- replacing a bare "0 parcels linked" with no explanation.
 */
export function describeLinkResult(result: BulkLinkResult, subdivisionName: string): string {
  if (result.totalMatchingCount === 0) {
    return "No parcels match this code in Park Ridge.";
  }
  if (result.linkedCount > 0 && result.alreadyLinkedOtherCount === 0) {
    return `${result.linkedCount} ${result.linkedCount === 1 ? "parcel" : "parcels"} linked to ${subdivisionName}.`;
  }
  if (result.linkedCount > 0 && result.alreadyLinkedOtherCount > 0) {
    return `${result.linkedCount} ${result.linkedCount === 1 ? "parcel" : "parcels"} linked to ${subdivisionName}. ${result.alreadyLinkedOtherCount} matching ${result.alreadyLinkedOtherCount === 1 ? "parcel is" : "parcels are"} already linked elsewhere (${result.conflictingSubdivisionNames.join(", ")}) and ${result.alreadyLinkedOtherCount === 1 ? "was" : "were"} left unchanged.`;
  }
  if (result.linkedCount === 0 && result.alreadyLinkedSameCount === result.totalMatchingCount) {
    return `All ${result.alreadyLinkedSameCount} matching ${result.alreadyLinkedSameCount === 1 ? "parcel is" : "parcels are"} already linked to ${subdivisionName}. Nothing to do.`;
  }
  if (result.linkedCount === 0 && result.alreadyLinkedOtherCount > 0) {
    return `0 parcels linked -- all ${result.alreadyLinkedOtherCount} matching ${result.alreadyLinkedOtherCount === 1 ? "parcel is" : "parcels are"} already linked to a different subdivision (${result.conflictingSubdivisionNames.join(", ")}). If that's a mistake, browse that code below and use Unlink/Reassign.`;
  }
  return `0 parcels linked to ${subdivisionName}.`;
}
