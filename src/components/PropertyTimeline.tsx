import { formatCurrency, formatNumber, formatYear } from "../lib/formatters";
import { formatEvolutionMeta, formatEvolutionYear, getHouseEvolutionTimeline } from "../lib/houseEvolution";
import type { HargisMediaItem, HouseEvolutionEvent, HouseEvolutionEventType, ParcelProperties } from "../lib/parcelTypes";
import { classifyParcelChangeStory } from "../lib/changeStory";
import { buildHomeSignals } from "../lib/homeSignals";

type PropertyTimelineProps = {
  properties: ParcelProperties;
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

export function PropertyTimeline({ properties }: PropertyTimelineProps) {
  const allEvents = getHouseEvolutionTimeline(properties);
  const events = allEvents.filter((e) => e.event_type !== "nearby_teardown");
  const changeStory = classifyParcelChangeStory(properties);
  const signals = buildHomeSignals(properties);
  const photos = getPhotos(properties);
  const hasFinancialHistory =
    properties.first_assessed_year && properties.latest_assessed_year &&
    properties.first_assessed_year !== properties.latest_assessed_year &&
    properties.first_assessed_total && properties.latest_assessed_total;

  return (
    <div className="pt-root">

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
          <strong>{formatCurrency(properties.latest_assessed_total) !== "Unknown" ? formatCurrency(properties.latest_assessed_total) : "—"}</strong>
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

      {/* Value history — shown after timeline if we have a trend */}
      {hasFinancialHistory && (
        <div className="pt-value-section">
          <div className="pt-section-subheading">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
            </svg>
            Assessment trend
          </div>
          <ValueTrend properties={properties} />
        </div>
      )}

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

function ValueTrend({ properties }: { properties: ParcelProperties }) {
  const first = properties.first_assessed_total!;
  const latest = properties.latest_assessed_total!;
  const isUp = latest >= first;
  const wider = Math.max(first, latest);
  const firstPct = Math.round((first / wider) * 100);
  const latestPct = Math.round((latest / wider) * 100);
  const changePct = properties.assessed_value_change_pct;

  return (
    <div className="pt-value-bars">
      <div className="pt-vbar-row">
        <span className="pt-vbar-year">{properties.first_assessed_year}</span>
        <div className="pt-vbar-track">
          <div className="pt-vbar pt-vbar-first" style={{ width: `${firstPct}%` }} />
        </div>
        <span className="pt-vbar-amt">{formatCurrency(first)}</span>
      </div>
      <div className="pt-vbar-row">
        <span className="pt-vbar-year pt-vbar-year-latest">{properties.latest_assessed_year}</span>
        <div className="pt-vbar-track">
          <div className="pt-vbar pt-vbar-latest" style={{ width: `${latestPct}%` }} />
        </div>
        <span className="pt-vbar-amt pt-vbar-amt-latest">{formatCurrency(latest)}</span>
      </div>
      {typeof changePct === "number" && !Number.isNaN(changePct) && (
        <div className={`pt-vbar-change ${isUp ? "pt-vbc-up" : "pt-vbc-down"}`}>
          {isUp ? "▲" : "▼"} {Math.abs(Math.round(changePct))}% change over {(properties.latest_assessed_year! - properties.first_assessed_year!)} years
        </div>
      )}
    </div>
  );
}

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
