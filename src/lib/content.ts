/**
 * Single source of truth for all reusable UI copy strings.
 *
 * Import from here. Never duplicate these strings in page files.
 * The deleted /explore page was a clone of Home; these exports
 * prevent that from happening again.
 */

// ---------------------------------------------------------------------------
// Site identity
// ---------------------------------------------------------------------------

export const SITE_NAME = "Park Ridge Land History";
export const SITE_TAGLINE = "A record of how Park Ridge's properties, streets, and neighborhoods took shape.";

// ---------------------------------------------------------------------------
// Home page
// ---------------------------------------------------------------------------

export const HOME_HERO_HEADLINE = "Find your property's story.";
export const HOME_HERO_SUBHEAD =
  "Park Ridge Land History traces 13,381 properties from recorded plat to today, " +
  "using Cook County assessor records, permit data, and the Hargis historic architecture survey.";

export const HOW_IT_WORKS_STEPS: Array<{ heading: string; body: string }> = [
  {
    heading: "Search an address or PIN",
    body: "Type any Park Ridge street address or Cook County PIN to pull up the full property record.",
  },
  {
    heading: "See when and how it was built",
    body: "Year built, building size, permit history, and how this property compares to its street and neighborhood.",
  },
  {
    heading: "Trace the recorded plat",
    body: "Every property links to the subdivision plat that created its lot, with the recording date and original developer.",
  },
  {
    heading: "Explore by street or neighborhood",
    body: "Browse whole streets and neighborhoods to see development patterns, eras, and how Park Ridge grew decade by decade.",
  },
];

export const EXPLORE_CARDS: Array<{ heading: string; body: string; href: string }> = [
  {
    heading: "Neighborhoods",
    body: "Five approximate areas, from the early Uptown core to the postwar south side. See how each developed.",
    href: "/neighborhoods",
  },
  {
    heading: "Subdivisions",
    body: "The recorded plats that created Park Ridge's lots. Each plat names the developer and recording date.",
    href: "/subdivisions",
  },
  {
    heading: "City history",
    body: "Citywide development by decade, from the first recorded lots to today.",
    href: "/city",
  },
];

// ---------------------------------------------------------------------------
// Coverage and disclaimers
// ---------------------------------------------------------------------------

export const COVERAGE_DISCLAIMER =
  "Coverage is based on the Cook County assessor parcel dataset. " +
  "About 9% of parcels (1,190) could not be matched to a street address and are excluded from address-based lists.";

export const NEIGHBORHOOD_BOUNDARY_DISCLAIMER =
  "Neighborhood boundaries are approximate and not official. " +
  "They are derived from Census tract groupings for orientation only.";

export const DATA_CURRENCY_DISCLAIMER =
  "Data reflects the most recent assessor extract and permit records available at build time.";

// ---------------------------------------------------------------------------
// Source citations (used by SourceNote component)
// ---------------------------------------------------------------------------

export const SOURCES = {
  assessor: {
    label: "Cook County Assessor",
    detail: "Parcel Universe dataset. Includes year built, building square footage, assessment history.",
  },
  permits: {
    label: "City of Park Ridge permit records",
    detail: "Building permit history where available. Coverage varies by era.",
  },
  hargis: {
    label: "Hargis Historic Architecture Survey",
    detail: "Illinois historic survey records matched by address and PIN.",
  },
  cookGis: {
    label: "Cook County GIS",
    detail: "Parcel boundary polygons and spatial joins.",
  },
  recorder: {
    label: "Cook County Recorder of Deeds",
    detail: "Recorded subdivision plat index and plat boundaries.",
  },
  tiger: {
    label: "U.S. Census TIGER/Line",
    detail: "Used internally for spatial joins only. TIGER tabulation blocks are not user-facing geography.",
  },
} as const;

export type SourceKey = keyof typeof SOURCES;
