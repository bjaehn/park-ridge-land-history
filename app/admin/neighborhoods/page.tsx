import Link from "next/link";
import { adminSupabase } from "@/lib/supabase/adminClient";

const TYPE_LABELS: Record<string, string> = {
  official_planning: "Planning",
  business_district: "Business",
  local_market:      "Local",
};

const TYPE_COLORS: Record<string, string> = {
  official_planning: "bg-accent-teal/10 text-accent-teal",
  business_district: "bg-accent-orange/10 text-accent-orange",
  local_market:      "bg-accent-purple/10 text-accent-purple",
};

const FILTER_TABS = [
  { type: "",                  label: "All" },
  { type: "official_planning", label: "Official Planning" },
  { type: "business_district", label: "Business District" },
  { type: "local_market",      label: "Local Market" },
] as const;

export default async function NeighborhoodsListPage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  const typeFilter = searchParams.type ?? "";

  let query = adminSupabase
    .from("neighborhoods")
    .select("id, label, description, established_year, slug, neighborhood_type")
    .order("neighborhood_type")
    .order("label");

  if (typeFilter) {
    query = query.eq("neighborhood_type", typeFilter);
  }

  const { data: neighborhoodsRaw } = await query;
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
            {typeFilter && ` · ${FILTER_TABS.find((t) => t.type === typeFilter)?.label}`}
          </p>
        </div>
        <Link
          href="/admin/neighborhoods/new"
          className="shrink-0 bg-accent-teal text-surface-base font-semibold px-4 py-2 rounded text-sm hover:opacity-90 transition-opacity"
        >
          + New Neighborhood
        </Link>
      </div>

      {/* Type filter tabs */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {FILTER_TABS.map(({ type, label }) => (
          <Link
            key={type}
            href={type ? `/admin/neighborhoods?type=${type}` : "/admin/neighborhoods"}
            className={[
              "px-3 py-1.5 rounded text-xs font-medium transition-colors",
              typeFilter === type
                ? "bg-accent-teal text-surface-base"
                : "bg-surface-raised border border-surface-border text-text-secondary hover:text-text-primary",
            ].join(" ")}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="bg-surface-raised border border-surface-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border">
              {["ID", "Type", "Label", "Slug", "Est. Year", ""].map((h) => (
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
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-text-muted">
                  No neighborhoods yet.
                </td>
              </tr>
            )}
            {neighborhoods.map((n) => {
              const typeLabel = TYPE_LABELS[n.neighborhood_type ?? ""] ?? n.neighborhood_type ?? "-";
              const typeColor = TYPE_COLORS[n.neighborhood_type ?? ""] ?? "bg-surface-card text-text-muted";
              return (
                <tr key={n.id} className="hover:bg-surface-card transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-text-muted">{n.id}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${typeColor}`}>
                      {typeLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-text-primary">{n.label}</td>
                  <td className="px-4 py-3 text-text-secondary">
                    {n.slug ?? <span className="text-text-muted">-</span>}
                  </td>
                  <td className="px-4 py-3 text-text-secondary tabular-nums">
                    {n.established_year ?? <span className="text-text-muted">-</span>}
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
