import { formatCurrency } from "./formatters";
import type { HouseEvolutionEvent, ParcelProperties } from "./parcelTypes";

const eventTypeLabels: Record<HouseEvolutionEvent["event_type"], string> = {
  original_build: "Original build",
  sale: "Ownership",
  permit: "Permit",
  nearby_teardown: "Nearby teardown",
  historic_survey: "Historic survey",
  assessment: "Value record",
  appeal: "Assessment appeal"
};

export function getHouseEvolutionTimeline(properties: ParcelProperties): HouseEvolutionEvent[] {
  const events = parseTimeline(properties.house_evolution_timeline);
  const baseEvents = events.length > 0 ? events : fallbackBuildEvent(properties);
  return sortTimeline([...baseEvents, ...derivedPropertyEvents(properties)]);
}

function fallbackBuildEvent(properties: ParcelProperties): HouseEvolutionEvent[] {
  if (!properties.year_built) return [];
  return [
    {
      year: properties.year_built,
      title: "Original build",
      description: "Assessor year built for the primary structure.",
      event_type: "original_build",
      source: "Cook County Assessor"
    }
  ];
}

function derivedPropertyEvents(properties: ParcelProperties): HouseEvolutionEvent[] {
  const events: HouseEvolutionEvent[] = [];
  if (properties.latest_assessed_year && properties.latest_assessed_total) {
    events.push({
      year: properties.latest_assessed_year,
      title: "Assessed value record",
      description: assessmentDescription(properties),
      event_type: "assessment",
      source: "Cook County Assessor"
    });
  }
  if ((properties.appeal_count ?? 0) > 0 && properties.latest_appeal_year) {
    events.push({
      year: properties.latest_appeal_year,
      title: "Assessment appeal record",
      description: appealDescription(properties),
      event_type: "appeal",
      source: "Cook County Assessor"
    });
  }
  return events;
}

export function formatEvolutionYear(event: HouseEvolutionEvent): string {
  if (event.year) return String(event.year);
  if (event.date) {
    const parsed = new Date(event.date);
    if (!Number.isNaN(parsed.valueOf())) return String(parsed.getUTCFullYear());
  }
  return "Unknown";
}

export function formatEvolutionMeta(event: HouseEvolutionEvent): string {
  const parts = [
    eventTypeLabels[event.event_type],
    event.status,
    event.permit_number ? `Permit ${event.permit_number}` : null,
    event.document_number ? `Document ${event.document_number}` : null,
    event.reference_number ? `HARGIS ${event.reference_number}` : null,
    event.price ? formatCurrency(event.price) : null
  ]
    .filter(Boolean)
    .map(String);
  return parts.join(" - ");
}

function assessmentDescription(properties: ParcelProperties): string {
  const parts = [`Latest assessed value ${formatCurrency(properties.latest_assessed_total)}.`];
  if (
    typeof properties.assessed_value_change_pct === "number" &&
    properties.first_assessed_year &&
    properties.latest_assessed_year &&
    properties.first_assessed_year !== properties.latest_assessed_year
  ) {
    parts.push(
      `Changed ${Math.round(properties.assessed_value_change_pct).toLocaleString()}% since ${properties.first_assessed_year}.`
    );
  }
  return parts.join(" ");
}

function appealDescription(properties: ParcelProperties): string {
  const count = properties.appeal_count ?? 0;
  const parts = [`${count.toLocaleString()} assessment appeal${count === 1 ? "" : "s"} found.`];
  if (properties.total_assessment_reduction && properties.total_assessment_reduction > 0) {
    parts.push(`${formatCurrency(properties.total_assessment_reduction)} in recorded assessment reductions.`);
  }
  return parts.join(" ");
}

function parseTimeline(value: ParcelProperties["house_evolution_timeline"]): HouseEvolutionEvent[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(isTimelineEvent);
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(isTimelineEvent) : [];
  } catch {
    return [];
  }
}

function isTimelineEvent(value: unknown): value is HouseEvolutionEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<HouseEvolutionEvent>;
  return typeof event.title === "string" && typeof event.event_type === "string";
}

function sortTimeline(events: HouseEvolutionEvent[]): HouseEvolutionEvent[] {
  return [...events].sort((left, right) => {
    const leftYear = Number(formatEvolutionYear(left));
    const rightYear = Number(formatEvolutionYear(right));
    if (Number.isFinite(leftYear) && Number.isFinite(rightYear) && leftYear !== rightYear) return leftYear - rightYear;
    return String(left.date ?? "").localeCompare(String(right.date ?? ""));
  });
}
