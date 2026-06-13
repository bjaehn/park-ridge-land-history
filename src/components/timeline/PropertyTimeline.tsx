import { Home, DollarSign, Wrench, FileText, MapPin, AlertTriangle, Star, BookOpen } from "lucide-react";
import type { HouseEvolutionEvent, HouseEvolutionEventType } from "../../lib/parcelTypes";
import { formatCurrency } from "../../lib/formatters";
import "./PropertyTimeline.css";

const EVENT_ICONS: Record<HouseEvolutionEventType, typeof Home> = {
  original_build: Home,
  sale: DollarSign,
  permit: Wrench,
  nearby_teardown: AlertTriangle,
  historic_survey: Star,
  civic_record: BookOpen,
  directory_record: BookOpen,
  sanborn_snapshot: MapPin,
  paper_trail_record: FileText,
  recognized_history: Star,
  land_family_record: FileText,
  assessment: FileText,
  appeal: AlertTriangle,
};

const EVENT_COLORS: Record<HouseEvolutionEventType, string> = {
  original_build: "#22d3ee",
  sale: "#34d399",
  permit: "#fbbf24",
  nearby_teardown: "#f87171",
  historic_survey: "#fbbf24",
  civic_record: "#60a5fa",
  directory_record: "#c4a97a",
  sanborn_snapshot: "#f4a484",
  paper_trail_record: "#a78bfa",
  recognized_history: "#fbbf24",
  land_family_record: "#c4a97a",
  assessment: "#60a5fa",
  appeal: "#a78bfa",
};

type Props = {
  events: HouseEvolutionEvent[];
};

export function PropertyTimeline({ events }: Props) {
  if (!events.length) {
    return (
      <div className="timeline-empty">
        <FileText size={24} strokeWidth={1.5} aria-hidden="true" />
        <p>No timeline events in current data</p>
      </div>
    );
  }

  const sorted = [...events].sort((a, b) => {
    const ya = a.year ?? 0;
    const yb = b.year ?? 0;
    return ya - yb;
  });

  return (
    <ol className="property-timeline" aria-label="Property history timeline">
      {sorted.map((event, i) => {
        const Icon = EVENT_ICONS[event.event_type] ?? FileText;
        const color = EVENT_COLORS[event.event_type] ?? "#22d3ee";
        const isLast = i === sorted.length - 1;

        return (
          <li key={i} className={`timeline-event timeline-${event.event_type}${isLast ? " is-last" : ""}`}>
            <div className="timeline-marker" style={{ borderColor: `${color}40`, background: `${color}14` }}>
              <Icon size={12} strokeWidth={2.5} style={{ color }} aria-hidden="true" />
              {!isLast && <div className="timeline-connector" />}
            </div>

            <div className="timeline-content">
              <div className="timeline-head">
                {event.year && (
                  <time className="timeline-year" style={{ color }}>
                    {event.year}
                  </time>
                )}
                <span className="timeline-title">{event.title}</span>
              </div>

              {event.description && (
                <p className="timeline-desc">{event.description}</p>
              )}

              {event.event_type === "sale" && event.price != null && (
                <span className="timeline-badge" style={{ color, borderColor: `${color}33`, background: `${color}12` }}>
                  {formatCurrency(event.price)}
                </span>
              )}

              {event.event_type === "assessment" && event.amount != null && (
                <span className="timeline-badge" style={{ color, borderColor: `${color}33`, background: `${color}12` }}>
                  {formatCurrency(event.amount)} assessed
                </span>
              )}

              {event.permit_number && (
                <span className="timeline-meta">Permit #{event.permit_number}</span>
              )}

              {event.status && (
                <span className="timeline-meta">Status: {event.status}</span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
