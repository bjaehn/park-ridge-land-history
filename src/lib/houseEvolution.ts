import { formatCurrency } from "./formatters";
import type { HouseEvolutionEvent, ParcelProperties } from "./parcelTypes";

const eventTypeLabels: Record<HouseEvolutionEvent["event_type"], string> = {
  original_build: "Original build",
  sale: "Sale",
  permit: "Permit",
  nearby_teardown: "Nearby teardown"
};

export function getHouseEvolutionTimeline(properties: ParcelProperties): HouseEvolutionEvent[] {
  const events = parseTimeline(properties.house_evolution_timeline);
  if (events.length > 0) return sortTimeline(events);

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
    event.price ? formatCurrency(event.price) : null
  ]
    .filter(Boolean)
    .map(String);
  return parts.join(" · ");
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
