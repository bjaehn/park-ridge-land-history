import Link from "next/link";
import { adminSupabase } from "@/lib/supabase/adminClient";

export default async function PropertiesListPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams.q?.trim() || "";

  let parcels: Array<{
    pin_normalized: string;
    address: string | null;
    year_built: number | null;
    subdivision_name: string | null;
    neighborhood_id: string | null;
  }> = [];

  if (q) {
    let qry = adminSupabase
      .from("parcels")
      .select("pin_normalized, address, year_built, subdivision_name, neighborhood_id")
      .limit(50);

    if (q.replace(/\D/g, "").length >= 4) {
      qry = qry.ilike("pin_normalized", `%${q.replace(/\D/g, "")}%`);
    } else {
      qry = qry.ilike("address", `%${q}%`);
    }

    const { data } = await qry;
    parcels = data ?? [];
  }

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-widest uppercase text-text-secondary mb-2">
          Admin
        </p>
        <h1 className="text-2xl font-bold text-text-primary">Properties</h1>
        <p className="text-sm text-text-secondary mt-1">
          Search by PIN or address to edit a property.
        </p>
      </div>

      <form method="GET" className="mb-6 flex gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="PIN (e.g. 09181100010000) or address…"
          className="flex-1 max-w-md bg-surface-raised border border-surface-border rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-teal/60 transition-colors"
        />
        <button
          type="submit"
          className="bg-accent-teal text-surface-base font-semibold px-4 py-2 rounded text-sm hover:opacity-90 transition-opacity"
        >
          Search
        </button>
      </form>

      {q && parcels.length === 0 && (
        <p className="text-sm text-text-muted">No properties found for &ldquo;{q}&rdquo;.</p>
      )}

      {parcels.length > 0 && (
        <div className="bg-surface-raised border border-surface-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border">
                {["PIN", "Address", "Year", "Subdivision", ""].map((h) => (
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
              {parcels.map((p) => (
                <tr key={p.pin_normalized} className="hover:bg-surface-card transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                    {p.pin_normalized}
                  </td>
                  <td className="px-4 py-3 text-text-primary max-w-xs truncate">
                    {p.address ?? <span className="text-text-muted">—</span>}
                  </td>
                  <td className="px-4 py-3 text-text-secondary tabular-nums">
                    {p.year_built ?? <span className="text-text-muted">—</span>}
                  </td>
                  <td className="px-4 py-3 text-text-secondary max-w-xs truncate">
                    {p.subdivision_name ?? <span className="text-text-muted">none</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/properties/${encodeURIComponent(p.pin_normalized)}`}
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
      )}

      {!q && (
        <p className="text-sm text-text-muted">
          Enter a PIN or address above to find a property to edit.
        </p>
      )}
    </div>
  );
}
