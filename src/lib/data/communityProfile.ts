/**
 * Static Community Profile snapshot for Park Ridge, sourced from Chapter 1 of
 * the 2020 Comprehensive Plan ("Park Ridge Wonderful"). Figures are 2013-2017
 * American Community Survey (ACS) five-year estimates unless noted otherwise
 * (land use is from the 2013 CMAP Parcel-Based Land Use Inventory; employer
 * figures are from 2019). This is a fixed historical snapshot, not live data
 * -- it will not update as the app's own Cook County-sourced property data
 * does, and no peer-municipality comparison columns are included.
 *
 * Source: historical_sources.source_id = 'park_ridge_comprehensive_plan_2020'.
 */

export const COMMUNITY_PROFILE_VINTAGE =
  "2013-2017 American Community Survey five-year estimates (land use: 2013 CMAP inventory; employers: 2019), via the 2020 Comprehensive Plan.";

export const COMMUNITY_PROFILE_KEY_FINDINGS: string[] = [
  "Very stable in population since 2000",
  "Trending older, with a larger share of residents aged 45-64 than in the past",
  "Becoming slightly more diverse in race, ethnicity, and language, though more slowly than Cook County or the region",
  "Becoming slightly more affluent and educated relative to the region",
  "Primarily residential -- especially single-family detached -- in both land allocation and property tax base",
  "Tied strongly to homeownership: nearly 80% of housing units are owner-occupied",
  "Concentrated in health care, education, and professional services for both resident jobs and local employers",
  "Home to Lutheran General Hospital, the City's largest employer by far, with a workforce exceeding all other top-10 employers combined",
];

export const POPULATION_HISTORY: { year: number; population: number; projected?: boolean }[] = [
  { year: 2000, population: 37946 },
  { year: 2010, population: 37480 },
  { year: 2018, population: 37810 },
  { year: 2023, population: 37830, projected: true },
];

export const RACE_ETHNICITY: { label: string; count: number; percent: number }[] = [
  { label: "White, non-Hispanic", count: 32545, percent: 86.1 },
  { label: "Hispanic or Latino", count: 2479, percent: 6.6 },
  { label: "Black, non-Hispanic", count: 166, percent: 0.4 },
  { label: "Asian, non-Hispanic", count: 1850, percent: 4.9 },
  { label: "All other categories", count: 770, percent: 2.0 },
];

export const HOUSEHOLD_INCOME_MEDIAN = 98219;

export const HOUSEHOLD_INCOME_DISTRIBUTION: { label: string; percent: number }[] = [
  { label: "Less than $25,000", percent: 9.8 },
  { label: "$25,000 to $49,999", percent: 14.6 },
  { label: "$50,000 to $74,999", percent: 12.2 },
  { label: "$75,000 to $99,999", percent: 14.4 },
  { label: "$100,000 to $149,999", percent: 16.5 },
  { label: "$150,000 and over", percent: 32.6 },
];

export const EDUCATIONAL_ATTAINMENT: { label: string; count: number; percent: number }[] = [
  { label: "Less than high school graduate", count: 1079, percent: 4.2 },
  { label: "High school graduate or equivalency", count: 4131, percent: 15.9 },
  { label: "Some college, no degree", count: 4120, percent: 15.9 },
  { label: "Associate's degree", count: 1769, percent: 6.8 },
  { label: "Bachelor's degree", count: 8569, percent: 33.0 },
  { label: "Graduate or professional degree", count: 6261, percent: 24.1 },
];

export const LANGUAGE_SPOKEN_AT_HOME: { label: string; count: number; percent: number }[] = [
  { label: "English", count: 27717, percent: 78.4 },
  { label: "Spanish", count: 1353, percent: 3.8 },
  { label: "Slavic languages", count: 3026, percent: 8.6 },
  { label: "Other Indo-European languages", count: 2028, percent: 5.7 },
  { label: "Other Asian languages", count: 351, percent: 1.0 },
  { label: "Tagalog", count: 470, percent: 1.3 },
  { label: "Chinese", count: 106, percent: 0.3 },
  { label: "Arabic", count: 108, percent: 0.3 },
  { label: "Korean", count: 80, percent: 0.2 },
  { label: "Other/unspecified languages", count: 99, percent: 0.3 },
];

export const LAND_USE_INVENTORY: { label: string; acres: number; percent: number }[] = [
  { label: "Single-family residential", acres: 2127.9, percent: 46.6 },
  { label: "Transportation and other infrastructure", acres: 1077.7, percent: 23.6 },
  { label: "Open space", acres: 702.3, percent: 15.4 },
  { label: "Institutional", acres: 340.4, percent: 7.5 },
  { label: "Commercial", acres: 160.6, percent: 3.5 },
  { label: "Multi-family residential", acres: 123.2, percent: 2.7 },
  { label: "Vacant", acres: 23.7, percent: 0.5 },
  { label: "Mixed use", acres: 9.1, percent: 0.2 },
  { label: "Industrial", acres: 1.1, percent: 0.02 },
];
export const LAND_USE_TOTAL_ACRES = 4565.9;

