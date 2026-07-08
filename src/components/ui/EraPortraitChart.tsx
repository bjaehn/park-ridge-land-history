import { getEraColor } from "@/lib/mapConfig";

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
  /** Set to false when the entity has zero mapped properties (distinct from
   *  having properties with no known build year). Renders an explicit
   *  empty-state message instead of a blank/zero bar. */
  hasProperties?: boolean;
};

type Props = { data: EraPortraitRow[] };

// Each segment's color comes from getEraColor() at one representative year
// per span, the same "one map-legend color per bucket" approach the streets
// index uses for its own fixed multi-decade buckets. This makes every color
// here traceable to the real per-decade ERA_PALETTE the map legend uses,
// rather than a hand-picked palette with no relationship to it.
const ERA_SEGMENTS = [
  { key: "pre1920"  as const, label: "Pre-1920",  repYear: 1910 },
  { key: "boom"     as const, label: "1920-1945",  repYear: 1930 },
  { key: "postwar"  as const, label: "1946-1979",  repYear: 1960 },
  { key: "eighties" as const, label: "1980-1999",  repYear: 1985 },
  { key: "aughts"   as const, label: "2000-2009",  repYear: 2005 },
  { key: "teens"    as const, label: "2010-2019",  repYear: 2015 },
  { key: "recent"   as const, label: "2020+",      repYear: 2025 },
].map((segment) => ({ ...segment, color: getEraColor(segment.repYear) ?? "#64748b" }));

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
          {row.hasProperties === false ? (
            <span className="flex-1 text-xs text-text-muted italic">
              No properties are currently included
            </span>
          ) : (
            <>
              <div className="flex-1 flex h-7 rounded overflow-hidden gap-px">
                {ERA_SEGMENTS.map((seg) => {
                  const pct = row.total > 0 ? (row[seg.key] / row.total) * 100 : 0;
                  if (pct < 0.5) return null;
                  const pctRounded = Math.round(pct);
                  return (
                    <div
                      key={seg.key}
                      title={`${seg.label}: ${pctRounded}%`}
                      aria-label={`${seg.label}: ${pctRounded}%`}
                      className="relative flex items-center justify-center overflow-hidden"
                      style={{ width: `${pct}%`, background: seg.color }}
                    >
                      {pct >= 12 && (
                        <span className="text-[10px] font-semibold text-white/80 tabular-nums select-none">
                          {pctRounded}%
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <span className="text-xs text-text-muted w-10 text-right">
                {row.total.toLocaleString()}
              </span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
