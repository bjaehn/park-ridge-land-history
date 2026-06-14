/**
 * Centralized route configuration for Park Ridge Land History.
 *
 * Each route entry defines the path, display label, breadcrumb label,
 * navigation section, and optional metadata. Page components are wired
 * in AppRouter.tsx — keep this file free of React imports so it can be
 * imported anywhere (data loaders, tests, breadcrumb helpers, etc.).
 */

export type NavSection = "primary" | "entity" | "reference" | "explore";

export type RouteConfig = {
  /** URL path (react-router format, e.g. "/properties/:pin") */
  path: string;
  /** Human-readable label for nav and page titles */
  label: string;
  /** Short breadcrumb text */
  breadcrumb: string;
  /** Which section of the nav this belongs to */
  navSection: NavSection;
  /** Whether this route appears in the top nav */
  inNav: boolean;
  /** Whether the page contains user-searchable content */
  searchable: boolean;
  /** Mark experimental routes to add a "preview" badge in nav */
  experimental?: boolean;
  /** Short description for SEO / page meta */
  description?: string;
};

export const ROUTES = {
  home: {
    path: "/",
    label: "Home",
    breadcrumb: "Home",
    navSection: "primary",
    inNav: false,
    searchable: true,
    description: "Explore Park Ridge property history, block development, and neighborhood growth."
  },

  explore: {
    path: "/explore",
    label: "Map Explorer",
    breadcrumb: "Map",
    navSection: "explore",
    inNav: true,
    searchable: false,
    description: "Full interactive map experience with timeline, permit pressure, and historical layers."
  },

  // ── Properties ─────────────────────────────────────────────────────────────
  properties: {
    path: "/properties",
    label: "Properties",
    breadcrumb: "Properties",
    navSection: "entity",
    inNav: false,
    searchable: true,
    description: "Look up any Park Ridge property by address or PIN."
  },
  propertyDetail: {
    path: "/properties/:pin",
    label: "Property",
    breadcrumb: "Property",
    navSection: "entity",
    inNav: false,
    searchable: false,
    description: "Full history for a single Park Ridge property."
  },

  // ── Blocks ─────────────────────────────────────────────────────────────────
  blocks: {
    path: "/blocks",
    label: "Blocks",
    breadcrumb: "Blocks",
    navSection: "entity",
    inNav: false,
    searchable: false,
    description: "Browse Park Ridge blocks by development era and permit activity."
  },
  blockDetail: {
    path: "/blocks/:blockId",
    label: "Block",
    breadcrumb: "Block",
    navSection: "entity",
    inNav: false,
    searchable: false
  },

  // ── Neighborhoods ──────────────────────────────────────────────────────────
  neighborhoods: {
    path: "/neighborhoods",
    label: "Neighborhoods",
    breadcrumb: "Neighborhoods",
    navSection: "primary",
    inNav: true,
    searchable: false,
    description: "Compare Park Ridge neighborhoods by age, permit activity, and development history."
  },
  neighborhoodDetail: {
    path: "/neighborhoods/:neighborhoodId",
    label: "Neighborhood",
    breadcrumb: "Neighborhood",
    navSection: "entity",
    inNav: false,
    searchable: false
  },

  // ── Subdivisions ───────────────────────────────────────────────────────────
  subdivisions: {
    path: "/subdivisions",
    label: "Subdivisions",
    breadcrumb: "Subdivisions",
    navSection: "primary",
    inNav: true,
    searchable: false,
    description: "Explore how Park Ridge took shape through recorded subdivision plats."
  },
  subdivisionDetail: {
    path: "/subdivisions/:id",
    label: "Subdivision",
    breadcrumb: "Subdivision",
    navSection: "entity",
    inNav: false,
    searchable: false,
    description: "Full history for a single Park Ridge subdivision."
  },

  // ── City ───────────────────────────────────────────────────────────────────
  city: {
    path: "/city",
    label: "Park Ridge",
    breadcrumb: "Park Ridge",
    navSection: "primary",
    inNav: true,
    searchable: false,
    description: "How Park Ridge grew — citywide development history, decade by decade."
  },

  // ── Maps ───────────────────────────────────────────────────────────────────
  maps: {
    path: "/maps",
    label: "Maps",
    breadcrumb: "Maps",
    navSection: "primary",
    inNav: true,
    searchable: false,
    description: "Historical map layers and parcel change detection for Park Ridge.",
    experimental: true
  },

  // ── Reference ──────────────────────────────────────────────────────────────
  sources: {
    path: "/sources",
    label: "Data Sources",
    breadcrumb: "Sources",
    navSection: "reference",
    inNav: true,
    searchable: false,
    description: "Data sources, methodology, and known limitations for Park Ridge Land History."
  },
  about: {
    path: "/about",
    label: "About",
    breadcrumb: "About",
    navSection: "reference",
    inNav: true,
    searchable: false,
    description: "About the Park Ridge Land History project."
  }
} as const satisfies Record<string, RouteConfig>;

/** Navigation items for the top nav bar, in display order. */
export const primaryNav: RouteConfig[] = [
  ROUTES.subdivisions,
  ROUTES.neighborhoods,
  ROUTES.city,
  ROUTES.maps,
];

export const referenceNav: RouteConfig[] = [
  ROUTES.sources,
  ROUTES.about,
];

/** Build a property page URL from a PIN string. */
export function propertyPath(pin: string): string {
  return `/properties/${encodeURIComponent(pin)}`;
}

/** Build a block page URL from a block ID. */
export function blockPath(blockId: string): string {
  return `/blocks/${encodeURIComponent(blockId)}`;
}

/** Build a neighborhood page URL from a neighborhood slug (e.g. "uptown"). */
export function neighborhoodPath(slug: string): string {
  return `/neighborhoods/${encodeURIComponent(slug)}`;
}

/**
 * Convert a neighborhood area summary ID ("neighborhood:uptown")
 * to the URL slug ("uptown") and back.
 */
export function neighborhoodSlugFromId(areaId: string): string {
  return areaId.replace(/^neighborhood:/, "");
}

export function neighborhoodIdFromSlug(slug: string): string {
  return slug.startsWith("neighborhood:") ? slug : `neighborhood:${slug}`;
}
