"use client";

import { useState, useMemo } from "react";
import type { ReactNode } from "react";
import { PermitActivityChart } from "@/components/ui/PermitActivityChart";
import { EntityCard } from "@/components/ui/EntityCard";
import type { PermitActivityRow } from "@/lib/supabase/cityQueries";
import { PERMIT_CATEGORIES, type PermitListRow } from "@/lib/supabase/permitQueries";

const LIST_LIMIT = 100;
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

function formatPin(pin: string): string {
  return pin.replace(/(\d{2})(\d{2})(\d{3})(\d{3})(\d{4})/, "$1-$2-$3-$4-$5");
}

function topByAmount(permits: PermitListRow[], typeToken: string, limit: number): PermitListRow[] {
  return permits
    .filter((p) => (p.amount ?? 0) > 0 && p.permit_type?.toUpperCase().includes(typeToken))
    .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
    .slice(0, limit);
}

type HighlightCardProps = {
  permit: PermitListRow;
  accentColor: string;
};

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

  const stats = useMemo(() => {
    const residential = permits.filter(
      (p) => p.permit_type?.toUpperCase().includes("RESIDENTIAL")
    ).length;
    const years = permits
      .map((p) => p.date_issued ? new Date(p.date_issued).getFullYear() : null)
      .filter((y): y is number => y != null);
    const minYear = years.length ? Math.min(...years) : null;
    const maxYear = years.length ? Math.max(...years) : null;
    const totalValue = permits.reduce((sum, p) => sum + (p.amount ?? 0), 0);
    const teardownCount = permits.filter((p) => p.category === "teardown").length;
    const newConstructionCount = permits.filter((p) => p.category === "new-construction").length;
    return { total: permits.length, residential, minYear, maxYear, totalValue, teardownCount, newConstructionCount };
  }, [permits]);

  const permitActivity = useMemo((): PermitActivityRow[] => {
    const byYear = new Map<number, { residential: number; commercial: number }>();
    for (const p of permits) {
      if (!p.date_issued) continue;
      const year = new Date(p.date_issued).getFullYear();
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
  }, [permits]);

  const topResidential = useMemo(
    () => topByAmount(permits, "RESIDENTIAL", HIGHLIGHT_LIMIT),
    [permits]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of permits) {
      counts[p.category] = (counts[p.category] ?? 0) + 1;
    }
    return counts;
  }, [permits]);

  const filtered = useMemo(() => {
    if (selectedCategory === "all") return permits;
    return permits.filter((p) => p.category === selectedCategory);
  }, [permits, selectedCategory]);

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

  const displayedGroups = addressGroups.slice(0, LIST_LIMIT);
  const groupOverflow = addressGroups.length - displayedGroups.length;

  const insightParts = [
    stats.teardownCount > 0
      ? `${stats.teardownCount} teardown${stats.teardownCount !== 1 ? "s" : ""}`
      : null,
    stats.newConstructionCount > 0
      ? `${stats.newConstructionCount} new home${stats.newConstructionCount !== 1 ? "s" : ""}`
      : null,
  ].filter(Boolean);

  return (
    <div className="space-y-10">
      {/* Page header */}
      <div>
        <p className="text-xs font-semibold text-text-muted tracking-widest uppercase mb-1">
          Building activity
        </p>
        <h1 className="text-2xl font-bold text-text-primary">Permits</h1>
        <p className="text-text-secondary text-sm mt-1">
          Track how Park Ridge is being built, renovated, and rebuilt through county-filed building permits.
        </p>
      </div>

      {/* Stat grid + insight */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-surface-card border border-surface-border rounded-lg p-3">
            <div className="text-xl font-bold text-text-primary">
              {stats.total.toLocaleString()}
            </div>
            <div className="text-xs text-text-muted mt-0.5">Total permits</div>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-3">
            <div className="text-xl font-bold text-text-primary">
              {stats.residential.toLocaleString()}
            </div>
            <div className="text-xs text-text-muted mt-0.5">Residential</div>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-3">
            <div className="text-xl font-bold text-text-primary">
              {stats.minYear && stats.maxYear
                ? `${stats.minYear}–${stats.maxYear}`
                : "—"}
            </div>
            <div className="text-xs text-text-muted mt-0.5">Year range</div>
          </div>
          {stats.totalValue > 0 && (
            <div className="bg-surface-card border border-surface-border rounded-lg p-3">
              <div className="text-xl font-bold text-text-primary">
                {formatTotalValue(stats.totalValue)}
              </div>
              <div className="text-xs text-text-muted mt-0.5">Permitted value</div>
            </div>
          )}
        </div>

        {insightParts.length > 0 && (
          <p className="text-sm text-text-secondary">
            Includes {insightParts.join(" and ")} — Park Ridge is actively replacing and reinvesting in its housing stock.
          </p>
        )}
      </div>

      {/* Map */}
      {mapSlot && (
        <div>
          <p className="text-xs font-semibold text-text-muted tracking-widest uppercase mb-2">
            Where permits are concentrated
          </p>
          {mapSlot}
        </div>
      )}

      {/* Permit activity by year */}
      {permitActivity.length > 0 && (
        <div>
          <p className="section-heading">Permit activity by year</p>
          <PermitActivityChart data={permitActivity} hideCommercial />
          <div className="flex gap-4 mt-2 justify-end">
            <span className="flex items-center gap-1.5 text-xs text-text-muted">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#a78bfa" }} />
              Residential
            </span>
          </div>
        </div>
      )}

      {/* Most expensive residential permits */}
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

      <hr className="border-surface-border" />

      {/* Category filter chips */}
      <div>
        <div className="text-xs font-semibold text-text-muted tracking-widest uppercase mb-2">
          Browse by work category
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === "all"
                ? "bg-accent-purple/15 text-accent-purple"
                : "bg-surface-raised text-text-secondary hover:text-text-primary hover:bg-surface-card border border-surface-border"
            }`}
          >
            All
            <span className="ml-1.5 text-xs opacity-70">{stats.total}</span>
          </button>
          {PERMIT_CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.key] ?? 0;
            if (count === 0) return null;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                title={cat.description}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === cat.key
                    ? "bg-accent-purple/15 text-accent-purple"
                    : "bg-surface-raised text-text-secondary hover:text-text-primary hover:bg-surface-card border border-surface-border"
                }`}
              >
                {cat.label}
                <span className="ml-1.5 text-xs opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Address-grouped permit cards */}
      {displayedGroups.length === 0 ? (
        <div className="text-center py-12 text-text-muted text-sm">
          No permits found in this category.
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
              const dateRange = minYear && maxYear && minYear !== maxYear
                ? `${minYear} – ${maxYear}`
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

          {groupOverflow > 0 && (
            <p className="text-xs text-text-muted text-center pt-2">
              {groupOverflow.toLocaleString()} more propert{groupOverflow !== 1 ? "ies" : "y"} not shown
            </p>
          )}
        </div>
      )}
    </div>
  );
}
