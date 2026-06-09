import { getHouseEvolutionTimeline } from "./houseEvolution";
import {
  isFullDemolitionPermitEvent,
  isFullNewConstructionPermitEvent,
  permitPressureCurrentYear
} from "./permitPressure";
import type { ParcelFeature, ParcelProperties } from "./parcelTypes";

export type ChangeStoryType =
  | "preservation"
  | "careful_reinvestment"
  | "turnover"
  | "rebuild_pressure"
  | "expansion"
  | "dormant";

export type ChangeStory = {
  type: ChangeStoryType;
  label: string;
  title: string;
  body: string;
  evidence: string[];
};

export type ChangeStoryCount = {
  type: ChangeStoryType;
  label: string;
  count: number;
  percent: number;
};

export type AggregateChangeStory = {
  type: ChangeStoryType;
  label: string;
  title: string;
  body: string;
  counts: ChangeStoryCount[];
};

const storyLabels: Record<ChangeStoryType, string> = {
  preservation: "Preservation",
  careful_reinvestment: "Careful reinvestment",
  turnover: "Turnover",
  rebuild_pressure: "Rebuild pressure",
  expansion: "Expansion",
  dormant: "Dormant"
};

const storyOrder: ChangeStoryType[] = [
  "careful_reinvestment",
  "preservation",
  "dormant",
  "turnover",
  "expansion",
  "rebuild_pressure"
];

export function classifyParcelChangeStory(properties: ParcelProperties): ChangeStory {
  const type = parcelChangeStoryType(properties);
  return {
    type,
    label: storyLabels[type],
    title: propertyTitle(type),
    body: propertyBody(type, properties),
    evidence: propertyEvidence(type, properties)
  };
}

export function aggregateChangeStory(features: ParcelFeature[], scale: "block" | "area" | "city"): AggregateChangeStory {
  const total = features.length;
  const counts = storyOrder.map((type) => {
    const count = features.filter((feature) => parcelChangeStoryType(feature.properties, false) === type).length;
    return {
      type,
      label: storyLabels[type],
      count,
      percent: total ? Math.round((count / total) * 100) : 0
    };
  });

  const dominant = dominantStoryType(counts, total);
  return {
    type: dominant,
    label: storyLabels[dominant],
    title: aggregateTitle(dominant, scale),
    body: aggregateBody(dominant, counts, total, scale),
    counts
  };
}

export function changeStoryLabel(type: ChangeStoryType): string {
  return storyLabels[type];
}

function parcelChangeStoryType(properties: ParcelProperties, useTimelineFallback = true): ChangeStoryType {
  const yearBuilt = properties.year_built;
  const age = typeof yearBuilt === "number" ? permitPressureCurrentYear - yearBuilt : null;
  const oldHome = typeof yearBuilt === "number" && yearBuilt <= 1945;
  const oldOrMidCentury = typeof yearBuilt === "number" && yearBuilt <= 1970;
  const permitCount = properties.permit_count ?? 0;
  const saleCount = properties.sale_count ?? 0;
  const assessmentChange = properties.assessed_value_change_pct;
  const quietAssessment =
    typeof assessmentChange !== "number" || Number.isNaN(assessmentChange) || Math.abs(assessmentChange) <= 5;

  if (hasRebuildSignal(properties, useTimelineFallback)) return "rebuild_pressure";
  if (hasExpansionSignal(properties, useTimelineFallback)) return "expansion";
  if (saleCount >= 5 && permitCount <= 2) return "turnover";
  if (oldOrMidCentury && hasReinvestmentSignal(properties)) return "careful_reinvestment";
  if ((oldHome && permitCount <= 1 && saleCount <= 2) || (oldHome && (properties.hargis_record_count ?? 0) > 0)) {
    return "preservation";
  }
  if (saleCount === 0 && permitCount === 0 && quietAssessment && (age === null || age >= 20)) return "dormant";
  if (hasReinvestmentSignal(properties)) return "careful_reinvestment";
  if (saleCount >= 3) return "turnover";
  return "dormant";
}

function hasRebuildSignal(properties: ParcelProperties, useTimelineFallback = true): boolean {
  if (properties.permit_pressure_type === "direct_teardown" || properties.permit_pressure_type === "new_construction") {
    return true;
  }
  if (!useTimelineFallback) return false;
  return getHouseEvolutionTimeline(properties).some((event) =>
    event.event_type === "permit" && (isFullDemolitionPermitEvent(event) || isFullNewConstructionPermitEvent(event))
  );
}

function hasExpansionSignal(properties: ParcelProperties, useTimelineFallback = true): boolean {
  if (properties.permit_pressure_type === "addition") return true;
  if (!useTimelineFallback) return false;
  return getHouseEvolutionTimeline(properties).some((event) => {
    if (event.event_type !== "permit") return false;
    const text = `${event.title || ""} ${event.description || ""}`.toLowerCase();
    return /\b(addition|garage|porch|deck|dormer|second story|sunroom|room addition|rear addition)\b/.test(text);
  });
}

