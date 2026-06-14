import type { ParcelFeature } from "../lib/parcelTypes";

type Props = {
  blockParcels: ParcelFeature[];
  allParcels: ParcelFeature[];
};

const DECADES = [
  "1880s","1890s","1900s","1910s","1920s","1930s","1940s",
  "1950s","1960s","1970s","1980s","1990s","2000s","2010s","2020s"
];

function decadeOf(year: number): string {
  return `${Math.floor(year / 10) * 10}s`;
}

function medianYear(parcels: ParcelFeature[]): number | null {
  const years = parcels
    .map(f => f.properties.year_built)
    .filter((y): y is number => typeof y === "number" && y > 1800 && y <= 2030);
  if (years.length === 0) return null;
  const s = [...years].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? Math.round((s[m - 1] + s[m]) / 2) : s[m];
}

function dominantDecade(parcels: ParcelFeature[]): string | null {
  const counts = new Map<string, number>();
  parcels.forEach(f => {
    const y = f.properties.year_built;
    if (typeof y !== "number" || y <= 1800 || y > 2030) return;
    const d = decadeOf(y);
    counts.set(d, (counts.get(d) ?? 0) + 1);
  });
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export function BlockEraCard({ blockParcels, allParcels }: Props) {
  if (blockParcels.length < 3 || allParcels.length < 100) return null;

  const blockMedian = medianYear(blockParcels);
  const cityMedian = medianYear(allParcels);
  const blockDominant = dominantDecade(blockParcels);

  if (!blockMedian || !cityMedian) return null;

  // City decade distribution for the bar chart
  const cityDecadeCounts = new Map<string, number>();
  allParcels.forEach(f => {
    const y = f.properties.year_built;
    if (typeof y !== "number" || y <= 1800 || y > 2030) return;
    cityDecadeCounts.set(decadeOf(y), (cityDecadeCounts.get(decadeOf(y)) ?? 0) + 1);
  });
  const presentDecades = DECADES.filter(d => (cityDecadeCounts.get(d) ?? 0) > 0);
  const maxCount = Math.max(...presentDecades.map(d => cityDecadeCounts.get(d) ?? 0));

  // Percentile: how many city homes are newer than this block's median
  const cityYears = allParcels
    .map(f => f.properties.year_built)
    .filter((y): y is number => typeof y === "number" && y > 1800 && y <= 2030);
  const newerCount = cityYears.filter(y => y > blockMedian).length;
  const olderPercent = Math.round((newerCount / cityYears.length) * 100);

  const diff = blockMedian - cityMedian;
  let comparisonNote: string;
  if (Math.abs(diff) <= 4) {
    comparisonNote = `Built around the same time as Park Ridge overall. Block median: ${blockMedian} · City median: ${cityMedian}.`;
  } else if (diff < 0) {
    comparisonNote = `This block predates the city's typical era. Block median: ${blockMedian} · City median: ${cityMedian}.`;
  } else {
    comparisonNote = `This block came in later than most of Park Ridge. Block median: ${blockMedian} · City median: ${cityMedian}.`;
  }

  return (
    <div className="block-era-card">
      <p className="bec-eyebrow">When this block developed</p>
      <div className="bec-headline">
        {blockDominant && <span className="bec-decade">{blockDominant}</span>}
        <span className="bec-percentile">Older than {olderPercent}% of Park Ridge</span>
      </div>

      {/* Decade bar chart — city distribution, block decade highlighted */}
      <div
        className="bec-chart"
        role="img"
        aria-label={`Park Ridge homes by decade. This block's era: ${blockDominant ?? "unknown"}.`}
      >
        {presentDecades.map(decade => {
          const count = cityDecadeCounts.get(decade) ?? 0;
          const heightPct = Math.max(5, Math.round((count / maxCount) * 100));
          const isBlock = decade === blockDominant;
          return (
            <div
              key={decade}
              className={`bec-bar-wrap${isBlock ? " is-active" : ""}`}
              title={`${decade}: ${count.toLocaleString()} homes`}
            >
              {isBlock && <span className="bec-bar-label">{decade}</span>}
              <div className="bec-bar" style={{ height: `${heightPct}%` }} />
            </div>
          );
        })}
      </div>
      <div className="bec-chart-axis">
        <span>{presentDecades[0]}</span>
        <span>Park Ridge homes by decade</span>
        <span>{presentDecades[presentDecades.length - 1]}</span>
      </div>

      <p className="bec-note">{comparisonNote}</p>
    </div>
  );
}