export const EAV_BY_LAND_USE: { label: string; value: number }[] = [
  { label: "Residential", value: 1355700713 },
  { label: "Commercial", value: 178345314 },
  { label: "Railroad", value: 1322833 },
  { label: "Industrial", value: 603078 },
  { label: "Farm", value: 0 },
  { label: "Mineral", value: 0 },
];
export const EAV_TOTAL = 1535971938;
export const EAV_RESIDENTIAL_PERCENT = 88;

export const HOUSING_TYPE: { label: string; count: number; percent: number }[] = [
  { label: "Single-family, detached", count: 10850, percent: 72.2 },
  { label: "5 or more units", count: 3028, percent: 20.1 },
  { label: "Single-family, attached", count: 527, percent: 3.5 },
  { label: "3 or 4 units", count: 353, percent: 2.3 },
  { label: "2 units", count: 273, percent: 1.8 },
];

export const HOUSING_TENURE_OWNER_OCCUPIED_PERCENT_APPROX = 80;
export const HOUSING_RENTAL_SHARE_2000_PERCENT = 12;
export const HOUSING_RENTAL_SHARE_CURRENT_PERCENT = 16;

export const HOUSING_SIZE_BEDROOMS: { label: string; count: number; percent: number }[] = [
  { label: "0 to 1 bedrooms", count: 1568, percent: 10.4 },
  { label: "2 bedrooms", count: 2991, percent: 19.9 },
  { label: "3 bedrooms", count: 5913, percent: 39.3 },
  { label: "4 bedrooms", count: 3769, percent: 25.1 },
  { label: "5 bedrooms", count: 790, percent: 5.3 },
];
export const HOUSING_MEDIAN_ROOMS = 6.4;

export const EMPLOYMENT_BY_INDUSTRY_RESIDENTS: { label: string; count: number; percent: number }[] = [
  { label: "Health care", count: 2203, percent: 12.9 },
  { label: "Education", count: 1896, percent: 11.1 },
  { label: "Professional services", count: 1800, percent: 10.5 },
  { label: "Retail trade", count: 1541, percent: 9.0 },
  { label: "Manufacturing", count: 1309, percent: 7.6 },
];

export const EMPLOYMENT_BY_INDUSTRY_LOCAL_JOBS: { label: string; count: number; percent: number }[] = [
  { label: "Health care", count: 6750, percent: 37.5 },
  { label: "Education", count: 2412, percent: 13.4 },
  { label: "Professional services", count: 2097, percent: 11.6 },
  { label: "Retail trade", count: 1216, percent: 6.8 },
  { label: "Manufacturing", count: 810, percent: 4.5 },
];

export const RESIDENT_EMPLOYMENT_LOCATION: { label: string; count: number; percent: number }[] = [
  { label: "Chicago", count: 5137, percent: 30.0 },
  { label: "Park Ridge", count: 1784, percent: 10.4 },
  { label: "Des Plaines", count: 693, percent: 4.0 },
  { label: "Schaumburg", count: 428, percent: 2.5 },
  { label: "Niles", count: 417, percent: 2.4 },
];

export const TOP_EMPLOYERS_2019: { employer: string; product: string; employees: number; percentOfTotal: number }[] = [
  { employer: "Advocate Lutheran General Hospital", product: "Hospital", employees: 4500, percentOfTotal: 12.08 },
  { employer: "Maine Township School District 207", product: "Public High School", employees: 1200, percentOfTotal: 3.22 },
  { employer: "Park Ridge Park District", product: "Public Recreation Facilities & Programs", employees: 813, percentOfTotal: 2.18 },
  { employer: "School District 64", product: "Public School - Elementary", employees: 722, percentOfTotal: 1.94 },
  { employer: "City of Park Ridge", product: "City Government", employees: 326, percentOfTotal: 0.88 },
  { employer: "Presence Resurrection Health Care", product: "Nursing and Rehab Home", employees: 300, percentOfTotal: 0.81 },
  { employer: "FM Global", product: "Commercial Property Insurance", employees: 300, percentOfTotal: 0.81 },
  { employer: "Mariano's", product: "Grocery", employees: 276, percentOfTotal: 0.74 },
  { employer: "Advocate Medical Group - Nesset Center", product: "Physicians", employees: 220, percentOfTotal: 0.59 },
  { employer: "Park Ridge Community Bank", product: "Banking", employees: 220, percentOfTotal: 0.59 },
];
