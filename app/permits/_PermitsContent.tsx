"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PERMIT_CATEGORIES, type PermitListRow } from "@/lib/supabase/permitQueries";

const LIST_LIMIT = 100;
const HIGHLIGHT_LIMIT = 6;

// Accent colors matching HighlightReel conventions
const RESIDENTIAL_ACCENT = "#4a90d9";
const COMMERCIAL_ACCENT  = "#e6a64a";

// Per-category accent colors for the "by work category" highlight sections
const CATEGORY_ACCENT: Record<string, string> = {
  "teardown":         "#c96a70",
  "new-construction": "#4fb6a8",
  "addition":         "#8b7ff0",
  "roofing":          "#e6a64a",
  "garage":           "#4a90d9",
  "mechanical":       "#6db86d",
  "fencing":          "#b07dc9",
  "other":            "#8a9bb0",
};

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

function formatPin(pin: string): string {
  return pin.replace(/(\d{2})(\d{2})(\d{3})(\d{3})(\d{4})/, "$1-$2-$3-$4-$5");
}

function topByAmount(permits: PermitListRow[], typeToken: string, limit: number): PermitListRow[] {
  return permits
    .filter((p) => (p.amount ?? 0) > 0 && p.permit_type?.toUpperCase().includes(typeToken))
    .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
    .slice(0, limit);
}

function topByCategoryAmount(permits: PermitListRow[], categoryKey: string, limit: number): PermitListRow[] {
  return permits
    .filter((p) => (p.amount ?? 0) > 0 && p.category === categoryKey)
    .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
    .slice(0, limit);
}

type HighlightCardProps = {
  permit: PermitListRow;
  accentColor: string;
};

function HighlightCard({ permit, accentColor }: HighlightCardProps) {
  return (
    <Link
      href={`/properties/${encodeURIComponent(permit.pin)}`}
      className="bg-surface-card border border-surface-border rounded-lg p-4 hover:bg-surface-raised transition-colors border-l-2 flex flex-col gap-2"
      style={{ borderLeftColor: accentColor }}
    >
      <p className="text-sm font-medium text-text-primary leading-snug">
        {permit.address ?? formatPin(permit.pin)}
      </p>
      <p className="text-xs text-text-secondary leading-snug line-clamp-2 flex-1">
        {permit.description ?? "No description"}
      </p>
      <div className="flex items-center justify-between gap-2 mt-auto">
        <span className="text-sm font-semibold text-text-primary">
          {formatAmount(permit.amount)}
        </span>
        <span className="text-xs text-text-muted">{formatDate(permit.date_issued)}</span>
      </div>
    </Link>
  );
}

type Props = {
  permits: PermitListRow[];
};

