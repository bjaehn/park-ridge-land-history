import { formatCurrency } from "../lib/formatters";
import { formatEvolutionMeta, formatEvolutionYear, getHouseEvolutionTimeline } from "../lib/houseEvolution";
import type { HouseEvolutionEvent, HouseEvolutionEventType, ParcelProperties } from "../lib/parcelTypes";

type HouseStoryTimelineProps = {
  properties: ParcelProperties;
};

const eventConfig: Record<HouseEvolutionEventType, { label: string; color: string; icon: JSX.Element }> = {
  original_build: {
    label: "Built",
    color: "#f59e0b",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5z" />
      </svg>
    )
  },
  sale: {
    label: "Ownership",
    color: "#22c55e",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    )
  },
  permit: {
    label: "Permit",
    color: "#3b82f6",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    )
  },
  assessment: {
    label: "Valuation",
    color: "#a855f7",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    )
  },
  appeal: {
    label: "Appeal",
    color: "#ec4899",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    )
  },
  historic_survey: {
    label: "Survey",
    color: "#eab308",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="15" x2="15" y2="15" />
      </svg>
    )
  },
  civic_record: {
    label: "City file",
    color: "#06b6d4",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
        <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
      </svg>
    )
  },
  directory_record: {
    label: "Directory",
    color: "#8b5cf6",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      </svg>
    )
  },
  sanborn_snapshot: {
    label: "Sanborn map",
    color: "#f97316",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3 11 22 2 13 21 11 13 3 11" />
      </svg>
    )
  },
  paper_trail_record: {
    label: "Land record",
    color: "#94a3b8",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    )
  },
  recognized_history: {
    label: "Recognized",
    color: "#f59e0b",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    )
  },
  land_family_record: {
    label: "Land family",
    color: "#10b981",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    )
  },
  nearby_teardown: {
    label: "Nearby teardown",
    color: "#ef4444",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    )
  }
};

export function HouseStoryTimeline({ properties }: HouseStoryTimelineProps) {
  const allEvents = getHouseEvolutionTimeline(properties);
  const events = allEvents.filter((e) => e.event_type !== "nearby_teardown" && e.event_type !== "assessment" && e.event_type !== "appeal");

  if (events.length === 0) {
    return (
      <div className="story-timeline-empty">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5z" />
        </svg>
        <p>No timeline events recorded yet for this property.</p>
      </div>
    );
  }

  return (
    <div className="story-timeline" aria-label="House story timeline">
      {events.map((event, index) => {
        const config = eventConfig[event.event_type] ?? eventConfig.civic_record;
        const artifacts = getEventArtifacts(event, properties);
        const isLast = index === events.length - 1;
        return (
          <div
            key={`${event.event_type}-${event.date ?? event.year ?? index}`}
            className={`story-event${isLast ? " story-event-last" : ""}`}
          >
            <div className="story-event-spine">
              <div className="story-event-dot" style={{ background: config.color, boxShadow: `0 0 8px ${config.color}55` }}>
                {config.icon}
              </div>
              {!isLast && <div className="story-event-line" />}
            </div>
            <div className="story-event-card">
              <div className="story-event-header">
                <time className="story-event-year">{formatEvolutionYear(event)}</time>
                <span className="story-event-type" style={{ color: config.color, borderColor: `${config.color}30`, background: `${config.color}12` }}>
                  {config.label}
                </span>
              </div>
              <div className="story-event-title">{eventDisplayTitle(event)}</div>
              {event.description && <p className="story-event-desc">{event.description}</p>}
              {event.event_type === "sale" && event.price && (
                <div className="story-event-price">{formatCurrency(event.price)}</div>
              )}
              {event.event_type === "permit" && <PermitDetails event={event} />}
              {artifacts.length > 0 && (
                <div className="story-event-artifacts">
                  {artifacts.map((artifact) => (
                    <a key={artifact.href} href={artifact.href} target="_blank" rel="noreferrer" className="story-artifact-link">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                      {artifact.label}
                    </a>
                  ))}
                </div>
              )}
              <div className="story-event-meta">{formatEvolutionMeta(event)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PermitDetails({ event }: { event: HouseEvolutionEvent }) {
  const details = [
    event.status,
    event.job_code,
    typeof event.amount === "number" ? `Est. cost ${formatCurrency(event.amount)}` : null,
    event.permit_number ? `Permit #${event.permit_number}` : null
  ].filter(Boolean);

  if (details.length === 0) return null;
  return <p className="story-event-permit-meta">{details.join(" · ")}</p>;
}

function eventDisplayTitle(event: HouseEvolutionEvent): string {
  if (event.event_type === "sale") return "Ownership transfer";
  if (event.event_type === "civic_record") return event.title || "City file";
  if (event.event_type === "directory_record") return event.title || "Directory record";
  if (event.event_type === "sanborn_snapshot") return event.title || "Sanborn map snapshot";
  if (event.event_type === "paper_trail_record") return event.title || "Recorded land document";
  if (event.event_type === "recognized_history") return event.title || "Recognized history";
  if (event.event_type === "land_family_record") return event.title || "Land family record";
  return event.title;
}

function getEventArtifacts(event: HouseEvolutionEvent, properties: ParcelProperties): Array<{ label: string; href: string }> {
  const artifacts: Array<{ label: string; href: string }> = [];
  if (event.href) {
    artifacts.push({
      label: event.event_type === "sanborn_snapshot" ? "View map source" : "View source record",
      href: event.href
    });
  }
  if (event.event_type !== "historic_survey") return artifacts;
  if (properties.hargis_photo_url) {
    artifacts.push({
      label: (properties.hargis_photo_count ?? 0) > 1
        ? `View ${properties.hargis_photo_count} survey photos`
        : "View survey photo",
      href: properties.hargis_photo_url
    });
  }
  if (properties.hargis_pdf_url) {
    artifacts.push({
      label: (properties.hargis_pdf_count ?? 0) > 1
        ? `Open ${properties.hargis_pdf_count} survey PDFs`
        : "Open survey PDF",
      href: properties.hargis_pdf_url
    });
  }
  return artifacts;
}
