import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const enrichedPath = path.join(repoRoot, "public", "data", "park_ridge_parcels_enriched.geojson");
const mapPath = path.join(repoRoot, "public", "data", "park_ridge_parcels_map.geojson");
const detailDir = path.join(repoRoot, "public", "data", "parcel_details");

const mapFields = [
  "pin_normalized",
  "pin_original",
  "address",
  "municipality",
  "property_class",
  "year_built",
  "decade_built",
  "building_sqft",
  "land_sqft",
  "improvement_count",
  "permit_count",
  "latest_permit_year",
  "nearby_teardown_count",
  "sale_count",
  "latest_sale_year",
  "latest_sale_price",
  "max_sale_price",
  "assessed_year_count",
  "first_assessed_year",
  "first_assessed_total",
  "latest_assessed_year",
  "latest_assessed_total",
  "assessed_value_change_pct",
  "appeal_count",
  "latest_appeal_year",
  "open_appeal_count",
  "total_assessment_reduction",
  "foreclosure_count_half_mile_5yr",
  "foreclosure_per_1000_half_mile_5yr",
  "street_block_id",
  "street_block_tract",
  "street_block_source",
  "hargis_record_count",
  "hargis_arch_class",
  "hargis_architect",
  "hargis_builder",
  "hargis_photo_count",
  "hargis_pdf_count",
  "civic_record_count",
  "directory_record_count",
  "sanborn_snapshot_count",
  "paper_trail_record_count",
  "recognized_history_count",
  "land_family_record_count",
  "primary_building_selection_method",
  "data_quality_flags",
  "source_note"
];

const payload = JSON.parse(fs.readFileSync(enrichedPath, "utf8"));
const detailChunks = new Map();

const mapFeatures = payload.features.map((feature) => {
  const properties = feature.properties ?? {};
  const pin = properties.pin_normalized || properties.pin_original;
  if (pin) {
    const prefix = detailPrefix(pin);
    if (!detailChunks.has(prefix)) detailChunks.set(prefix, {});
    detailChunks.get(prefix)[pin] = properties;
  }

  const mapProperties = {};
  for (const field of mapFields) {
    if (properties[field] !== undefined) mapProperties[field] = properties[field];
  }
  Object.assign(mapProperties, pressureSummaries(properties.house_evolution_timeline));

  return {
    type: "Feature",
    id: feature.id,
    properties: mapProperties,
    geometry: roundedGeometry(feature.geometry)
  };
});

fs.writeFileSync(
  mapPath,
  JSON.stringify({
    type: "FeatureCollection",
    name: "park_ridge_parcels_map",
    features: mapFeatures
  }),
  "utf8"
);

fs.mkdirSync(detailDir, { recursive: true });
for (const item of fs.readdirSync(detailDir)) {
  if (item.endsWith(".json")) fs.unlinkSync(path.join(detailDir, item));
}

for (const [prefix, records] of detailChunks.entries()) {
  fs.writeFileSync(
    path.join(detailDir, `${prefix}.json`),
    JSON.stringify({
      prefix,
      record_count: Object.keys(records).length,
      records
    }),
    "utf8"
  );
}

const enrichedBytes = fs.statSync(enrichedPath).size;
const mapBytes = fs.statSync(mapPath).size;
console.log(
  JSON.stringify(
    {
      enriched_mb: roundMb(enrichedBytes),
      map_mb: roundMb(mapBytes),
      detail_chunks: detailChunks.size,
      map_reduction_percent: Math.round((1 - mapBytes / enrichedBytes) * 100)
    },
    null,
    2
  )
);

function compactPressureTimeline(value) {
  const events = Array.isArray(value) ? value : parseJsonArray(value);
  return events
    .filter((event) => event?.event_type === "permit" || event?.event_type === "nearby_teardown")
    .map((event) => compactObject({
      year: event.year ?? yearFromDate(event.date),
      date: event.date,
      title: event.title,
      description: event.description,
      event_type: event.event_type,
      status: event.status,
      permit_number: event.permit_number,
      local_permit_number: event.local_permit_number
    }));
}

function pressureSummaries(value) {
  const events = compactPressureTimeline(value);
  const windows = [
    ["1", 1],
    ["5", 5],
    ["10", 10],
    ["all", "all"]
  ];
  return Object.fromEntries(
    windows.flatMap(([suffix, window]) => {
      const summary = pressureSummaryForWindow(events, window);
      return [
        [`permit_pressure_${suffix}_type`, summary.pressureType],
        [`permit_stability_${suffix}_type`, summary.stabilityType],
        [`permit_pressure_${suffix}_score`, summary.score],
        [`recent_permit_${suffix}_count`, summary.permitCount],
        [`recent_teardown_${suffix}_count`, summary.teardownCount]
      ];
    })
  );
}

