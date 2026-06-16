type EraPortraitRow = {
  label: string;
  pre1920: number;
  boom: number;
  postwar: number;
  eighties: number;
  aughts: number;
  teens: number;
  recent: number;
  total: number;
};

type Props = { data: EraPortraitRow[] };

const ERA_SEGMENTS = [
  { key: "pre1920"  as const, label: "Pre-1920",  color: "#4c1d95" },
  { key: "boom"     as const, label: "1920-1945",  color: "#7c3aed" },
  { key: "postwar"  as const, label: "1946-1979",  color: "#0f766e" },
  { key: "eighties" as const, label: "1980-1999",  color: "#e6a64a" },
  { key: "aughts"   as const, label: "2000-2009",  color: "#c96a70" },
  { key: "teens"    as const, label: "2010-2019",  color: "#a85f84" },
  { key: "recent"   as const, label: "2020+",      color: "#6d617c" },
];

export function EraPortraitChart({ data }: Props) {
  if (!data.length) return null;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 mb-2">
        {ERA_SEGMENTS.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs text-text-muted">
            <span
              className="w-3 h-3 rounded-sm inline-block"
              style={{ background: s.color }}
            />
            {s.label}
          </span>
        ))}
      </div>
      {data.map((row) => (
        <div key={row.label} className="flex items-center gap-3">
          <span className="text-sm text-text-secondary w-24 shrink-0">{row.label}</span>
          <div className="flex-1 flex h-7 rounded overflow-hidden gap-px">
            {ERA_SEGMENTS.map((seg) => {
              const pct = row.total > 0 ? (row[seg.key] / row.total) * 100 : 0;
              if (pct < 0.5) return null;
              return (
                <div
                  key={seg.key}
                  title={`${seg.label}: ${Math.round(pct)}%`}
                  style={{ width: `${pct}%`, background: seg.color }}
                />
              );
            })}
          </div>
          <span className="text-xs text-text-muted w-10 text-right">
            {row.total.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}
