import Link from "next/link";
import { findDuplicateCandidates } from "../../_actions/subdivisions";
import { DuplicateCandidatesPanel } from "./_DuplicateCandidatesPanel";

export default async function SubdivisionDuplicatesPage() {
  const { candidates, error } = await findDuplicateCandidates();

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-text-secondary mb-2">
            Admin
          </p>
          <h1 className="text-2xl font-bold text-text-primary">Possible duplicate subdivisions</h1>
          <p className="text-sm text-text-secondary mt-1">
            Name and alias similarity matches across active subdivisions. Similarity alone cannot
            tell two genuinely distinct plats apart, so every pair needs human confirmation before
            merging. Merging never deletes a record — the losing record is marked
            &ldquo;deprecated&rdquo; and its history is reattributed to the surviving record.
          </p>
        </div>
        <Link
          href="/admin/subdivisions"
          className="shrink-0 text-sm text-accent-teal hover:opacity-80 transition-opacity"
        >
          ← Back to subdivisions
        </Link>
      </div>

      {error && (
        <p className="text-accent-red text-sm mb-4">Error loading candidates: {error}</p>
      )}

      <DuplicateCandidatesPanel candidates={candidates} />
    </div>
  );
}
