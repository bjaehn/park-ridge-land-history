import Link from "next/link";
import { adminSupabase } from "@/lib/supabase/adminClient";

const CONFIDENCE_COLORS: Record<string, string> = {
  high:    "text-confidence-high   bg-confidence-high/10   border-confidence-high/30",
  medium:  "text-confidence-medium bg-confidence-medium/10 border-confidence-medium/30",
  low:     "text-confidence-low    bg-confidence-low/10    border-confidence-low/30",
  unknown: "text-text-muted        bg-surface-card         border-surface-border",
};

export default async function SubdivisionsListPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams.q?.trim() || "";

  let query = adminSupabase
    .from("subdivisions")
    .select("id, name, entity_type, recorded_year, earliest_year_built, confidence_level, status")
    .order("recorded_year", { ascending: true, nullsFirst: false })
    .order("name");

  if (q) query = query.ilike("name", `%${q}%`);

  const [{ data: subdivisionsRaw }, { data: countsRaw }] = await Promise.all([
    query,
    adminSupabase
      .from("subdivision_property_counts")
      .select("subdivision_id, total_properties, deeded_properties"),
  ]);

  const subdivisions = subdivisionsRaw ?? [];
  const countsBySubId = Object.fromEntries(
    (countsRaw ?? []).map((r) => [r.subdivision_id, r])
  );

  const HEADERS = ["Name", "Type", "Platted", "Properties", "Deeded", "First Built", "Confidence", "Status", ""];

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-text-secondary mb-2">
            Admin
          </p>
          <h1 className="text-2xl font-bold text-text-primary">Subdivisions</h1>
          <p className="text-sm text-text-secondary mt-1">
            {subdivisions.length} record{subdivisions.length !== 1 ? "s" : ""}
            {q ? ` matching "${q}"` : ""}
          </p>
        </div>
        <Link
          href="/admin/subdivisions/new"
          className="shrink-0 bg-accent-teal text-surface-base font-semibold px-4 py-2 rounded text-sm hover:opacity-90 transition-opacity"
        >
          + New Subdivision
        </Link>
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
              {HEADERS.map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {subdivisions.length === 0 && (
              <tr>
                <td colSpan={HEADERS.length} className="px-4 py-8 text-center text-sm text-text-muted">
                  {q ? "No subdivisions match your search." : "No subdivisions yet."}
                </td>
              </tr>
            )}
            {subdivisions.map((s) => {
              const counts = countsBySubId[s.id];
              return (
                <tr key={s.id} className="hover:bg-surface-card transition-colors">
                  <td className="px-4 py-3 font-medium text-text-primary max-w-xs truncate">
                    {s.name}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {s.entity_type ?? <span className="text-text-muted">-</span>}
                  </td>
                  <td className="px-4 py-3 text-text-secondary tabular-nums">
                    {s.recorded_year ?? <span className="text-text-muted">-</span>}
                  </td>
                  <td className="px-4 py-3 text-text-secondary tabular-nums">
                    {counts ? counts.total_properties : <span className="text-text-muted">0</span>}
                  </td>
                  <td className="px-4 py-3 text-text-secondary tabular-nums">
                    {counts ? counts.deeded_properties : <span className="text-text-muted">0</span>}
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
                  <td className="px-4 py-3 text-text-secondary">
                    {s.status ?? <span className="text-text-muted">-</span>}
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
