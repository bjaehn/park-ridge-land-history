type Props = {
  data: Array<{
    label: string;
    year2015: number | null;
    year2024: number | null;
    pctChange: number | null;
    /** Set to false when the entity has zero mapped properties (distinct
     *  from having properties with no qualifying sale). Renders an explicit
     *  empty-state message instead of blank bars. */
    hasProperties?: boolean;
  }>;
};

export function NeighborhoodPriceChart({ data }: Props) {
  if (!data.length) return null;
  const max = Math.max(...data.flatMap((d) => [d.year2015 ?? 0, d.year2024 ?? 0]));

  return (
    <div className="space-y-3">
      <div className="flex gap-4 text-xs text-text-muted mb-2">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-surface-border inline-block" />
          2015
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-accent-purple inline-block" />
          2024
        </span>
      </div>
      {data.map((row) => (
        <div key={row.label}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-text-primary w-24 shrink-0">{row.label}</span>
            {row.hasProperties === false ? (
              <span className="flex-1 ml-3 text-xs text-text-muted italic">
                No properties are currently included
              </span>
            ) : (
              <div className="flex-1 space-y-1 ml-3">
                {row.year2015 && (
                  <div className="flex items-center gap-2">
                    <div
                      className="h-4 rounded-sm bg-surface-border"
                      style={{ width: `${(row.year2015 / max) * 100}%` }}
                    />
                    <span className="text-xs text-text-muted whitespace-nowrap">
                      ${(row.year2015 / 1000).toFixed(0)}K
                    </span>
                  </div>
                )}
                {row.year2024 && (
                  <div className="flex items-center gap-2">
                    <div
                      className="h-4 rounded-sm bg-accent-purple"
                      style={{ width: `${(row.year2024 / max) * 100}%` }}
                    />
                    <span className="text-xs text-text-secondary whitespace-nowrap">
                      ${(row.year2024 / 1000).toFixed(0)}K
                      {row.pctChange !== null && (
                        <span className="text-green-400 ml-1">+{row.pctChange}%</span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
