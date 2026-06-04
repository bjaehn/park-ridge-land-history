import { formatEvolutionMeta, formatEvolutionYear, getHouseEvolutionTimeline } from "../lib/houseEvolution";
import type { ParcelProperties } from "../lib/parcelTypes";

type HouseEvolutionTimelineProps = {
  properties: ParcelProperties;
};

export function HouseEvolutionTimeline({ properties }: HouseEvolutionTimelineProps) {
  const events = getHouseEvolutionTimeline(properties);

  return (
    <div className="house-evolution" aria-label="House evolution timeline">
      <h4>House evolution</h4>
      {events.length === 0 ? (
        <p className="quiet-note evolution-empty">No building or permit timeline events yet.</p>
      ) : (
        <ol className="evolution-list">
          {events.map((event, index) => (
            <li className={`evolution-event evolution-${event.event_type}`} key={`${event.event_type}-${event.date ?? event.year ?? "unknown"}-${index}`}>
              <time>{formatEvolutionYear(event)}</time>
              <div>
                <strong>{event.title}</strong>
                {event.description && <p>{event.description}</p>}
                <span>{formatEvolutionMeta(event)}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