function pressureSummaryForWindow(events, window) {
  const filtered = events.filter((event) => isWithinPressureWindow(event, window));
  const directPermits = filtered.filter((event) => event.event_type === "permit");
  const directTeardowns = directPermits.filter(isFullDemolitionPermitEvent);
  const nearbyTeardowns = filtered.filter((event) => event.event_type === "nearby_teardown");
  const pressureType = classifyPressureType(directPermits, directTeardowns, nearbyTeardowns);
  const permitCount = directPermits.length;
  const teardownCount = directTeardowns.length;
  return {
    pressureType,
    stabilityType: classifyStabilityType(pressureType, permitCount, teardownCount),
    score: pressureScore(permitCount, teardownCount, pressureType),
    permitCount,
    teardownCount
  };
}

function isWithinPressureWindow(event, window) {
  if (window === "all") return event.event_type !== "original_build";
  const year = event.year ?? yearFromDate(event.date);
  return year >= 2026 - window + 1 && year <= 2026;
}

function classifyPressureType(directPermits, directTeardowns, nearbyTeardowns) {
  if (directTeardowns.length > 0) return "direct_teardown";
  if (directPermits.some(isFullNewConstructionPermitEvent)) return "new_construction";
  if (nearbyTeardowns.length > 0) return "nearby_teardown";
  if (directPermits.some((event) => titleOrDescription(event).includes("addition"))) return "addition";
  if (directPermits.some((event) => /remodel|renovation|alteration|interior/.test(titleOrDescription(event)))) return "remodel";
  if (directPermits.length > 0) return "recent_permit";
  return "none";
}

function classifyStabilityType(pressureType, permitCount, teardownCount) {
  if (pressureType === "direct_teardown" || pressureType === "new_construction" || teardownCount > 0) {
    return "teardown_pressure";
  }
  if (pressureType === "nearby_teardown" || pressureType === "addition" || permitCount >= 3) return "changing";
  if (pressureType === "remodel" || pressureType === "recent_permit" || permitCount > 0) return "watch";
  return "stable";
}

function pressureScore(permitCount, teardownCount, pressureType) {
  if (pressureType === "none") return 0;
  const base = Math.min(0.72, permitCount * 0.12);
  const teardownBoost = Math.min(0.3, teardownCount * 0.1);
  const typeBoost = pressureType === "direct_teardown" ? 0.22 : pressureType === "nearby_teardown" ? 0.14 : 0.06;
  return Math.min(1, base + teardownBoost + typeBoost);
}

function isFullDemolitionPermitEvent(event) {
  const text = titleOrDescription(event);
  if (!/\b(demo|demolition|wreck|tear\s*down|teardown)\b/.test(text)) return false;
  if (/\b(chimney|fence|deck|porch|patio|driveway|pool|shed|roof|garage door)\b/.test(text)) return false;
  return /\b(single[-\s]?family|residence|home|house|dwelling|building|structure|principal|primary)\b/.test(text);
}

function isFullNewConstructionPermitEvent(event) {
  const text = titleOrDescription(event);
  if (/\b(addition|remodel|renovation|alteration|interior|garage|deck|porch|shed)\b/.test(text)) return false;
  return /\b(new construction|new single[-\s]?family|new residence|new home|new house|construct single[-\s]?family|single[-\s]?family residence)\b/.test(text);
}

function titleOrDescription(event) {
  return `${event.title ?? ""} ${event.description ?? ""}`.toLowerCase();
}

function parseJsonArray(value) {
  if (!value || typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function compactObject(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== ""));
}

function yearFromDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date.getUTCFullYear();
}

function detailPrefix(pin) {
  const normalized = String(pin).replace(/\D/g, "");
  return normalized.length >= 4 ? normalized.slice(0, 4) : "unknown";
}

function roundedGeometry(geometry) {
  if (!geometry) return geometry;
  return {
    ...geometry,
    coordinates: roundCoordinates(geometry.coordinates)
  };
}

function roundCoordinates(value) {
  if (!Array.isArray(value)) return value;
  if (typeof value[0] === "number" && typeof value[1] === "number") {
    return [roundCoordinate(value[0]), roundCoordinate(value[1])];
  }
  return value.map(roundCoordinates);
}

function roundCoordinate(value) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function roundMb(bytes) {
  return Math.round((bytes / 1024 / 1024) * 100) / 100;
}
