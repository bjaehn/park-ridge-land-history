import { formatEvolutionMeta, formatEvolutionYear, getHouseEvolutionTimeline } from "../lib/houseEvolution";
import { formatCurrency } from "../lib/formatters";
import type { HouseEvolutionEvent, ParcelProperties } from "../lib/parcelTypes";

type HouseEvolutionTimelineProps = {
  properties: ParcelProperties;
};

export function HouseEvolutionTimeline({ properties }: HouseEvolutionTimelineProps) {
  const events = getHouseEvolutionTimeline(properties).filter((event) => event.event_type !== "nearby_teardown");

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
                  {event.event_type === "permit" && <PermitDetailsDisclosure event={event} />}
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

function PermitDetailsDisclosure({ event }: { event: HouseEvolutionEvent }) {
  const details = [
    ["Cook County permit", event.permit_number],
    ["Local permit", event.local_permit_number],
    ["Status", event.status],
    ["Assessable", event.assessable],
    ["Job type", event.job_code],
    ["Estimated cost", typeof event.amount === "number" ? formatCurrency(event.amount) : null],
    ["Issued", formatDateLabel(event.date)],
    ["Est. completion", formatDateLabel(event.estimated_completion_date)]
  ].filter((detail): detail is [string, string] => Boolean(detail[1]));

  if (details.length === 0) return null;

  return (
    <details className="permit-details">
      <summary>Permit details</summary>
      <dl className="permit-detail-grid" aria-label="Permit details">
        {details.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

function eventTitle(event: HouseEvolutionEvent): string {
  if (event.event_type === "sale") return "Ownership change record";
  if (event.event_type === "civic_record") return "City file";
  if (event.event_type === "directory_record") return "Directory clue";
  if (event.event_type === "sanborn_snapshot") return "Sanborn map";
  return event.title;
}

function formatDateLabel(value?: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return value;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function eventArtifacts(event: HouseEvolutionEvent, properties: ParcelProperties): Array<{ label: string; href: string }> {
  const artifacts = [];
  if (event.href) {
    artifacts.push({
      label: event.event_type === "sanborn_snapshot" ? "Open map source" : "Open source record",
      href: event.href
    });
  }
  if (event.event_type !== "historic_survey") return artifacts;
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