export function PermitsContent({ permits }: Props) {
  const [selectedCategory, setSelectedCategory] = useState("all");

  const stats = useMemo(() => {
    const residential = permits.filter(
      (p) => p.permit_type?.toUpperCase().includes("RESIDENTIAL")
    ).length;
    const commercial = permits.filter(
      (p) => p.permit_type?.toUpperCase().includes("COMMERCIAL")
    ).length;
    const years = permits
      .map((p) => p.date_issued ? new Date(p.date_issued).getFullYear() : null)
      .filter((y): y is number => y != null);
    const minYear = years.length ? Math.min(...years) : null;
    const maxYear = years.length ? Math.max(...years) : null;
    return { total: permits.length, residential, commercial, minYear, maxYear };
  }, [permits]);

  const topResidential = useMemo(
    () => topByAmount(permits, "RESIDENTIAL", HIGHLIGHT_LIMIT),
    [permits]
  );
  const topCommercial = useMemo(
    () => topByAmount(permits, "COMMERCIAL", HIGHLIGHT_LIMIT),
    [permits]
  );

  // Top N most expensive permits per work category
  const topByCategory = useMemo(
    () =>
      PERMIT_CATEGORIES.map((cat) => ({
        cat,
        permits: topByCategoryAmount(permits, cat.key, HIGHLIGHT_LIMIT),
      })).filter((g) => g.permits.length > 0),
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

  const displayed = filtered.slice(0, LIST_LIMIT);
  const overflow = filtered.length - displayed.length;

  return (
    <div className="space-y-10">
      {/* Page header */}
      <div>
        <p className="text-xs font-semibold text-text-muted tracking-widest uppercase mb-1">
          Building activity
        </p>
        <h1 className="text-2xl font-bold text-text-primary">Permits</h1>
        <p className="text-text-secondary text-sm mt-1">
          Building permits issued in Park Ridge, grouped by work category.
        </p>
      </div>

      {/* Stat grid */}
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
            {stats.commercial.toLocaleString()}
          </div>
          <div className="text-xs text-text-muted mt-0.5">Commercial</div>
        </div>
        <div className="bg-surface-card border border-surface-border rounded-lg p-3">
          <div className="text-xl font-bold text-text-primary">
            {stats.minYear && stats.maxYear
              ? `${stats.minYear}–${stats.maxYear}`
              : "—"}
          </div>
          <div className="text-xs text-text-muted mt-0.5">Year range</div>
        </div>
      </div>

      {/* Most expensive by permit type (residential / commercial) */}
      <div className="space-y-8">
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
        {topCommercial.length > 0 && (
          <div>
            <p className="section-heading" style={{ color: COMMERCIAL_ACCENT }}>
              Most expensive commercial permits
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {topCommercial.map((p) => (
                <HighlightCard key={p.id} permit={p} accentColor={COMMERCIAL_ACCENT} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Most expensive by work category */}
      {topByCategory.length > 0 && (
        <div className="space-y-8">
          <div>
            <p className="text-xs font-semibold text-text-muted tracking-widest uppercase mb-1">
              Most expensive by work category
            </p>
          </div>
          {topByCategory.map(({ cat, permits: catPermits }) => {
            const accent = CATEGORY_ACCENT[cat.key] ?? "#8a9bb0";
            return (
              <div key={cat.key}>
                <p className="section-heading" style={{ color: accent }}>
                  {cat.label}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {catPermits.map((p) => (
                    <HighlightCard key={p.id} permit={p} accentColor={accent} />
                  ))}
                </div>
              </div>
            );
          })}
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

      {/* Permit list */}
      {displayed.length === 0 ? (
        <div className="text-center py-12 text-text-muted text-sm">
          No permits found in this category.
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((permit) => (
            <div
              key={permit.id}
              className="bg-surface-card border border-surface-border rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-text-primary truncate">
                    {permit.address ?? formatPin(permit.pin)}
                  </span>
                  {permit.permit_type && (
                    <span
                      className={`shrink-0 text-xs px-1.5 py-0.5 rounded font-medium ${
                        permit.permit_type.toUpperCase().includes("RESIDENTIAL")
                          ? "bg-blue-500/10 text-blue-400"
                          : "bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      {permit.permit_type.toUpperCase().includes("RESIDENTIAL")
                        ? "Residential"
                        : "Commercial"}
                    </span>
                  )}
                </div>
                <p
                  className="text-sm text-text-secondary leading-snug line-clamp-2"
                  title={permit.description ?? undefined}
                >
                  {permit.description ?? "No description"}
                </p>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1 shrink-0">
                <div className="text-xs text-text-muted whitespace-nowrap">
                  {formatDate(permit.date_issued)}
                </div>
                {formatAmount(permit.amount) && (
                  <div className="text-xs font-medium text-text-secondary whitespace-nowrap">
                    {formatAmount(permit.amount)}
                  </div>
                )}
                <Link
                  href={`/properties/${encodeURIComponent(permit.pin)}`}
                  className="text-xs text-text-link hover:underline whitespace-nowrap"
                >
                  View property →
                </Link>
              </div>
            </div>
          ))}

          {overflow > 0 && (
            <p className="text-xs text-text-muted text-center pt-2">
              {overflow.toLocaleString()} more permit{overflow !== 1 ? "s" : ""} not shown
            </p>
          )}
        </div>
      )}
    </div>
  );
}
