import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { PageHeader } from "@/components/ui/PageHeader";
import { searchParcels } from "@/lib/supabase/homeQueries";
import { formatAddress } from "@/lib/formatters";
import { YearBuiltIcon } from "@/lib/icons";

type Props = { searchParams: { q?: string } };

export function generateMetadata({ searchParams }: Props): Metadata {
  const q = searchParams.q?.trim() ?? "";
  return {
    title: q ? `Search: ${q}` : "Search",
    description: "Search Park Ridge properties by address or Cook County PIN.",
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const q = searchParams.q?.trim() ?? "";
  const results = q.length >= 2 ? await searchParcels(q, 50).catch(() => []) : [];

  return (
    <div className="page-shell">
      <Breadcrumb items={[{ label: "Park Ridge", href: "/city" }, { label: "Search", current: true }]} />
      <PageHeader
        title={q ? `Results for "${q}"` : "Search properties"}
        subtitle={
          q.length >= 2
            ? results.length > 0
              ? `${results.length} propert${results.length === 1 ? "y" : "ies"} found`
              : "No properties matched"
            : "Enter an address to search"
        }
      />

      {q.length >= 2 && results.length === 0 && (
        <div className="mt-6 bg-surface-card border border-surface-border rounded-lg p-6 text-center">
          <p className="text-text-secondary">
            No properties matched <strong>{q}</strong>.
          </p>
          <p className="text-sm text-text-muted mt-2">
            Try a street name, partial address, or Cook County PIN.
          </p>
          <Link href="/city" className="inline-block mt-4 text-sm text-accent-purple hover:underline">
            Browse by neighborhood
          </Link>
        </div>
      )}

      {results.length > 0 && (
        <ul className="mt-6 divide-y divide-surface-border border border-surface-border rounded-lg overflow-hidden">
          {results.map((r) => (
            <li key={r.pin}>
              <Link
                href={`/properties/${encodeURIComponent(r.pin)}`}
                className="flex items-center justify-between gap-4 px-4 py-3 bg-surface-card hover:bg-surface-raised transition-colors group"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary group-hover:text-accent-purple transition-colors truncate">
                    {formatAddress(r.address)}
                  </p>
                  <p className="text-xs text-text-muted font-mono mt-0.5">{r.pin}</p>
                </div>
                {r.yearBuilt && (
                  <div className="flex items-center gap-1 shrink-0 text-text-muted">
                    <YearBuiltIcon size={11} strokeWidth={1.8} aria-hidden="true" />
                    <span className="text-xs tabular-nums">{r.yearBuilt}</span>
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {q.length > 0 && q.length < 2 && (
        <p className="mt-6 text-sm text-text-muted">Enter at least 2 characters to search.</p>
      )}
    </div>
  );
}
