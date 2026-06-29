"use client";

import { useState, useMemo } from "react";
import type { ReactNode } from "react";
import { PermitActivityChart } from "@/components/ui/PermitActivityChart";
import { EntityCard } from "@/components/ui/EntityCard";
import type { PermitActivityRow } from "@/lib/supabase/cityQueries";
import { PERMIT_CATEGORIES, type PermitListRow } from "@/lib/supabase/permitQueries";

const LOAD_INCREMENT = 50;
const HIGHLIGHT_LIMIT = 3;
const RESIDENTIAL_ACCENT = "#4a90d9";

const CATEGORY_ACCENT: Record<string, string> = {
  "teardown":         "#c96a70",
  "new-construction": "#4fb6a8",
  "addition":         "#8b7ff0",
  "roofing":          "#e6a64a",
  "garage":           "#4a90d9",
  "mechanical":       "#6db86d",
  "fencing":          "#b07dc9",
  "electrical":       "#f59e0b",
  "plumbing":         "#38bdf8",
  "exterior":         "#fb923c",
  "interior":         "#a78bfa",
  "other":            "#8a9bb0",
};

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  PERMIT_CATEGORIES.map((c) => [c.key, c.label])
);

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Unknown date";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatAmount(amount: number | null): string | null {
  if (amount == null || amount <= 0) return null;
  return "$" + amount.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function formatTotalValue(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${Math.round(amount / 1_000)}K`;
  return `$${amount.toLocaleString()}`;
}

function formatYear(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return String(d.getFullYear());
}

function getPermitYear(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d.getFullYear();
}

function formatPin(pin: string): string {
  return pin.replace(/(\d{2})(\d{2})(\d{3})(\d{3})(\d{4})/, "$1-$2-$3-$4-$5");
}

function topByAmount(permits: PermitListRow[], typeToken: string, limit: number): PermitListRow[] {
  return permits
    .filter((p) => (p.amount ?? 0) > 0 && p.permit_type?.toUpperCase().includes(typeToken))
    .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
    .slice(0, limit);
}

type FilterChipProps = {
  active: boolean;
  onClick: () => void;
  title?: string;
  children: ReactNode;
};

function FilterChip({ active, onClick, title, children }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
        active
          ? "bg-accent-purple/15 text-accent-purple"
          : "bg-surface-raised text-text-secondary hover:text-text-primary hover:bg-surface-card border border-surface-border"
      }`}
    >
      {children}
    </button>
  );
}

type HighlightCardProps = { permit: PermitListRow; accentColor: string };
function HighlightCard({ permit, accentColor }: HighlightCardProps) {
  return (
    <EntityCard
      href={`/properties/${encodeURIComponent(permit.pin)}`}
      title={permit.address ?? formatPin(permit.pin)}
      subtitle={permit.description ?? undefined}
      meta={[formatDate(permit.date_issued), formatAmount(permit.amount)].filter(Boolean).join("  ·  ")}
      eraSwatch={accentColor}
    />
  );
}

type AddressGroup = {
  pin: string;
  address: string | null;
  permits: PermitListRow[];
  cats: string[];
  minDate: string | null;
  maxDate: string | null;
  totalAmount: number;
};

type Props = {
  permits: PermitListRow[];
  mapSlot?: ReactNode;
};