function hasReinvestmentSignal(properties: ParcelProperties): boolean {
  return (
    ["recent_permit", "remodel", "addition"].includes(String(properties.permit_pressure_type)) ||
    (properties.permit_count ?? 0) > 0 ||
    (properties.recent_permit_count ?? 0) > 0
  );
}

function dominantStoryType(counts: ChangeStoryCount[], total: number): ChangeStoryType {
  const rebuild = counts.find((count) => count.type === "rebuild_pressure");
  const expansion = counts.find((count) => count.type === "expansion");
  if (rebuild && rebuild.count >= Math.max(2, total * 0.03)) return "rebuild_pressure";
  if (expansion && expansion.count >= Math.max(3, total * 0.08)) return "expansion";
  return [...counts].sort((left, right) => right.count - left.count)[0]?.type ?? "dormant";
}

function propertyTitle(type: ChangeStoryType): string {
  const titles: Record<ChangeStoryType, string> = {
    preservation: "This house appears largely intact.",
    careful_reinvestment: "This house has been cared for and updated.",
    turnover: "This house has changed hands more often than it has changed shape.",
    rebuild_pressure: "This house has a rebuild signal.",
    expansion: "This house appears to have expanded over time.",
    dormant: "This house has had a quiet public record."
  };
  return titles[type];
}

function propertyBody(type: ChangeStoryType, properties: ParcelProperties): string {
  const permitCount = properties.permit_count ?? 0;
  const saleCount = properties.sale_count ?? 0;
  const year = properties.year_built ? `Built around ${properties.year_built}. ` : "";
  if (type === "preservation") return `${year}Older-home fabric appears relatively intact, with limited sale and permit activity.`;
  if (type === "careful_reinvestment") return `${year}The record points to updates or reinvestment without a full rebuild signal.`;
  if (type === "turnover") return `${year}${saleCount.toLocaleString()} sales are attached, but only ${permitCount.toLocaleString()} permit records.`;
  if (type === "rebuild_pressure") return `${year}Demolition or new-construction evidence appears in the permit record.`;
  if (type === "expansion") return `${year}Permit language points to additions, garages, porches, decks, or other expansion work.`;
  return `${year}No strong sale, permit, or assessment movement is visible in the current public record.`;
}

function propertyEvidence(type: ChangeStoryType, properties: ParcelProperties): string[] {
  const evidence = [
    properties.year_built ? `Built ${properties.year_built}` : null,
    `${(properties.sale_count ?? 0).toLocaleString()} sales since 1999`,
    `${(properties.permit_count ?? 0).toLocaleString()} permit records`
  ];
  if (type === "preservation" && properties.hargis_record_count) {
    evidence.push("Historic survey record attached");
  }
  if (type === "rebuild_pressure") {
    evidence.push("Demolition or new-construction signal");
  }
  if (type === "expansion") {
    evidence.push("Expansion words found in permit descriptions");
  }
  return evidence.filter((item): item is string => Boolean(item));
}

function aggregateTitle(type: ChangeStoryType, scale: "block" | "area" | "city"): string {
  const subject = scale === "city" ? "Park Ridge" : scale === "area" ? "This area" : "This block";
  const titles: Record<ChangeStoryType, string> = {
    preservation: `${subject} carries older-home fabric.`,
    careful_reinvestment: `${subject} is stable but reinvesting.`,
    turnover: `${subject} shows ownership turnover.`,
    rebuild_pressure: `${subject} shows rebuild pressure.`,
    expansion: `${subject} is expanding more than replacing.`,
    dormant: `${subject} is mostly quiet.`
  };
  return titles[type];
}

function aggregateBody(
  type: ChangeStoryType,
  counts: ChangeStoryCount[],
  total: number,
  scale: "block" | "area" | "city"
): string {
  const label = scale === "city" ? "homes across Park Ridge" : scale === "area" ? "homes in this area" : "homes on this block";
  const dominant = counts.find((count) => count.type === type);
  const remodel = counts.find((count) => count.type === "careful_reinvestment");
  const rebuild = counts.find((count) => count.type === "rebuild_pressure");
  const expansion = counts.find((count) => count.type === "expansion");
  const dominantText = dominant ? `${dominant.count.toLocaleString()} (${dominant.percent}%) read as ${dominant.label.toLowerCase()}` : "No dominant pattern is clear";
  const activityText = `${remodel?.count.toLocaleString() ?? "0"} show careful reinvestment, ${expansion?.count.toLocaleString() ?? "0"} show expansion, and ${rebuild?.count.toLocaleString() ?? "0"} show rebuild pressure.`;
  return `${dominantText} out of ${total.toLocaleString()} ${label}. ${activityText}`;
}
