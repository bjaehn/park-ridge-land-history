import { formatCount, formatPercent, formatDecade } from "@/lib/formatters";
import type { DecadeRow } from "./ConstructionByDecadeChart";

type Props = {
  rows: DecadeRow[];
  total: number;
  title?: string;
};

/**
 * Decade-by-decade coverage table. Used on City, Neighborhood, Street,
 * and Subdivision pages. Shares the same DecadeRow type as the chart.
 *
 * Decade labels come from formatDecade. "Suspicious" never appears here.
 */
export function CoverageTable({ rows, total, title }: Props) {
  const sorted = [...rows].sort((a, b) => {
    const toYear = (d: string) => {
      if (d === "Pre-1900") return 1899;
      const m = d.match(/^(\d{4})/);
      return m ? parseInt(m[1], 10) : 9999;
    };
    return toYear(a.decade) - toYear(b.decade);
  });

  return (
    <div>
      {title && (
        <h2 className="text-base font-semibold text-text-primary mb-3">{title}</h2>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-surface-border text-left">
              <th className="py-2 pr-4 text-xs font-semibold text-text-muted uppercase tracking-wide">
                Decade
              </th>
              <th className="py-2 pr-4 text-xs font-semibold text-text-muted uppercase tracking-wide text-right">
                Homes
              </th>
              <th className="py-2 text-xs font-semibold text-text-muted uppercase tracking-wide text-right">
                Share
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {sorted.map((row) => {
              const label = formatDecade(row.decade);
              const pct = total > 0 ? (row.count / total) * 100 : 0;
              return (
                <tr key={row.decade} className="hover:bg-surface-raised transition-colors">
                  <td className="py-2 pr-4 text-text-secondary font-mono text-xs">
                    {label}
                  </td>
                  <td className="py-2 pr-4 text-text-primary text-right tabular-nums">
                    {formatCount(row.count, "home", "homes")}
                  </td>
                  <td className="py-2 text-text-muted text-right tabular-nums">
                    {formatPercent(pct, 1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-surface-border">
              <td className="py-2 pr-4 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                Total
              </td>
              <td className="py-2 pr-4 text-text-primary text-right tabular-nums font-semibold">
                {formatCount(total, "home", "homes")}
              </td>
              <td className="py-2 text-text-muted text-right">100%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
