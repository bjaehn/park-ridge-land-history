/**
 * Single source of truth for all reusable UI copy strings.
 *
 * Import from here. Never duplicate these strings in page files.
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

// ---------------------------------------------------------------------------
// City narrative
// ---------------------------------------------------------------------------

export const CITY_NARRATIVE =
  "Park Ridge grew in three distinct waves. The first settlers arrived in the 1870s and 1880s, " +
  "clustering near the railroad depot in what is now Uptown. A second wave of bungalows and two-flats " +
  "filled the central and northeast sections through the 1920s and 1930s. After World War II, the postwar " +
  "housing boom extended the city to its northwest and south edges, adding thousands of Cape Cods and " +
  "ranches that define the character of those neighborhoods today.";

// ---------------------------------------------------------------------------
// Neighborhood narratives and era labels (keyed by neighborhood slug)
// ---------------------------------------------------------------------------

export const NEIGHBORHOOD_ERA_LABELS: Record<string, string> = {
  uptown_park_ridge: "Railroad-era core, 1870s to 1930s",
  northeast:         "Bungalow-era expansion, 1910s to 1940s",
  central:           "Mixed-era crossroads, 1920s to 1960s",
  northwest_park:    "Postwar ranch country, 1940s to 1970s",
  south_park:        "The city's last great build-out, 1950s to 1980s",
};

export const NEIGHBORHOOD_NARRATIVES: Record<string, string> = {
  uptown_park_ridge:
    "Uptown is the oldest part of Park Ridge, built around the commuter rail stop that sparked " +
    "the city's first settlement in the 1870s. The streets closest to the depot still hold some of " +
    "the earliest surviving homes in Cook County. Development here peaked in the 1920s and slowed " +
    "to a near stop by 1940.",
  northeast:
    "The Northeast filled in quickly after Uptown, as bungalow builders pushed outward from the " +
    "railroad core through the 1910s and 1920s. The area reflects the working-class and middle-class " +
    "optimism of Chicago's interwar years, with dense blocks of brick and frame bungalows interspersed " +
    "with larger two-flats from the same era.",
  central:
    "Central Park Ridge bridges the prewar and postwar eras. Older Craftsman and Colonial Revival homes " +
    "from the 1920s sit alongside Cape Cods built just after World War II. The neighborhood saw " +
    "sustained construction across five decades, giving it a more mixed architectural character than " +
    "any other part of the city.",
  northwest_park:
    "The Northwest is Park Ridge's ranch country. Nearly all of its homes were built in the fifteen " +
    "years after World War II, when returning veterans and growing families pushed the city's footprint " +
    "toward Des Plaines. Streets of nearly identical 1950s ranches and split-levels reflect how quickly " +
    "this section was built and sold.",
  south_park:
    "South Park Ridge was the last area to develop, with most of its construction occurring from the " +
    "1950s through the 1970s. It shares the postwar character of the Northwest but extends into a " +
    "slightly later period, with split-levels and colonial revivals standing alongside the ranches " +
    "that came first.",
};

// ---------------------------------------------------------------------------
// Coverage and disclaimers
// ---------------------------------------------------------------------------

export const COVERAGE_DISCLAIMER =
  "Coverage is based on the Cook County assessor parcel dataset. " +
  "About 9% of parcels (1,190) could not be matched to a street address and are excluded from address-based lists.";

export const NEIGHBORHOOD_BOUNDARY_DISCLAIMER =
  "Official planning district boundaries reflect the City of Park Ridge's planning areas. " +
  "Business district and local neighborhood boundaries are approximate.";

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
