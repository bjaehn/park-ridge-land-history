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

async function getNeedsAttention() {
  const [nbhdSlugRes, subYearRes, parcelConfidenceRes] = await Promise.all([
    adminSupabase
      .from("neighborhoods")
      .select("*", { count: "exact", head: true })
      .or("slug.is.null,slug.eq."),
    adminSupabase
      .from("subdivisions")
      .select("*", { count: "exact", head: true })
      .is("recorded_year", null),
    adminSupabase
      .from("parcels")
      .select("*", { count: "exact", head: true })
      .is("year_built", null),
  ]);
  return {
    neighborhoodsWithoutSlug: nbhdSlugRes.count ?? 0,
    subdivisionsWithoutYear:  subYearRes.count ?? 0,
    parcelsLowConfidence:     parcelConfidenceRes.count ?? 0,
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

const tools = [
  {
    href: "/admin/plat-mapping",
    label: "Recorder Plat Index",
    description:
      "View Cook County Recorder plat index entries for T40N R12E. Link Recorder short names to subdivision records, or add notes for entries without a match.",
  },
  {
    href: "/admin/data-quality",
    label: "Data Quality Report",
    description:
      "Missing addresses, duplicate PINs, unmatched permits, orphaned sales, and other data integrity checks across the dataset.",
  },
  {
    href: "/admin/subdivisions/duplicates",
    label: "Duplicate Subdivisions",
    description:
      "Name and alias similarity matches between subdivision records, with a manual merge workflow.",
  },
  {
    href: "/admin/audit-log",
    label: "Audit Log",
    description:
      "Recent tracked admin changes: subdivision merges, neighborhood boundary edits, and deed research notes.",
  },
];

export default async function AdminDashboard() {
  const [stats, attention] = await Promise.all([
    getStats().catch(() => ({ subdivisions: 0, parcels: 0, neighborhoods: 0 })),
    getNeedsAttention().catch(() => ({
      neighborhoodsWithoutSlug: 0,
      subdivisionsWithoutYear: 0,
      parcelsLowConfidence: 0,
    })),
  ]);

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

      <div className="mt-10">
        <h2 className="text-sm font-semibold text-text-primary mb-4">Tools</h2>
        <div className="space-y-3 mb-10">
          {tools.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="flex items-start justify-between gap-4 bg-surface-raised border border-surface-border rounded-lg px-5 py-4 hover:border-accent-teal/40 transition-colors group"
            >
              <div>
                <p className="text-sm font-semibold text-text-primary group-hover:text-accent-teal transition-colors">{t.label}</p>
                <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{t.description}</p>
              </div>
              <span className="text-xs text-accent-teal shrink-0 mt-0.5">Open →</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-0">
        <h2 className="text-sm font-semibold text-text-primary mb-4">Needs attention</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-surface-raised border border-surface-border rounded-lg px-5 py-4">
            <div>
              <p className="text-sm text-text-primary">
                Neighborhoods without a slug
              </p>
              <p className="text-xs text-text-muted mt-0.5">Slug is required for public neighborhood pages to load.</p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <span className={`text-lg font-bold tabular-nums ${attention.neighborhoodsWithoutSlug > 0 ? "text-amber-400" : "text-text-muted"}`}>
                {attention.neighborhoodsWithoutSlug.toLocaleString()}
              </span>
              <Link href="/admin/neighborhoods" className="text-xs text-accent-teal hover:underline">
                Review
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-between bg-surface-raised border border-surface-border rounded-lg px-5 py-4">
            <div>
              <p className="text-sm text-text-primary">
                Subdivisions without a recorded year
              </p>
              <p className="text-xs text-text-muted mt-0.5">Recorded year appears on subdivision pages and affects the timeline.</p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <span className={`text-lg font-bold tabular-nums ${attention.subdivisionsWithoutYear > 0 ? "text-amber-400" : "text-text-muted"}`}>
                {attention.subdivisionsWithoutYear.toLocaleString()}
              </span>
              <Link href="/admin/subdivisions" className="text-xs text-accent-teal hover:underline">
                Review
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-between bg-surface-raised border border-surface-border rounded-lg px-5 py-4">
            <div>
              <p className="text-sm text-text-primary">
                Properties with no build year (low confidence)
              </p>
              <p className="text-xs text-text-muted mt-0.5">Missing build year is the primary driver of Low confidence ratings.</p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <span className={`text-lg font-bold tabular-nums ${attention.parcelsLowConfidence > 0 ? "text-amber-400" : "text-text-muted"}`}>
                {attention.parcelsLowConfidence.toLocaleString()}
              </span>
              <Link href="/admin/properties" className="text-xs text-accent-teal hover:underline">
                Review
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
