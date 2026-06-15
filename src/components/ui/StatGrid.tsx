type StatItem = {
  value: string | number;
  label: string;
  note?: string;
};

type Props = {
  stats: StatItem[];
  columns?: 2 | 3 | 4;
};

/**
 * Shared metric tile grid used on Home, City, Neighborhood, Street, and
 * Subdivision pages. All stat grids look identical; differentiation is
 * only in the data passed in.
 */
export function StatGrid({ stats, columns = 4 }: Props) {
  const colClass = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-3",
    4: "grid-cols-2 lg:grid-cols-4",
  }[columns];

  return (
    <div className={`grid ${colClass} gap-3`}>
      {stats.map((stat, i) => (
        <div
          key={i}
          className="bg-surface-card border border-surface-border rounded-lg px-5 py-4"
        >
          <div className="text-2xl font-bold text-text-primary leading-none mb-1">
            {stat.value}
          </div>
          <div className="text-sm text-text-secondary">{stat.label}</div>
          {stat.note && (
            <div className="text-xs text-text-muted mt-1">{stat.note}</div>
          )}
        </div>
      ))}
    </div>
  );
}
