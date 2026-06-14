import type { ReactNode } from "react";
import { formatCurrency, formatNumber, formatYear } from "../lib/formatters";
import { formatEvolutionMeta, formatEvolutionYear, getHouseEvolutionTimeline } from "../lib/houseEvolution";
import type { HargisMediaItem, HouseEvolutionEvent, HouseEvolutionEventType, ParcelFeature, ParcelProperties } from "../lib/parcelTypes";
import { classifyParcelChangeStory } from "../lib/changeStory";
import { buildHomeSignals } from "../lib/homeSignals";
import { WhatWeKnowCard } from "./cards/WhatWeKnowCard";
import { ComparisonCard } from "./cards/ComparisonCard";
import { DataCaveat } from "./cards/DataCaveat";

type PropertyTimelineProps = {
  properties: ParcelProperties;
  parcel?: ParcelFeature | null;
  blockParcels?: ParcelFeature[];
  neighborhoodParcels?: ParcelFeature[];
  allParcels?: ParcelFeature[];
};

// ─── Event config: color, icon, label, size ──────────────────────────────────

type EventSize = "landmark" | "major" | "standard" | "minor";

type EventConfig = {
  label: string;
  color: string;
  size: EventSize;
  icon: JSX.Element;
};

const cfg: Record<HouseEvolutionEventType, EventConfig> = {
  original_build: {
    label: "Built", color: "#f59e0b", size: "landmark",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5z" /><polyline points="9 21 9 12 15 12 15 21" /></svg>
  },
  sale: {
    label: "Ownership", color: "#22c55e", size: "major",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>
  },
  permit: {
    label: "Permit", color: "#3b82f6", size: "major",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 12l2 2 4-4" /></svg>
  },
  assessment: {
    label: "Valuation", color: "#a78bfa", size: "minor",
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
  },
  appeal: {
    label: "Appeal", color: "#ec4899", size: "minor",
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
  },
  historic_survey: {
    label: "Survey", color: "#eab308", size: "major",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
  },
  recognized_history: {
    label: "Landmark", color: "#f59e0b", size: "major",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
  },
  civic_record: {
    label: "City file", color: "#06b6d4", size: "standard",
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></svg>
  },
  directory_record: {
    label: "Directory", color: "#8b5cf6", size: "minor",
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>
  },
  sanborn_snapshot: {
    label: "Sanborn", color: "#f97316", size: "standard",
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>
  },
  paper_trail_record: {
    label: "Land record", color: "#94a3b8", size: "minor",
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
  },
  land_family_record: {
    label: "Land family", color: "#10b981", size: "minor",
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 10-16 0" /></svg>
  },
  nearby_teardown: {
    label: "Nearby teardown", color: "#ef4444", size: "minor",
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
  }
};

// ─── Main component ───────────────────────────────────────────────────────────

