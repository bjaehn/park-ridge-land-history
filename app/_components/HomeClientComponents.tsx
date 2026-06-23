"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { StatGrid } from "@/components/ui/StatGrid";
import { PropertyIcon, YearBuiltIcon, SaleIcon, PermitIcon } from "@/lib/icons";
import { formatNumber } from "@/lib/formatters";
import type { HomeStats as HomeStatsType, SearchResult } from "@/lib/supabase/homeQueries";

const EXAMPLE_CHIPS = [
  { label: "Prospect Ave", query: "Prospect" },
  { label: "Touhy Ave", query: "Touhy" },
  { label: "Uptown", query: "Uptown" },
];

export function HomeSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [focused, setFocused] = useState(false);
  const [searched, setSearched] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useCallback((q: string) => {
    setQuery(q);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (q.trim().length < 2) { setResults([]); setSearched(false); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const { searchParcels } = await import("@/lib/supabase/homeQueries");
        const found = await searchParcels(q, 8);
        setResults(found);
        setSearched(true);
      } catch { setResults([]); setSearched(true); }
    }, 180);
  }, []);

  const select = (pin: string) => {
    setQuery("");
    setResults([]);
    setSearched(false);
    router.push(`/properties/${encodeURIComponent(pin)}`);
  };

  const showDropdown = focused && results.length > 0 && query.trim().length >= 2;
  const showEmptyState = focused && searched && results.length === 0 && query.trim().length >= 3;

  return (
    <div className="space-y-3">
      <div className="relative">
        <label htmlFor="hero-search" className="sr-only">Search an address or PIN</label>
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            id="hero-search"
            type="search"
            autoComplete="off"
            value={query}
            onChange={(e) => search(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[0]) select(results[0].pin);
              if (e.key === "Enter" && results.length === 0 && query.trim().length >= 3) {
                router.push(`/search?q=${encodeURIComponent(query.trim())}`);
              }
              if (e.key === "Escape") { setResults([]); setSearched(false); }
            }}
            placeholder="Type an address or Cook County PIN..."
            className="w-full pl-10 pr-4 py-3 text-base bg-surface-card border border-surface-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/60 transition-colors"
          />
        </div>
        {showDropdown && (
          <ul
            className="absolute top-full left-0 right-0 mt-1 bg-surface-card border border-surface-border rounded-lg shadow-xl overflow-hidden z-50"
            role="listbox"
          >
            {results.map((r) => (
              <li key={r.pin} role="option" aria-selected="false">
                <button
                  type="button"
                  className="w-full text-left px-4 py-3 hover:bg-surface-raised transition-colors"
                  onMouseDown={(e) => { e.preventDefault(); select(r.pin); }}
                >
                  <span className="text-text-primary block">{r.address}</span>
                  {r.yearBuilt && <span className="text-xs text-text-muted">Built {r.yearBuilt}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
        {showEmptyState && (
          <p className="absolute top-full left-0 right-0 mt-1 px-4 py-3 bg-surface-card border border-surface-border rounded-lg text-sm text-text-muted z-50">
            No properties found for &ldquo;{query}&rdquo;. Try an address, street name, or 14-digit PIN.
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {EXAMPLE_CHIPS.map((chip) => (
          <button
            key={chip.query}
            type="button"
            onClick={() => { search(chip.query); inputRef.current?.focus(); }}
            className="text-xs px-3 py-1 bg-surface-card border border-surface-border rounded-full text-text-secondary hover:text-text-primary hover:border-accent-purple/40 transition-colors"
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function HomeStats() {
  const [stats, setStats] = useState<HomeStatsType | null>(null);

  useEffect(() => {
    import("@/lib/supabase/homeQueries")
      .then((m) => m.fetchHomeStats())
      .then((s) => setStats(s))
      .catch(() => null);
  }, []);

  if (!stats) return null;

  const statItems = [
    { icon: PropertyIcon, value: formatNumber(stats.totalProperties), label: "Properties indexed" },
    stats.pre1945Count > 0
      ? { icon: YearBuiltIcon, value: formatNumber(stats.pre1945Count), label: "Built before 1945", note: `${stats.pre1945Pct}% of all properties` }
      : null,
    stats.withSales > 0
      ? { icon: SaleIcon, value: formatNumber(stats.withSales), label: "With sale records", note: `${stats.salesPct}% of all properties` }
      : null,
    stats.withPermits > 0
      ? { icon: PermitIcon, value: formatNumber(stats.withPermits), label: "With permit records", note: `${stats.permitsPct}% of all properties` }
      : null,
  ].filter((s): s is { icon: typeof PropertyIcon; value: string; label: string; note?: string } => s !== null);

  return <StatGrid columns={4} stats={statItems} />;
}
