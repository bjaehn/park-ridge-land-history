"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import type { LucideIcon } from "lucide-react";
import { SITE_NAME } from "@/lib/content";
import {
  NeighborhoodIcon,
  PlanningDistrictIcon,
  BusinessDistrictIcon,
  SubdivisionIcon,
  StreetIcon,
  PermitIcon,
  CityIcon,
} from "@/lib/icons";
import type { SearchResult } from "@/lib/supabase/homeQueries";

type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive?: (pathname: string) => boolean;
};

const NAV_LINKS: NavLink[] = [
  { href: "/neighborhoods",       label: "Neighborhoods",      icon: NeighborhoodIcon      },
  { href: "/planning-districts",  label: "Planning Districts", icon: PlanningDistrictIcon  },
  { href: "/business-districts",  label: "Business Districts", icon: BusinessDistrictIcon  },
  { href: "/subdivisions",        label: "Subdivisions",       icon: SubdivisionIcon       },
  { href: "/streets",             label: "Streets",            icon: StreetIcon            },
  { href: "/permits",             label: "Permits",            icon: PermitIcon            },
  { href: "/city",                label: "City history",       icon: CityIcon              },
];


export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close search dropdown when clicking outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    setFocusedIndex(-1);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (q.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      try {
        const { searchParcels } = await import("@/lib/supabase/homeQueries");
        const found = await searchParcels(q, 6);
        setResults(found);
        setShowResults(found.length > 0);
      } catch {
        setResults([]);
        setShowResults(false);
      }
    }, 180);
  }, []);

  function selectResult(pin: string) {
    setQuery("");
    setResults([]);
    setShowResults(false);
    setFocusedIndex(-1);
    router.push(`/properties/${encodeURIComponent(pin)}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((i) => (i < results.length - 1 ? i + 1 : i));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((i) => (i > 0 ? i - 1 : 0));
    } else if (e.key === "Enter" && results.length > 0) {
      selectResult(focusedIndex >= 0 ? results[focusedIndex].pin : results[0].pin);
    } else if (e.key === "Escape") {
      setShowResults(false);
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-surface-base/95 backdrop-blur border-b border-surface-border print:hidden">
      <div className="max-w-content mx-auto px-page-x h-14 flex items-center gap-2 md:gap-6">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2 text-text-primary font-semibold text-sm shrink-0 hover:text-accent-purple transition-colors"
          aria-label={`${SITE_NAME} home`}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5z" />
            <polyline points="9 21 9 12 15 12 15 21" />
          </svg>
          <span>Park Ridge</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1" aria-label="Main navigation">
          {NAV_LINKS.map((link) => {
            const active = link.isActive ? link.isActive(pathname) : pathname.startsWith(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${
                  active
                    ? "bg-accent-purple/15 text-accent-purple font-medium"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-raised"
                }`}
              >
                <Icon size={14} strokeWidth={1.8} aria-hidden="true" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Search */}
        <div ref={searchRef} className="relative flex-1 md:flex-none md:w-56" role="search">
          <label htmlFor="topnav-search" className="sr-only">
            Search an address or PIN
          </label>
          <div className="relative">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
              width="13"
              height="13"
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
              id="topnav-search"
              type="search"
              autoComplete="off"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => query.length >= 2 && setShowResults(results.length > 0)}
              onKeyDown={handleKeyDown}
              placeholder="Search address..."
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-surface-raised border border-surface-border rounded text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/60 transition-colors"
            />
          </div>
          {showResults && (
            <ul
              className="absolute top-full left-0 right-0 mt-1 bg-surface-card border border-surface-border rounded-lg shadow-xl overflow-hidden z-50"
              role="listbox"
            >
              {results.map((r, index) => (
                <li key={r.pin} role="option" aria-selected={focusedIndex === index}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-surface-raised transition-colors"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectResult(r.pin);
                    }}
                  >
                    <span className="text-text-primary block leading-snug">
                      {r.address}
                    </span>
                    {r.yearBuilt && (
                      <span className="text-xs text-text-muted">Built {r.yearBuilt}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="md:hidden flex items-center justify-center w-8 h-8 text-text-secondary hover:text-text-primary transition-colors"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((o) => !o)}
        >
          {mobileOpen ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <nav
          className="md:hidden bg-surface-raised border-b border-surface-border"
          aria-label="Mobile navigation"
        >
          <div className="max-w-content mx-auto px-page-x pt-3 pb-2">
            <div className="relative" role="search">
              <label htmlFor="mobile-search" className="sr-only">
                Search an address
              </label>
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                width="13"
                height="13"
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
                id="mobile-search"
                type="search"
                autoComplete="off"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => query.length >= 2 && setShowResults(results.length > 0)}
                onKeyDown={handleKeyDown}
                placeholder="Search address"
                className="w-full pl-8 pr-3 py-2 text-sm bg-surface-card border border-surface-border rounded text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/60 transition-colors"
              />
              {showResults && (
                <ul
                  className="absolute top-full left-0 right-0 mt-1 bg-surface-card border border-surface-border rounded-lg shadow-xl overflow-hidden z-50"
                  role="listbox"
                >
                  {results.map((r, index) => (
                    <li key={r.pin} role="option" aria-selected={focusedIndex === index}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-surface-raised transition-colors"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectResult(r.pin);
                        }}
                      >
                        <span className="text-text-primary block leading-snug">{r.address}</span>
                        {r.yearBuilt && (
                          <span className="text-xs text-text-muted">Built {r.yearBuilt}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <ul className="max-w-content mx-auto px-page-x pb-3 flex flex-col gap-1">
            {NAV_LINKS.map((link) => {
              const active = link.isActive ? link.isActive(pathname) : pathname.startsWith(link.href);
              const Icon = link.icon;
              return (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded text-sm transition-colors ${
                      active
                        ? "bg-accent-purple/15 text-accent-purple font-medium"
                        : "text-text-secondary hover:text-text-primary hover:bg-surface-card"
                    }`}
                  >
                    <Icon size={14} strokeWidth={1.8} aria-hidden="true" />
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </header>
  );
}