export function PermitsContent({ permits, mapSlot }: Props) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState(LOAD_INCREMENT);

  function handleCategoryChange(cat: string) {
    setSelectedCategory(cat);
    setDisplayLimit(LOAD_INCREMENT);
  }
  function handleYearChange(year: number | null) {
    setSelectedYear(year);
    setDisplayLimit(LOAD_INCREMENT);
  }
  function handleNeighborhoodChange(n: string | null) {
    setSelectedNeighborhood(n);
    setDisplayLimit(LOAD_INCREMENT);
  }
  function clearAll() {
    setSelectedCategory("all");
    setSelectedYear(null);
    setSelectedNeighborhood(null);
    setDisplayLimit(LOAD_INCREMENT);
  }

  // ── Headline stats (all permits, never filtered) ──────────────────────────
  const stats = useMemo(() => {
    const residential = permits.filter(
      (p) => p.permit_type?.toUpperCase().includes("RESIDENTIAL")
    ).length;
    const years = permits
      .map((p) => getPermitYear(p.date_issued))
      .filter((y): y is number => y != null);
    const minYear = years.length ? Math.min(...years) : null;
    const maxYear = years.length ? Math.max(...years) : null;
    const totalValue = permits.reduce((sum, p) => sum + (p.amount ?? 0), 0);
    const teardownCount = permits.filter((p) => p.category === "teardown").length;
    const newConstructionCount = permits.filter((p) => p.category === "new-construction").length;
    return { total: permits.length, residential, minYear, maxYear, totalValue, teardownCount, newConstructionCount };
  }, [permits]);

  const statsLine = useMemo(() => {
    const base = `${stats.total.toLocaleString()} permits across Park Ridge${
      stats.minYear && stats.maxYear ? `, ${stats.minYear}–${stats.maxYear}` : ""
    }`;
    const highlights: string[] = [];
    if (stats.totalValue > 0) highlights.push(`${formatTotalValue(stats.totalValue)} in permitted work`);
    const signals: string[] = [];
    if (stats.teardownCount > 0) signals.push(`${stats.teardownCount} teardowns`);
    if (stats.newConstructionCount > 0) signals.push(`${stats.newConstructionCount} new homes`);
    if (signals.length > 0) highlights.push(signals.join(" and "));
    return highlights.length ? `${base} — ${highlights.join(" · ")}` : base;
  }, [stats]);

  // ── Unique filter values ──────────────────────────────────────────────────
  const years = useMemo(() => {
    const s = new Set<number>();
    for (const p of permits) {
      const y = getPermitYear(p.date_issued);
      if (y != null) s.add(y);
    }
    return Array.from(s).sort((a, b) => a - b);
  }, [permits]);

  const neighborhoods = useMemo(() => {
    const s = new Set<string>();
    for (const p of permits) {
      if (p.neighborhood_name) s.add(p.neighborhood_name);
    }
    return Array.from(s).sort();
  }, [permits]);

  // ── Filtered sets ─────────────────────────────────────────────────────────
  // For chart: neighborhood + category applied, year axis is open
  const forChart = useMemo(() => {
    let r = permits;
    if (selectedNeighborhood) r = r.filter((p) => p.neighborhood_name === selectedNeighborhood);
    if (selectedCategory !== "all") r = r.filter((p) => p.category === selectedCategory);
    return r;
  }, [permits, selectedNeighborhood, selectedCategory]);

  // For category counts: neighborhood + year applied, category axis is open
  const forCategoryCounts = useMemo(() => {
    let r = permits;
    if (selectedNeighborhood) r = r.filter((p) => p.neighborhood_name === selectedNeighborhood);
    if (selectedYear != null) r = r.filter((p) => getPermitYear(p.date_issued) === selectedYear);
    return r;
  }, [permits, selectedNeighborhood, selectedYear]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of forCategoryCounts) {
      counts[p.category] = (counts[p.category] ?? 0) + 1;
    }
    return counts;
  }, [forCategoryCounts]);

  // Full filter: chart set + year
  const filtered = useMemo(() => {
    if (selectedYear == null) return forChart;
    return forChart.filter((p) => getPermitYear(p.date_issued) === selectedYear);
  }, [forChart, selectedYear]);

  // ── Chart data ────────────────────────────────────────────────────────────
  const permitActivity = useMemo((): PermitActivityRow[] => {
    const byYear = new Map<number, { residential: number; commercial: number }>();
    for (const p of forChart) {
      const year = getPermitYear(p.date_issued);
      if (year == null) continue;
      const entry = byYear.get(year) ?? { residential: 0, commercial: 0 };
      if (p.permit_type?.toUpperCase().includes("RESIDENTIAL")) {
        entry.residential++;
      } else {
        entry.commercial++;
      }
      byYear.set(year, entry);
    }
    return Array.from(byYear.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, counts]) => ({
        permitYear: year,
        residentialCount: counts.residential,
        commercialCount: counts.commercial,
      }));
  }, [forChart]);

  // ── Address groups ────────────────────────────────────────────────────────
  const addressGroups = useMemo((): AddressGroup[] => {
    const groups = new Map<string, PermitListRow[]>();
    for (const p of filtered) {
      groups.set(p.pin, [...(groups.get(p.pin) ?? []), p]);
    }
    return Array.from(groups.entries()).map(([pin, ps]) => {
      const sorted = [...ps].sort((a, b) =>
        (b.date_issued ?? "").localeCompare(a.date_issued ?? "")
      );
      const cats = [...new Set(ps.map((p) => p.category))];
      const dates = ps.map((p) => p.date_issued).filter(Boolean) as string[];
      const minDate = dates.length ? dates.reduce((m, d) => (d < m ? d : m)) : null;
      const maxDate = dates.length ? dates.reduce((m, d) => (d > m ? d : m)) : null;
      const totalAmount = ps.reduce((s, p) => s + (p.amount ?? 0), 0);
      return { pin, address: sorted[0].address, permits: sorted, cats, minDate, maxDate, totalAmount };
    });
  }, [filtered]);

  const displayedGroups = addressGroups.slice(0, displayLimit);
  const hasMore = addressGroups.length > displayLimit;
  const remaining = addressGroups.length - displayLimit;

  // ── Most expensive (all-time, never filtered) ─────────────────────────────
  const topResidential = useMemo(
    () => topByAmount(permits, "RESIDENTIAL", HIGHLIGHT_LIMIT),
    [permits]
  );

  // ── Context line ──────────────────────────────────────────────────────────
  const isFiltered = selectedCategory !== "all" || selectedYear != null || selectedNeighborhood != null;
  const contextParts = [
    selectedNeighborhood,
    selectedCategory !== "all" ? CATEGORY_LABEL[selectedCategory] : null,
    selectedYear != null ? String(selectedYear) : null,
  ].filter(Boolean);

  const count = addressGroups.length;
  const contextLine = contextParts.length
    ? `${count.toLocaleString()} propert${count !== 1 ? "ies" : "y"} · ${contextParts.join(" · ")}`
    : `${count.toLocaleString()} propert${count !== 1 ? "ies" : "y"} with permits`;

  return (
    <div className="space-y-8">
      {/* Compact header */}
      <div>
        <p className="text-xs font-semibold text-text-muted tracking-widest uppercase mb-1">
          Building activity
        </p>
        <h1 className="text-2xl font-bold text-text-primary">Permits</h1>
        <p className="text-text-secondary text-sm mt-1">{statsLine}</p>
      </div>

      {/* Filter panel */}
      <div className="space-y-3">
        {neighborhoods.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-text-muted tracking-widest uppercase mb-1.5">
              Neighborhood
            </p>
            <div className="flex flex-wrap gap-1.5">
              <FilterChip active={selectedNeighborhood == null} onClick={() => handleNeighborhoodChange(null)}>
                All
              </FilterChip>
              {neighborhoods.map((n) => (
                <FilterChip key={n} active={selectedNeighborhood === n} onClick={() => handleNeighborhoodChange(n)}>
                  {n}
                </FilterChip>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-[10px] font-semibold text-text-muted tracking-widest uppercase mb-1.5">
            Year
          </p>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip active={selectedYear == null} onClick={() => handleYearChange(null)}>
              All years
            </FilterChip>
            {years.map((y) => (
              <FilterChip
                key={y}
                active={selectedYear === y}
                onClick={() => handleYearChange(selectedYear === y ? null : y)}
              >
                {y}
              </FilterChip>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-semibold text-text-muted tracking-widest uppercase mb-1.5">
            Category
          </p>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip active={selectedCategory === "all"} onClick={() => handleCategoryChange("all")}>
              All
              <span className="ml-1.5 text-xs opacity-60">{forCategoryCounts.length.toLocaleString()}</span>
            </FilterChip>
            {PERMIT_CATEGORIES.map((cat) => {
              const count = categoryCounts[cat.key] ?? 0;
              if (count === 0) return null;
              return (
                <FilterChip
                  key={cat.key}
                  active={selectedCategory === cat.key}
                  onClick={() => handleCategoryChange(cat.key)}
                  title={cat.description}
                >
                  {cat.label}
                  <span className="ml-1.5 text-xs opacity-60">{count.toLocaleString()}</span>
                </FilterChip>
              );
            })}
          </div>
        </div>
      </div>

      {/* Activity chart — responds to category + neighborhood filters; click sets year */}
      {permitActivity.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-text-muted tracking-widest uppercase mb-2">
            Permit activity by year
            {isFiltered && selectedYear == null && (
              <span className="ml-1 normal-case font-normal opacity-70">— click a bar to filter</span>
            )}
          </p>
          <PermitActivityChart
            data={permitActivity}
            hideCommercial
            height={170}
            selectedYear={selectedYear}
            onYearClick={(year) => handleYearChange(selectedYear === year ? null : year)}
          />
          <div className="flex gap-4 mt-1 justify-end">
            <span className="flex items-center gap-1.5 text-xs text-text-muted">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#a78bfa" }} />
              Residential
            </span>
          </div>
        </div>
      )}

      {/* Results context line */}
      <div className="flex items-center gap-3">
        <p className="text-xs text-text-muted flex-1">{contextLine}</p>
        {isFiltered && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-text-muted hover:text-text-primary underline shrink-0"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Property cards */}
      {displayedGroups.length === 0 ? (
        <div className="text-center py-12 text-text-muted text-sm">
          No permits match these filters.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayedGroups.map((group) => {
              const isSingle = group.permits.length === 1;
              const singlePermit = isSingle ? group.permits[0] : null;

              const eyebrow = isSingle
                ? CATEGORY_LABEL[group.cats[0]] ?? group.cats[0]
                : `${group.permits.length} permits`;

              const subtitle = isSingle
                ? (singlePermit?.description ?? undefined)
                : group.cats.map((c) => CATEGORY_LABEL[c] ?? c).join(" · ");

              const minYear = formatYear(group.minDate);
              const maxYear = formatYear(group.maxDate);
              const dateRange =
                minYear && maxYear && minYear !== maxYear
                  ? `${minYear}–${maxYear}`
                  : isSingle
                    ? formatDate(singlePermit?.date_issued ?? null)
                    : (minYear ?? "");

              const amountStr = formatAmount(group.totalAmount);
              const meta = [dateRange, amountStr].filter(Boolean).join("  ·  ");

              return (
                <EntityCard
                  key={group.pin}
                  href={`/properties/${encodeURIComponent(group.pin)}`}
                  eyebrow={eyebrow}
                  title={group.address ?? formatPin(group.pin)}
                  subtitle={subtitle}
                  meta={meta || undefined}
                  eraSwatch={CATEGORY_ACCENT[group.cats[0]] ?? "#8a9bb0"}
                />
              );
            })}
          </div>

          {hasMore && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setDisplayLimit((prev) => prev + LOAD_INCREMENT)}
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary border border-surface-border rounded-lg transition-colors"
              >
                Load {Math.min(LOAD_INCREMENT, remaining).toLocaleString()} more
              </button>
            </div>
          )}
        </div>
      )}

      {/* Map — below the fold */}
      {mapSlot && (
        <div>
          <p className="text-xs font-semibold text-text-muted tracking-widest uppercase mb-2">
            Where these permits are located
          </p>
          {mapSlot}
        </div>
      )}

      {/* Most expensive residential — bottom */}
      {topResidential.length > 0 && (
        <div>
          <p className="section-heading" style={{ color: RESIDENTIAL_ACCENT }}>
            Most expensive residential permits
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {topResidential.map((p) => (
              <HighlightCard key={p.id} permit={p} accentColor={RESIDENTIAL_ACCENT} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
