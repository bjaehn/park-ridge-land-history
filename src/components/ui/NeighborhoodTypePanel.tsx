import type { NeighborhoodType } from "@/lib/data/neighborhoods";

type Props = {
  neighborhoodType: NeighborhoodType | null;
  hasBoundary: boolean;
};

const TYPE_EXPLANATIONS: Record<
  NonNullable<NeighborhoodType>,
  { explanation: string }
> = {
  official_planning: {
    explanation:
      "This is an official City of Park Ridge planning district. The boundary reflects the city's formal planning geography.",
  },
  business_district: {
    explanation:
      "This is a commercial district. The boundary is approximate and may not match a precise legal boundary.",
  },
  local_market: {
    explanation:
      "This area name appears in local use, real estate listings, or historical records. The boundary is approximate.",
  },
  corridor: {
    explanation:
      "This is a road corridor rather than a bounded area. The shape shown is a rough buffer around properties fronting the road, not a precise district boundary.",
  },
};

export function NeighborhoodTypePanel({ neighborhoodType, hasBoundary }: Props) {
  const typeConfig = neighborhoodType ? TYPE_EXPLANATIONS[neighborhoodType] : null;

  if (!typeConfig && hasBoundary) return null;

  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised px-4 py-3 text-sm space-y-0.5">
      {typeConfig && (
        <p className="text-text-secondary">{typeConfig.explanation}</p>
      )}
      {!hasBoundary && (
        <p className="text-text-muted">
          We do not have a verified boundary for this area yet.
        </p>
      )}
    </div>
  );
}
