export type CaveatKey =
  | "year_built_assessor"
  | "permits_incomplete"
  | "sales_non_market"
  | "assessment_not_market"
  | "historic_survey_period"
  | "neighborhood_boundary"
  | "census_block_proxy"
  | "historical_maps_evidence_only"
  | "permit_records_may_start_2019";

export const CAVEATS: Record<CaveatKey, string> = {
  year_built_assessor:
    "Year built is from assessor records. It may differ from original construction records or building permits.",
  permits_incomplete:
    "Permit records may be incomplete, especially for older work or work done before digital filing.",
  sales_non_market:
    "Sales data may include non-market transfers such as inheritance, estate sales, or family transactions.",
  assessment_not_market:
    "Assessment values are from the Cook County Assessor. They are not the same as market value.",
  historic_survey_period:
    "Historic survey records reflect the time the survey was conducted. Not every property was surveyed.",
  neighborhood_boundary:
    "Neighborhood boundaries in this app are approximate. They are based on common Park Ridge area names and are not official municipal boundaries.",
  census_block_proxy:
    "Block analysis uses Census tabulation blocks as a proxy for local blocks. It may not match how a resident describes their block.",
  historical_maps_evidence_only:
    "Historical maps show what was recorded or visible at the time. They do not prove construction date, ownership, interior condition, or original architecture.",
  permit_records_may_start_2019:
    "Cook County permit records in this dataset may begin in 2019. Permit activity before that date may not appear."
};
