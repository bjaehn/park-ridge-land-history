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
  "Park Ridge grew in three distinct waves. Its earliest roots trace to 1854, when George Penny opened a " +
  "brickworks near a new railroad depot; the small community that grew up around it, first called " +
  "Pennyville and then Brickton, incorporated as the Village of Park Ridge in 1873. That original " +
  "depot-era core is now Uptown. A second wave of bungalows and two-flats filled the central and " +
  "northeast sections through the 1910s, '20s, and '30s. After World War II, the postwar housing boom " +
  "extended the city to its northwest and south edges, adding thousands of Cape Cods and ranches that " +
  "define the character of those neighborhoods today.";

export const CITY_NARRATIVE_SOURCE_NOTE =
  "Historical summary based on Cook County Assessor build-year distributions and Cook County Recorder " +
  "subdivision records. Era characterizations are interpretive summaries of the data. Confidence: Medium.";

// ---------------------------------------------------------------------------
// Neighborhood narratives and era labels (keyed by neighborhood slug)
// ---------------------------------------------------------------------------

// Keyed by the 7 real official-planning neighborhood slugs from the 1996
// City of Park Ridge Comprehensive Plan (see supabase/migrations/20260705000002).
// Era characterizations here are interpretive, not sourced from the plan --
// the plan names these neighborhoods by geography, not by construction era.
export const NEIGHBORHOOD_ERA_LABELS: Record<string, string> = {
  hodges_park:      "Railroad-era core and historic subdivisions, 1870s to 1930s",
  northeast_park:   "Early estate and bungalow era, 1900s to 1930s",
  maine_park:       "Mixed prewar and postwar development, 1920s to 1960s",
  centennial_park:  "Postwar family neighborhood, 1950s to 1970s",
  northwest_park:   "Postwar institutional growth, 1950s to 1960s",
  ballard_church:   "Late-century growth and hospital expansion, 1960s to 1990s",
  south_park:       "The city's last great build-out, 1950s to 1980s",
};

// Fallback prose, only shown when neighborhoods.historical_summary is null in
// the database (see app/neighborhoods/[slug]/page.tsx). All 7 real
// neighborhoods currently have a DB-sourced historical_summary, so these
// rarely surface; kept as a safety net if a row's summary is ever cleared.
export const NEIGHBORHOOD_NARRATIVES: Record<string, string> = {
  south_park:
    "South Park Ridge was the last area to develop, with most of its construction occurring from the " +
    "1950s through the 1970s, sharing the postwar character of ranches and split-levels seen elsewhere " +
    "in the City's northwest.",
};

// Year ranges that define each neighborhood's "primary era" -- used to generate
// the era context note on property pages. Add a new entry when a new neighborhood slug is created.
export const NEIGHBORHOOD_ERA_YEAR_RANGE: Record<string, [number, number]> = {
  hodges_park:     [1870, 1939],
  northeast_park:  [1900, 1939],
  maine_park:      [1920, 1969],
  centennial_park: [1945, 1979],
  northwest_park:  [1945, 1969],
  ballard_church:  [1960, 1999],
  south_park:      [1940, 1989],
};

// ---------------------------------------------------------------------------
// Coverage and disclaimers
// ---------------------------------------------------------------------------

export const COVERAGE_DISCLAIMER =
  "Coverage is based on the Cook County assessor parcel dataset. " +
  "About 9% of parcels (1,190) could not be matched to a street address and are excluded from address-based lists.";

export const NEIGHBORHOOD_BOUNDARY_DISCLAIMER =
  "The 7 official planning neighborhoods use the real names and general areas defined in the 1996 City " +
  "of Park Ridge Comprehensive Plan. Their exact edges are approximated as straight cuts along the major " +
  "streets the plan cites as neighborhood boundaries (Devon Avenue, Touhy Avenue, Dempster Street, " +
  "Greenwood Avenue), computed from this app's own parcel location data rather than traced from the " +
  "plan's original map, so they are marked low confidence and under review. Business district and local " +
  "neighborhood boundaries are also approximate.";

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
