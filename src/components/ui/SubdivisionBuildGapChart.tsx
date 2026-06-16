type GapRow = {
  name: string;
  recordedYear: number;
  earliestBuilt: number;
  gapYears: number;
  lotCount: number;
};

type Props = { data: GapRow[] };

export function SubdivisionBuildGapChart({ data }: Props) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.gapYears));
  return (
    <div className="space-y-1.5">
      {data.slice(0, 15).map((row) => (
        <div key={row.name} className="flex items-center gap-2">
          <div className="w-48 shrink-0">
            <p className="text-xs text-text-primary truncate">{row.name}</p>
            <p className="text-xs text-text-muted">
              Platted {row.recordedYear}, built {row.earliestBuilt}
            </p>
          </div>
          <div className="flex-1 flex items-center gap-2">
            <div
              className="h-3 rounded-sm bg-accent-purple"
              style={{ width: `${(row.gapYears / max) * 100}%` }}
            />
            <span className="text-xs text-text-muted whitespace-nowrap">
              {row.gapYears} yrs
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
