import Link from "next/link";
import { adminSupabase } from "@/lib/supabase/adminClient";

export default async function NeighborhoodsListPage() {
  const { data: neighborhoodsRaw } = await adminSupabase
    .from("neighborhoods")
    .select("id, label, description, established_year, slug")
    .order("label");
  const neighborhoods = neighborhoodsRaw ?? [];

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-text-secondary mb-2">
            Admin
          </p>
          <h1 className="text-2xl font-bold text-text-primary">Neighborhoods</h1>
          <p className="text-sm text-text-secondary mt-1">
            {neighborhoods.length} neighborhood{neighborhoods.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/admin/neighborhoods/new"
          className="shrink-0 bg-accent-teal text-surface-base font-semibold px-4 py-2 rounded text-sm hover:opacity-90 transition-opacity"
        >
          + New Neighborhood
        </Link>
      </div>

      <div className="bg-surface-raised border border-surface-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border">
              {["ID", "Label", "Slug", "Est. Year", ""].map((h) => (
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
            {neighborhoods.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-text-muted">
                  No neighborhoods yet.
                </td>
              </tr>
            )}
            {neighborhoods.map((n) => (
              <tr key={n.id} className="hover:bg-surface-card transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-text-muted">{n.id}</td>
                <td className="px-4 py-3 font-medium text-text-primary">{n.label}</td>
                <td className="px-4 py-3 text-text-secondary">
                  {n.slug ?? <span className="text-text-muted">—</span>}
                </td>
                <td className="px-4 py-3 text-text-secondary tabular-nums">
                  {n.established_year ?? <span className="text-text-muted">—</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/neighborhoods/${encodeURIComponent(n.id)}`}
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
