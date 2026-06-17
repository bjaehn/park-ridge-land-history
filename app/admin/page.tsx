import Link from "next/link";
import { adminSupabase } from "@/lib/supabase/adminClient";

async function getStats() {
  const [subRes, parcelRes, nbhdRes] = await Promise.all([
    adminSupabase.from("subdivisions").select("*", { count: "exact", head: true }),
    adminSupabase.from("parcels").select("*", { count: "exact", head: true }),
    adminSupabase.from("neighborhoods").select("*", { count: "exact", head: true }),
  ]);
  return {
    subdivisions: subRes.count ?? 0,
    parcels:      parcelRes.count ?? 0,
    neighborhoods: nbhdRes.count ?? 0,
  };
}

const sections = [
  {
    href: "/admin/subdivisions",
    label: "Subdivisions",
    key: "subdivisions" as const,
    description:
      "Manage recorded subdivision plats, timeline events, sources, aliases, lots, and parent/child hierarchy.",
  },
  {
    href: "/admin/properties",
    label: "Properties",
    key: "parcels" as const,
    description:
      "Edit property details, decomposed PIN components, subdivision links, property events, and parcel change history.",
  },
  {
    href: "/admin/neighborhoods",
    label: "Neighborhoods",
    key: "neighborhoods" as const,
    description:
      "Define neighborhoods, edit polygon boundaries, historical names, and links to subdivisions.",
  },
];

export default async function AdminDashboard() {
  const stats = await getStats().catch(() => ({
    subdivisions: 0,
    parcels: 0,
    neighborhoods: 0,
  }));

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-widest uppercase text-text-secondary mb-2">
          Admin
        </p>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="block bg-surface-raised border border-surface-border rounded-lg p-5 hover:border-accent-teal/40 transition-colors group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-text-primary group-hover:text-accent-teal transition-colors">
                {s.label}
              </span>
              <span className="text-2xl font-bold text-accent-teal tabular-nums">
                {stats[s.key].toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">{s.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
