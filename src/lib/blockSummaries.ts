import type { ParcelFeature } from "./parcelTypes";
import type { RankedProperty } from "./rankings";
import { ROUTES } from "./routes";

export type BlockSummary = {
  blockId: string;
  label: string;
  parcelCount: number;
  totalPermits: number;
  totalSales: number;
  avgPermits: number;
  avgSales: number;
  oldestYear: number | null;
  newestYear: number | null;
  avgAssessmentChange: number | null;
  redevelopmentScore: number;
};

function blockRedevelopmentScore(features: ParcelFeature[]): number {
  let score = 0;
  for (const f of features) {
    const pp = f.properties.permit_pressure_type;
    if (pp === "direct_teardown") score += 20;
    else if (pp === "new_construction") score += 15;
    else if (pp === "addition") score += 8;
    else if (pp === "remodel") score += 5;
    else if (pp === "recent_permit") score += 3;
    score += Math.min(f.properties.permit_count ?? 0, 10);
    if ((f.properties.nearby_teardown_count ?? 0) > 0) score += 5;
  }
  return score;
}

function deriveBlockLabel(features: ParcelFeature[], blockId: string): string {
  const streetCounts: Record<string, number> = {};
  const streetNumbers: Record<string, number[]> = {};
  for (const f of features) {
    const addr = (f.properties.address ?? "").trim();
    const match = addr.match(/^(\d+)\s+(.+)$/);
    if (match) {
      const num = parseInt(match[1]);
      const street = match[2].trim();
      streetCounts[street] = (streetCounts[street] ?? 0) + 1;
      if (!streetNumbers[street]) streetNumbers[street] = [];
      streetNumbers[street].push(num);
    }
  }
  const topStreet = Object.entries(streetCounts).sort(([, a], [, b]) => b - a)[0]?.[0];
  if (!topStreet) return features[0]?.properties.address?.split(" ").slice(1).join(" ") ?? blockId;
  const nums = streetNumbers[topStreet].sort((a, b) => a - b);
  const min = nums[0];
  const max = nums[nums.length - 1];
  const formatted = topStreet.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  return min === max ? `${min} ${formatted}` : `${min}–${max} ${formatted}`;
}

export function buildBlockSummaries(
  features: ParcelFeature[],
  minParcels = 3
): BlockSummary[] {
  const byBlock = new Map<string, ParcelFeature[]>();
  for (const f of features) {
    const id = f.properties.street_block_id || f.properties.street_block_tract;
    if (!id) continue;
    if (!byBlock.has(id)) byBlock.set(id, []);
    byBlock.get(id)!.push(f);
  }

  const summaries: BlockSummary[] = [];
  for (const [blockId, blockFeatures] of byBlock) {
    if (blockFeatures.length < minParcels) continue;
    const years = blockFeatures
      .map((f) => f.properties.year_built)
      .filter((y): y is number => y != null && y >= 1800 && y <= 2030);
    const totalPermits = blockFeatures.reduce((s, f) => s + (f.properties.permit_count ?? 0), 0);
    const totalSales = blockFeatures.reduce((s, f) => s + (f.properties.sale_count ?? 0), 0);
    const changePcts = blockFeatures
      .map((f) => f.properties.assessed_value_change_pct)
      .filter((v): v is number => v != null && !isNaN(v));
    summaries.push({
      blockId,
      label: deriveBlockLabel(blockFeatures, blockId),
      parcelCount: blockFeatures.length,
      totalPermits,
      totalSales,
      avgPermits: totalPermits / blockFeatures.length,
      avgSales: totalSales / blockFeatures.length,
      oldestYear: years.length ? Math.min(...years) : null,
      newestYear: years.length ? Math.max(...years) : null,
      avgAssessmentChange: changePcts.length
        ? changePcts.reduce((a, b) => a + b, 0) / changePcts.length
        : null,
      redevelopmentScore: blockRedevelopmentScore(blockFeatures),
    });
  }
  return summaries;
}

export function blockSummariesToRanked(
  summaries: BlockSummary[],
  sortKey: keyof BlockSummary,
  valueLabel: (b: BlockSummary) => string,
  secondaryLabel?: (b: BlockSummary) => string,
  direction: "asc" | "desc" = "desc",
  limit = 10
): RankedProperty[] {
  const sorted = [...summaries]
    .filter((b) => b[sortKey] != null)
    .sort((a, b) => {
      const av = a[sortKey] as number ?? 0;
      const bv = b[sortKey] as number ?? 0;
      return direction === "desc" ? bv - av : av - bv;
    })
    .slice(0, limit);

  return sorted.map((b) => ({
    pin: b.blockId,
    address: b.label,
    value: b[sortKey] as number ?? 0,
    valueLabel: valueLabel(b),
    secondaryLabel: secondaryLabel ? secondaryLabel(b) : `${b.parcelCount} properties`,
    linkTo: ROUTES.block(b.blockId),
  }));
}
