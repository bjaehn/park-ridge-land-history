import Link from "next/link";
import { adminSupabase } from "@/lib/supabase/adminClient";

const CONFIDENCE_COLORS: Record<string, string> = {
  high:    "text-confidence-high   bg-confidence-high/10   border-confidence-high/30",
  medium:  "text-confidence-medium bg-confidence-medium/10 border-confidence-medium/30",
  low:     "text-confidence-low    bg-confidence-low/10    border-confidence-low/30",
  unknown: "text-text-muted        bg-surface-card         border-surface-border",
};

type SortKey =
  | "name"
  | "entity_type"
  | "recorded_year"
  | "total_properties"
  | "deeded_properties"
  | "earliest_year_built"
  | "confidence_level";

type SortDir = "asc" | "desc";

type Row = {
  id: string;
  name: string;
  entity_type: string | null;
  recorded_year: number | null;
  earliest_year_built: number | null;
  confidence_level: string;
  total_properties: number;
  deeded_properties: number;
};

function sortValue(row: Row, key: SortKey): string | number | null {
  switch (key) {
    case "name":               return row.name;
    case "entity_type":        return row.entity_type ?? null;
    case "recorded_year":      return row.recorded_year ?? null;
    case "total_properties":   return row.total_properties;
    case "deeded_properties":  return row.deeded_properties;
    case "earliest_year_built":return row.earliest_year_built ?? null;
    case "confidence_level":   return row.confidence_level ?? null;
  }
}

function sortRows(rows: Row[], key: SortKey, dir: SortDir): Row[] {
  return [...rows].sort((a, b) => {
    const av = sortValue(a, key);
    const bv = sortValue(b, key);
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return dir === "asc" ? cmp : -cmp;
  });
}

function SortableHeader({
  label,
  sortKey,
  currentSort,
  currentDir,
  q,
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  currentDir: SortDir;
  q: string;
}) {
  const isActive = currentSort === sortKey;
  const nextDir: SortDir = isActive && currentDir === "asc" ? "desc" : "asc";
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("sort", sortKey);
  params.set("dir", nextDir);

  return (
    <Link
      href={`?${params.toString()}`}
      className={`inline-flex items-center gap-1 hover:text-text-primary transition-colors select-none ${
        isActive ? "text-text-primary" : "text-text-muted"
      }`}
    >
      {label}
      {isActive && (
        <span className="text-accent-teal">{currentDir === "asc" ? "↑" : "↓"}</span>
      )}
    </Link>
  );
}

export default async function SubdivisionsListPage({
  searchParams,
}: {
  searchParams: { q?: string; sort?: string; dir?: string };
}) {
  const q = searchParams.q?.trim() || "";
  const currentSort: SortKey =
    (searchParams.sort as SortKey | undefined) ?? "recorded_year";
  const currentDir: SortDir =
    searchParams.dir === "desc" ? "desc" : "asc";

  let subQuery = adminSupabase
    .from("subdivisions")
    .select("id, name, entity_type, recorded_year, earliest_year_built, confidence_level");

  if (q) subQuery = subQuery.ilike("name", `%${q}%`);

  const [{ data: subdivisionsRaw }, { data: countsRaw }] = await Promise.all([
    subQuery,
    adminSupabase
      .from("subdivision_property_counts")
      .select("subdivision_id, total_properties, deeded_properties"),
  ]);

  const countsBySubId = Object.fromEntries(
    (countsRaw ?? []).map((r) => [r.subdivision_id, r])
  );

  const rows: Row[] = (subdivisionsRaw ?? []).map((s) => {
    const counts = countsBySubId[s.id];
    return {
      id: s.id,
      name: s.name,
      entity_type: s.entity_type,
      recorded_year: s.recorded_year,
      earliest_year_built: s.earliest_year_built,
      confidence_level: s.confidence_level,
      total_properties: counts ? Number(counts.total_properties) : 0,
      deeded_properties: counts ? Number(counts.deeded_properties) : 0,
    };
  });

  const sorted = sortRows(rows, currentSort, currentDir);

  const shProps = { currentSort, currentDir, q };

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-text-secondary mb-2">
            Admin
          </p>
          <h1 className="text-2xl font-bold text-text-primary">Subdivisions</h1>
          <p className="text-sm text-text-secondary mt-1">
            {sorted.length} record{sorted.length !== 1 ? "s" : ""}
            {q ? ` matching "${q}"` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/admin/subdivisions/duplicates"
            className="text-sm text-accent-teal hover:opacity-80 transition-opacity"
          >
            Find duplicates
          </Link>
          <Link
            href="/admin/subdivisions/new"
            className="bg-accent-teal text-surface-base font-semibold px-4 py-2 rounded text-sm hover:opacity-90 transition-opacity"
          >
            + New Subdivision
          </Link>
        </div>
      </div>

      <form method="GET" className="mb-6">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name…"
          className="w-full max-w-sm bg-surface-raised border border-surface-border rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-teal/60 transition-colors"
        />
      </form>

      <div className="bg-surface-raised border border-surface-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border">
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider">
                <SortableHeader label="Name" sortKey="name" {...shProps} />
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider">
                <SortableHeader label="Type" sortKey="entity_type" {...shProps} />
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider">
                <SortableHeader label="Platted" sortKey="recorded_year" {...shProps} />
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider">
                <SortableHeader label="Properties" sortKey="total_properties" {...shProps} />
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider">
                <SortableHeader label="Deeded" sortKey="deeded_properties" {...shProps} />
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider">
                <SortableHeader label="First Built" sortKey="earliest_year_built" {...shProps} />
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider">
                <SortableHeader label="Confidence" sortKey="confidence_level" {...shProps} />
              </th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-text-muted">
                  {q ? "No subdivisions match your search." : "No subdivisions yet."}
                </td>
              </tr>
            )}
            {sorted.map((s) => (
              <tr key={s.id} className="hover:bg-surface-card transition-colors">
                <td className="px-4 py-3 font-medium max-w-xs truncate">
                  <Link
                    href={`/admin/research-queue?subdivision=${s.id}`}
                    className="text-text-primary hover:text-accent-teal transition-colors"
                  >
                    {s.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {s.entity_type ?? <span className="text-text-muted">-</span>}
                </td>
                <td className="px-4 py-3 text-text-secondary tabular-nums">
                  {s.recorded_year ?? <span className="text-text-muted">-</span>}
                </td>
                <td className="px-4 py-3 text-text-secondary tabular-nums">
                  {s.total_properties || <span className="text-text-muted">0</span>}
                </td>
                <td className="px-4 py-3 text-text-secondary tabular-nums">
                  {s.deeded_properties || <span className="text-text-muted">0</span>}
                </td>
                <td className="px-4 py-3 text-text-secondary tabular-nums">
                  {s.earliest_year_built ?? <span className="text-text-muted">-</span>}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded border text-xs font-medium ${
                      CONFIDENCE_COLORS[s.confidence_level] ?? CONFIDENCE_COLORS.unknown
                    }`}
                  >
                    {s.confidence_level}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/subdivisions/${s.id}`}
                    className="text-xs text-accent-teal hover:opacity-80 transition-opacity font-medium"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
