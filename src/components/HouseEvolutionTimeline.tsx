import { formatEvolutionMeta, formatEvolutionYear, getHouseEvolutionTimeline } from "../lib/houseEvolution";
import type { HouseEvolutionEvent, ParcelProperties } from "../lib/parcelTypes";

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
          {events.map((event, index) => {
            const artifacts = eventArtifacts(event, properties);
            return (
              <li className={`evolution-event evolution-${event.event_type}`} key={`${event.event_type}-${event.date ?? event.year ?? "unknown"}-${index}`}>
                <time>{formatEvolutionYear(event)}</time>
                <div>
                  <strong>{eventTitle(event)}</strong>
                  {event.description && <p>{event.description}</p>}
                  {artifacts.length > 0 && (
                    <div className="evolution-artifacts" aria-label="Timeline evidence">
                      {artifacts.map((artifact) => (
                        <a href={artifact.href} key={artifact.href} rel="noreferrer" target="_blank">
                          {artifact.label}
                        </a>
                      ))}
                    </div>
                  )}
                  <span>{formatEvolutionMeta(event)}</span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function eventTitle(event: HouseEvolutionEvent): string {
  if (event.event_type === "sale") return "Ownership change record";
  return event.title;
}

function eventArtifacts(event: HouseEvolutionEvent, properties: ParcelProperties): Array<{ label: string; href: string }> {
  if (event.event_type !== "historic_survey") return [];
  const artifacts = [];
  if (properties.hargis_photo_url) {
    const photoCount = properties.hargis_photo_count ?? 0;
    artifacts.push({
      label: photoCount > 1 ? `View ${photoCount.toLocaleString()} survey photos` : "View survey photo",
      href: properties.hargis_photo_url
    });
  }
  if (properties.hargis_pdf_url) {
    const pdfCount = properties.hargis_pdf_count ?? 0;
    artifacts.push({
      label: pdfCount > 1 ? `Open ${pdfCount.toLocaleString()} survey PDFs` : "Open survey PDF",
      href: properties.hargis_pdf_url
    });
  }
  return artifacts;
}