export function PropertyTimeline({ properties, parcel, blockParcels = [], neighborhoodParcels = [], allParcels = [] }: PropertyTimelineProps) {
  const allEvents = getHouseEvolutionTimeline(properties);
  const events = allEvents.filter((e) => e.event_type !== "nearby_teardown");
  const changeStory = classifyParcelChangeStory(properties);
  const signals = buildHomeSignals(properties);
  const photos = getPhotos(properties);

  return (
    <div className="pt-root">

      {/* What we know summary */}
      <WhatWeKnowCard properties={properties} />

      {/* Quick stat strip */}
      <div className="pt-stat-strip">
        <div className="pt-stat">
          <span>Built</span>
          <strong>{formatYear(properties.year_built)}</strong>
        </div>
        <div className="pt-stat-divider" />
        <div className="pt-stat">
          <span>Sales</span>
          <strong>{formatNumber(properties.sale_count ?? 0)}</strong>
        </div>
        <div className="pt-stat-divider" />
        <div className="pt-stat">
          <span>Permits</span>
          <strong>{formatNumber(properties.permit_count ?? 0)}</strong>
        </div>
        <div className="pt-stat-divider" />
        <div className="pt-stat">
          <span>Assessed</span>
          <strong>{formatCurrency(properties.latest_assessed_total) !== "Unknown" ? formatCurrency(properties.latest_assessed_total) : "N/A"}</strong>
        </div>
        {properties.assessed_value_change_pct != null && (
          <>
            <div className="pt-stat-divider" />
            <div className={`pt-stat pt-stat-trend ${properties.assessed_value_change_pct >= 0 ? "pt-trend-up" : "pt-trend-down"}`}>
              <span>Change</span>
              <strong>{properties.assessed_value_change_pct >= 0 ? "+" : ""}{Math.round(properties.assessed_value_change_pct)}%</strong>
            </div>
          </>
        )}
      </div>

      {/* Narrative intro */}
      <div className="pt-narrative-intro">
        <p>{buildNarrative(properties)}</p>
      </div>

      {/* Change story callout */}
      <div className={`pt-change-callout pt-change-callout-${changeStory.type}`}>
        <span className="pt-change-label">{changeStory.label}</span>
        <p className="pt-change-body">{changeStory.title}</p>
      </div>

      {/* Comparisons vs block, neighborhood, city */}
      {parcel && (
        <ComparisonCard
          parcel={parcel}
          blockParcels={blockParcels}
          neighborhoodParcels={neighborhoodParcels}
          allParcels={allParcels}
        />
      )}

      {/* THE TIMELINE */}
      <div className="pt-timeline-section">
        <div className="pt-timeline-heading">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="20" x2="12" y2="4" /><polyline points="6 10 12 4 18 10" /><line x1="6" y1="20" x2="18" y2="20" />
          </svg>
          Life of this home
          <span className="pt-timeline-count">{events.length} events</span>
        </div>

        {events.length === 0 ? (
          <p className="pt-empty-note">No timeline events recorded yet for this property.</p>
        ) : (
          <div className="pt-events">
            {events.map((event, index) => (
              <TimelineEvent
                key={`${event.event_type}-${event.year ?? event.date ?? index}`}
                event={event}
                properties={properties}
                photos={photos}
                isLast={index === events.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* Value charts — two separate panels */}
      <div className="pt-value-section">
        <div className="pt-section-subheading">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          Value history
        </div>
        <div className="pt-value-charts">
          <div className="pt-chart-block">
            <div className="pt-chart-title">Sale prices</div>
            <SalePriceChart events={events} />
            <DataCaveat caveatKey="sales_non_market" />
          </div>
          <div className="pt-chart-block">
            <div className="pt-chart-title">Assessed value</div>
            <AssessedValueChart properties={properties} />
            <DataCaveat caveatKey="assessment_not_market" />
          </div>
        </div>
      </div>

      {/* Home signals */}
      {signals.length > 0 && (
        <div className="pt-signals-section">
          <div className="pt-section-subheading">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            Signals
          </div>
          <div className="pt-signals-grid">
            {signals.map((signal) => (
              <div key={signal.id} className={`pt-signal pt-signal-${signal.tone}`}>
                <strong>{signal.label}</strong>
                <span>{signal.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

// ─── Timeline event node ──────────────────────────────────────────────────────

function TimelineEvent({
  event, properties, photos, isLast
}: {
  event: HouseEvolutionEvent;
  properties: ParcelProperties;
  photos: HargisMediaItem[];
  isLast: boolean;
}) {
  const config = cfg[event.event_type] ?? cfg.civic_record;
  const { size, color } = config;
  const artifacts = getEventArtifacts(event, properties);
  const showPhotosHere = event.event_type === "historic_survey" && photos.length > 0;

  return (
    <div className={`pt-event pt-event-${size}`}>
      {/* Spine */}
      <div className="pt-event-spine">
        <div
          className={`pt-event-dot pt-dot-${size}`}
          style={{
            background: size === "minor" ? "transparent" : color,
            borderColor: color,
            boxShadow: size !== "minor" ? `0 0 ${size === "landmark" ? 14 : 8}px ${color}55` : "none",
            color: size === "minor" ? color : "#000"
          }}
        >
          {config.icon}
        </div>
        {!isLast && <div className="pt-event-line" style={{ background: size === "landmark" ? `${color}30` : undefined }} />}
      </div>

      {/* Content */}
      <div className="pt-event-content">
        <div className="pt-event-header">
          <time className="pt-event-year">{formatEvolutionYear(event)}</time>
          <span
            className="pt-event-badge"
            style={{ color, background: `${color}14`, borderColor: `${color}30` }}
          >
            {config.label}
          </span>
          {/* Inline price for ownership events */}
          {event.event_type === "sale" && event.price && (
            <span className="pt-event-price-inline">{formatCurrency(event.price)}</span>
          )}
          {/* Inline value for assessment events */}
          {event.event_type === "assessment" && (
            <span className="pt-event-assess-inline">
              {properties.latest_assessed_total && formatCurrency(properties.latest_assessed_total)}
            </span>
          )}
        </div>

        {/* Card body — only for non-minor or if has real content */}
        {(size !== "minor" || event.description) && (
          <div className={`pt-event-card pt-ecard-${size}`}>
            <div className="pt-event-title">{getDisplayTitle(event)}</div>
            {event.description && <p className="pt-event-desc">{event.description}</p>}
            {event.event_type === "permit" && (
              <div className="pt-event-permit-row">
                {event.job_code && <span className="pt-permit-tag">{event.job_code}</span>}
                {event.status && <span className="pt-permit-tag">{event.status}</span>}
                {typeof event.amount === "number" && event.amount > 0 && (
                  <span className="pt-permit-cost">Est. {formatCurrency(event.amount)}</span>
                )}
              </div>
            )}
            {showPhotosHere && (
              <div className="pt-survey-photos">
                {photos.slice(0, 4).map((photo, i) => (
                  <a
                    key={i}
                    href={photo.url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="pt-survey-photo"
                  >
                    <img src={photo.url || ""} alt={photo.label || `Survey photo ${i + 1}`} loading="lazy" />
                  </a>
                ))}
              </div>
            )}
            {artifacts.length > 0 && (
              <div className="pt-event-artifacts">
                {artifacts.map((a) => (
                  <a key={a.href} href={a.href} target="_blank" rel="noreferrer" className="pt-artifact-link">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    {a.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
        {/* For minor events without description, show a short meta line */}
        {size === "minor" && !event.description && (
          <div className="pt-event-title pt-event-title-minor">{getDisplayTitle(event)}</div>
        )}
        {/* Source meta — very quiet */}
        {(event.source || event.permit_number || event.document_number) && (
          <div className="pt-event-source">{formatEvolutionMeta(event)}</div>
        )}
      </div>
    </div>
  );
}

// ─── Inline value trend ────────────────────────────────────────────────────────

// ─── Shared chart constants ────────────────────────────────────────────────────

const CW = 300, CH = 104;
const CPAD = { t: 16, r: 10, b: 24, l: 48 };
const CFS = 7;

function chartAxes(pts: Array<{ year: number; value: number }>) {
  const allYears = pts.map(p => p.year);
  const allValues = pts.map(p => p.value);
  const minYear = Math.min(...allYears) - 1;
  const maxYear = Math.max(...allYears) + 2;
  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const vRange = rawMax - rawMin || rawMax * 0.4;
  const minVal = Math.max(0, rawMin - vRange * 0.18);
  const maxVal = rawMax + vRange * 0.18;
  const iW = CW - CPAD.l - CPAD.r;
  const iH = CH - CPAD.t - CPAD.b;
  const xp = (y: number) => CPAD.l + ((y - minYear) / Math.max(maxYear - minYear, 1)) * iW;
  const yp = (v: number) => CPAD.t + (1 - (v - minVal) / Math.max(maxVal - minVal, 1)) * iH;
  const fmt = (v: number) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${Math.round(v / 1_000)}k`;
  const yTicks = [rawMin, rawMax];
  const xSpan = maxYear - minYear;
  const xStep = xSpan <= 8 ? 2 : xSpan <= 16 ? 4 : xSpan <= 25 ? 5 : 10;
  const xStart = Math.ceil(minYear / xStep) * xStep;
  const xTicks: number[] = [];
  for (let y = xStart; y <= maxYear; y += xStep) xTicks.push(y);
  return { xp, yp, fmt, yTicks, xTicks };
}

function ChartScaffold({ children, label }: { children: ReactNode; label: string }) {
  return (
    <svg viewBox={`0 0 ${CW} ${CH}`} className="pt-value-chart" aria-label={label} role="img">
      {children}
    </svg>
  );
}

// ─── Sale price chart ──────────────────────────────────────────────────────────

function SalePriceChart({ events }: { events: HouseEvolutionEvent[] }) {
  const pts = events
    .filter((e): e is HouseEvolutionEvent & { year: number; price: number } =>
      e.event_type === "sale" && e.year != null && typeof e.price === "number" && e.price > 0
    )
    .sort((a, b) => a.year - b.year)
    .map(e => ({ year: e.year, value: e.price }));

  if (pts.length === 0) return <p className="pt-chart-empty">No recorded sale prices</p>;

  const { xp, yp, fmt, yTicks, xTicks } = chartAxes(pts);
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${xp(p.year).toFixed(1)} ${yp(p.value).toFixed(1)}`).join(" ");
  const fillPath = pts.length >= 2
    ? `${linePath} L ${xp(pts[pts.length - 1].year).toFixed(1)} ${(CH - CPAD.b).toFixed(1)} L ${xp(pts[0].year).toFixed(1)} ${(CH - CPAD.b).toFixed(1)} Z`
    : null;

  return (
    <ChartScaffold label="Sale price history">
      <defs>
        <linearGradient id="saleGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>
      </defs>
      {yTicks.map((v, i) => (
        <line key={i} x1={CPAD.l} y1={yp(v)} x2={CW - CPAD.r} y2={yp(v)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      ))}
      {yTicks.map((v, i) => (
        <text key={i} x={CPAD.l - 5} y={yp(v) + 3.5} textAnchor="end" fill="rgba(255,255,255,0.30)" fontSize={CFS}>{fmt(v)}</text>
      ))}
      <line x1={CPAD.l} y1={CH - CPAD.b} x2={CW - CPAD.r} y2={CH - CPAD.b} stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
      {xTicks.map((y, i) => (
        <text key={i} x={xp(y)} y={CH - CPAD.b + 12} textAnchor="middle" fill="rgba(255,255,255,0.28)" fontSize={CFS}>{y}</text>
      ))}
      {fillPath && <path d={fillPath} fill="url(#saleGrad)" />}
      {pts.length >= 2 && <path d={linePath} stroke="#22d3ee" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />}
      {pts.map((pt, i) => {
        const isFirst = i === 0;
        const isLast = i === pts.length - 1;
        const showLabel = pts.length === 1 || isFirst || isLast;
        const anchorFirst = isFirst && pts.length > 1 ? "start" : isLast && pts.length > 1 ? "end" : "middle";
        return (
          <g key={i}>
            <circle cx={xp(pt.year)} cy={yp(pt.value)} r={pts.length > 3 ? 2.5 : 3} fill="#22d3ee" opacity="0.90" />
            {showLabel && (
              <text x={xp(pt.year)} y={yp(pt.value) - 5} textAnchor={anchorFirst} fill="#67e8f9" fontSize={CFS}>{fmt(pt.value)}</text>
            )}
          </g>
        );
      })}
    </ChartScaffold>
  );
}

// ─── Assessed value chart ──────────────────────────────────────────────────────

function AssessedValueChart({ properties }: { properties: ParcelProperties }) {
  const raw = properties.assessed_value_timeline;
  let pts: Array<{ year: number; value: number }> = [];

  if (raw) {
    const parsed = Array.isArray(raw) ? raw : tryParseJson<Array<{ year: number; value: number }>>(raw as string);
    if (parsed) pts = parsed.filter(p => p.year && p.value > 0).sort((a, b) => a.year - b.year);
  }

  if (pts.length === 0) {
    if (properties.first_assessed_year && properties.first_assessed_total)
      pts.push({ year: properties.first_assessed_year, value: properties.first_assessed_total });
    if (properties.latest_assessed_year && properties.latest_assessed_total &&
        properties.latest_assessed_year !== (pts[0]?.year ?? -1))
      pts.push({ year: properties.latest_assessed_year, value: properties.latest_assessed_total });
  }

  if (pts.length === 0) return <p className="pt-chart-empty">No assessment records</p>;

  const { xp, yp, fmt, yTicks, xTicks } = chartAxes(pts);
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${xp(p.year).toFixed(1)} ${yp(p.value).toFixed(1)}`).join(" ");
  const fillPath = pts.length >= 2
    ? `${linePath} L ${xp(pts[pts.length - 1].year).toFixed(1)} ${(CH - CPAD.b).toFixed(1)} L ${xp(pts[0].year).toFixed(1)} ${(CH - CPAD.b).toFixed(1)} Z`
    : null;

  const dense = pts.length > 5;
  const dotR = dense ? 1.5 : 3;
  const labelYears = new Set<number>();
  if (pts.length > 0) labelYears.add(pts[0].year);
  if (pts.length > 1) {
    const last = pts[pts.length - 1];
    const first = pts[0];
    const { xp: _xp } = chartAxes(pts);
    if (!dense || Math.abs(_xp(last.year) - _xp(first.year)) > 36) {
      labelYears.add(last.year);
    }
  }

  return (
    <ChartScaffold label="Assessed value history">
      <defs>
        <linearGradient id="assessGrad2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
        </linearGradient>
      </defs>
      {yTicks.map((v, i) => (
        <line key={i} x1={CPAD.l} y1={yp(v)} x2={CW - CPAD.r} y2={yp(v)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      ))}
      {yTicks.map((v, i) => (
        <text key={i} x={CPAD.l - 5} y={yp(v) + 3.5} textAnchor="end" fill="rgba(255,255,255,0.30)" fontSize={CFS}>{fmt(v)}</text>
      ))}
      <line x1={CPAD.l} y1={CH - CPAD.b} x2={CW - CPAD.r} y2={CH - CPAD.b} stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
      {xTicks.map((y, i) => (
        <text key={i} x={xp(y)} y={CH - CPAD.b + 12} textAnchor="middle" fill="rgba(255,255,255,0.28)" fontSize={CFS}>{y}</text>
      ))}
      {fillPath && <path d={fillPath} fill="url(#assessGrad2)" />}
      {pts.length >= 2 && <path d={linePath} stroke="#a78bfa" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />}
      {pts.map((pt, i) => (
        <g key={i}>
          <circle cx={xp(pt.year)} cy={yp(pt.value)} r={dotR} fill="#a78bfa" opacity="0.90" />
          {labelYears.has(pt.year) && (
            <text x={xp(pt.year)} y={yp(pt.value) - 6} textAnchor="middle" fill="#c4b5fd" fontSize={CFS}>{fmt(pt.value)}</text>
          )}
        </g>
      ))}
    </ChartScaffold>
  );
}

// ─── OLD (unused) value vs sale chart ─────────────────────────────────────────

// ─── Helpers ───────────────────────────────────────────────────────────────────

function buildNarrative(properties: ParcelProperties): string {
  const parts: string[] = [];
  const year = formatYear(properties.year_built);
  parts.push(year === "Unknown" ? "Build year not yet confirmed" : `Built around ${year}`);

  const saleCount = properties.sale_count ?? 0;
  if (saleCount === 0) {
    parts.push("no market sale record found since 1999");
  } else {
    const latestYear = properties.latest_sale_year;
    const latestPrice = formatCurrency(properties.latest_sale_price);
    const priceText = latestPrice !== "Unknown" ? ` for ${latestPrice}` : "";
    const yearText = latestYear ? `, last in ${latestYear}${priceText}` : "";
    parts.push(`${saleCount === 1 ? "sold once" : `sold ${saleCount} times`} since 1999${yearText}`);
  }

  const permitCount = properties.permit_count ?? 0;
  if (permitCount > 0) {
    const latestPermit = properties.latest_permit_year ? ` through ${properties.latest_permit_year}` : "";
    parts.push(`${permitCount} permit record${permitCount === 1 ? "" : "s"} on file${latestPermit}`);
  }

  if (properties.hargis_record_count) {
    const style = properties.hargis_arch_class ? ` (${properties.hargis_arch_class})` : "";
    parts.push(`appears in the Illinois historic survey${style}`);
  }

  const latestValue = formatCurrency(properties.latest_assessed_total);
  if (latestValue !== "Unknown") {
    const latestYear = properties.latest_assessed_year ? ` in ${properties.latest_assessed_year}` : "";
    const change = properties.assessed_value_change_pct != null
      ? `; ${Math.round(properties.assessed_value_change_pct) >= 0 ? "+" : ""}${Math.round(properties.assessed_value_change_pct)}% since ${properties.first_assessed_year ?? "first record"}`
      : "";
    parts.push(`assessed at ${latestValue}${latestYear}${change}`);
  }

  return parts.join("; ") + ".";
}

function getDisplayTitle(event: HouseEvolutionEvent): string {
  if (event.event_type === "sale") return "Ownership transfer";
  if (event.event_type === "assessment") return "Assessed value record";
  if (event.event_type === "appeal") return "Assessment appeal";
  if (event.event_type === "civic_record") return event.title || "City file";
  if (event.event_type === "directory_record") return event.title || "Directory listing";
  if (event.event_type === "sanborn_snapshot") return event.title || "Sanborn map reference";
  if (event.event_type === "paper_trail_record") return event.title || "Recorded land document";
  if (event.event_type === "recognized_history") return event.title || "Recognized history";
  if (event.event_type === "land_family_record") return event.title || "Land family record";
  return event.title;
}

function getEventArtifacts(event: HouseEvolutionEvent, properties: ParcelProperties): Array<{ label: string; href: string }> {
  const out: Array<{ label: string; href: string }> = [];
  if (event.href) {
    out.push({ label: event.event_type === "sanborn_snapshot" ? "View map source" : "View source record", href: event.href });
  }
  if (event.event_type !== "historic_survey") return out;
  if (properties.hargis_photo_url) {
    out.push({ label: (properties.hargis_photo_count ?? 0) > 1 ? `${properties.hargis_photo_count} survey photos` : "Survey photo", href: properties.hargis_photo_url });
  }
  if (properties.hargis_pdf_url) {
    out.push({ label: (properties.hargis_pdf_count ?? 0) > 1 ? `${properties.hargis_pdf_count} survey PDFs` : "Survey PDF", href: properties.hargis_pdf_url });
  }
  return out;
}

function getPhotos(properties: ParcelProperties): HargisMediaItem[] {
  const raw = properties.hargis_photos_json;
  if (!raw) {
    return properties.hargis_photo_url
      ? [{ type: "photo", url: properties.hargis_photo_url, label: "Historic survey photo" }]
      : [];
  }
  const items = Array.isArray(raw) ? raw : tryParseJson<HargisMediaItem[]>(raw) ?? [];
  const valid = items.filter((i): i is HargisMediaItem => Boolean(i?.url));
  return valid.length > 0 ? valid : (properties.hargis_photo_url ? [{ type: "photo", url: properties.hargis_photo_url, label: "Historic survey photo" }] : []);
}

function tryParseJson<T>(value: string): T | null {
  try { return JSON.parse(value) as T; } catch { return null; }
}
