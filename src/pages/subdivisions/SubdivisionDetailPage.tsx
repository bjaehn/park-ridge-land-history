import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ROUTES, propertyPath } from "../../routes/routeConfig";
import {
  fetchSubdivisionById,
  fetchParcelsInSubdivision,
} from "../../lib/supabase/subdivisionQueries";
import { ConfidenceBadge } from "../../components/cards/ConfidenceBadge";
import { SourceBadge } from "../../components/cards/SourceBadge";
import {
  toConfidenceBadgeLevel,
  confidenceLevelLabel,
  confidenceLevelDescription,
  recordedYearDisplay,
} from "../../lib/subdivisionTypes";
import type {
  SubdivisionWithDetail,
  SubdivisionTimelineEvent,
} from "../../lib/subdivisionTypes";

type ParcelRow = {
  pin: string;
  address: string | null;
  year_built: number | null;
  lot_number: string | null;
  block_number: string | null;
};

export function SubdivisionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const decodedId = id ? decodeURIComponent(id) : null;

  const [subdivision, setSubdivision] = useState<SubdivisionWithDetail | null>(null);
  const [parcels, setParcels] = useState<ParcelRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingParcels, setIsLoadingParcels] = useState(false);

  useEffect(() => {
    if (!decodedId) return;
    setIsLoading(true);
    fetchSubdivisionById(decodedId).then((data) => {
      setSubdivision(data);
      setIsLoading(false);
      if (data?.id) {
        setIsLoadingParcels(true);
        fetchParcelsInSubdivision(data.id, 50).then((rows) => {
          setParcels(rows);
          setIsLoadingParcels(false);
        });
      }
    });
  }, [decodedId]);

  if (!decodedId) {
    return <NotFoundState message="No subdivision ID provided." />;
  }

  if (!isLoading && !subdivision) {
    return (
      <NotFoundState
        message={`No subdivision found for ID: ${decodedId}`}
        hint="The subdivision may not yet be in the database, or the ID may be incorrect."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="content-page">
        <div className="content-page-inner">
          <div className="page-loading">Loading subdivision…</div>
        </div>
      </div>
    );
  }

  const s = subdivision!;
  const badgeLevel = toConfidenceBadgeLevel(s.confidence_level);
  const badgeLabel = confidenceLevelLabel(s.confidence_level);
  const confidenceDesc = confidenceLevelDescription(s.confidence_level);

  return (
    <div className="content-page">
      <div className="content-page-inner">
        {/* Breadcrumb */}
        <nav className="page-breadcrumb" aria-label="Breadcrumb">
          <Link to={ROUTES.city.path}>Park Ridge</Link>
          <span aria-hidden="true">›</span>
          <Link to={ROUTES.subdivisions.path}>Subdivisions</Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">{s.name}</span>
        </nav>

        {/* Hero card */}
        <header className="subdivision-hero">
          <div className="subdivision-hero-inner">
            <p className="subdivision-hero-eyebrow">Park Ridge Subdivision</p>
            <h1 className="subdivision-hero-title">{s.name}</h1>
            <p className="subdivision-hero-subtitle">
              {recordedYearDisplay(s.recorded_year)}
              {s.original_owner ? ` · ${s.original_owner}` : ""}
              {(s.parcel_count ?? 0) > 0
                ? ` · ~${(s.parcel_count ?? 0).toLocaleString()} current parcels`
                : ""}
            </p>
            <div className="subdivision-hero-badges">
              <ConfidenceBadge
                level={badgeLevel}
                label={badgeLabel}
                explanation={s.confidence_reason ?? confidenceDesc}
              />
              {s.source_name && <SourceBadge source={s.source_name} url={s.source_url ?? undefined} />}
            </div>
          </div>
        </header>

        {/* What we know */}
        <section className="subdivision-section">
          <h2 className="subdivision-section-title">What this subdivision tells us</h2>
          <SubdivisionNarrative subdivision={s} />
        </section>

        {/* Known facts */}
        <section className="subdivision-section">
          <h2 className="subdivision-section-title">Known details</h2>
          <dl className="subdivision-facts">
            <SubdivisionFact label="Recorded year" value={s.recorded_year?.toString() ?? null} unknown="Not yet confirmed" />
            <SubdivisionFact label="Original owner / developer" value={s.original_owner ?? s.developer ?? null} unknown="Not yet found" />
            <SubdivisionFact label="Surveyor" value={s.surveyor} unknown="Not yet found" />
            <SubdivisionFact label="Plat book" value={s.plat_book} unknown="Not yet found" />
            <SubdivisionFact label="Plat page" value={s.plat_page} unknown="Not yet found" />
            <SubdivisionFact label="Document number" value={s.document_number} unknown="Not yet found" />
          </dl>
        </section>

        {/* Timeline */}
        {(s.timeline_events ?? []).length > 0 && (
          <section className="subdivision-section">
            <h2 className="subdivision-section-title">Timeline</h2>
            <SubdivisionTimeline events={s.timeline_events!} />
          </section>
        )}

        {/* Homes in this subdivision */}
        <section className="subdivision-section">
          <h2 className="subdivision-section-title">Homes in this subdivision</h2>
          {isLoadingParcels ? (
            <div className="page-loading">Loading properties…</div>
          ) : parcels.length === 0 ? (
            <p className="subdivision-no-parcels">
              No properties have been linked to this subdivision yet.
              This may change as the data pipeline is refined.
            </p>
          ) : (
            <>
              <p className="subdivision-parcels-note">
                Showing up to 50 properties linked to this subdivision.
              </p>
              <div className="subdivision-parcels-list">
                {parcels
                  .sort((a, b) => (a.address ?? "").localeCompare(b.address ?? ""))
                  .map((p) => (
                    <ParcelRow key={p.pin} parcel={p} />
                  ))}
              </div>
            </>
          )}
        </section>

        {/* Sources and confidence */}
        <section className="subdivision-section">
          <h2 className="subdivision-section-title">Sources and confidence</h2>
          <div className="subdivision-sources-body">
            <p>
              <strong>Confidence level:</strong> {badgeLabel} —{" "}
              {s.confidence_reason ?? confidenceDesc}
            </p>
            {s.source_name && (
              <p>
                <strong>Source:</strong>{" "}
                {s.source_url ? (
                  <a href={s.source_url} target="_blank" rel="noreferrer">
                    {s.source_name}
                  </a>
                ) : (
                  s.source_name
                )}
                {s.source_reference && ` — ${s.source_reference}`}
              </p>
            )}
            {(s.sources ?? []).length > 0 && (
              <ul className="subdivision-source-list">
                {s.sources!.map((src) => (
                  <li key={src.id}>
                    <strong>{src.source_type ?? "Source"}:</strong>{" "}
                    {src.source_url ? (
                      <a href={src.source_url} target="_blank" rel="noreferrer">
                        {src.source_name}
                      </a>
                    ) : (
                      src.source_name
                    )}
                    {src.source_reference && ` (${src.source_reference})`}
                  </li>
                ))}
              </ul>
            )}
            <p className="subdivision-source-caveat">
              <Link to={ROUTES.sources.path}>
                See full data sources and methodology →
              </Link>
            </p>
          </div>
        </section>

        {/* What we don't know yet */}
        <section className="subdivision-section">
          <h2 className="subdivision-section-title">What is still missing</h2>
          <UnknownsList subdivision={s} />
        </section>

        {s.notes && (
          <section className="subdivision-section">
            <h2 className="subdivision-section-title">Notes</h2>
            <p className="subdivision-notes">{s.notes}</p>
          </section>
        )}
      </div>
    </div>
  );
}

function SubdivisionNarrative({ subdivision: s }: { subdivision: SubdivisionWithDetail }) {
  const parts: string[] = [];

  if (s.recorded_year) {
    parts.push(
      `${s.name} was recorded${s.recorded_year ? ` in ${s.recorded_year}` : ""}, helping shape the street and lot pattern in this part of Park Ridge.`
    );
  } else {
    parts.push(
      `${s.name} is a recorded subdivision in Park Ridge, Illinois. The exact recording date has not yet been confirmed.`
    );
  }

  if (s.original_owner) {
    parts.push(`It was developed by ${s.original_owner}.`);
  }

  if ((s.parcel_count ?? 0) > 0) {
    parts.push(
      `Today, approximately ${(s.parcel_count ?? 0).toLocaleString()} current parcels appear to trace back to this subdivision.`
    );
  }

  if (s.confidence_level === "medium") {
    parts.push(
      "The subdivision name is from Cook County property records. The recording date has not yet been verified against the original recorded plat."
    );
  } else if (s.confidence_level === "low") {
    parts.push(
      "This subdivision has been identified from indirect sources. The details here should be treated as preliminary until verified against the original plat record."
    );
  } else if (s.confidence_level === "unknown") {
    parts.push(
      "Limited information is currently available for this subdivision. It is in the manual research queue for verification."
    );
  }

  if (!parts.length) {
    return <p className="subdivision-narrative">No narrative is available yet for this subdivision.</p>;
  }

  return (
    <div className="subdivision-narrative">
      {parts.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

function SubdivisionFact({
  label,
  value,
  unknown,
}: {
  label: string;
  value: string | null | undefined;
  unknown: string;
}) {
  return (
    <div className="subdivision-fact">
      <dt className="subdivision-fact-label">{label}</dt>
      <dd className={`subdivision-fact-value${!value ? " unknown" : ""}`}>
        {value ?? <span className="subdivision-unknown-text">{unknown}</span>}
      </dd>
    </div>
  );
}

function SubdivisionTimeline({ events }: { events: SubdivisionTimelineEvent[] }) {
  return (
    <ol className="subdivision-timeline">
      {events.map((event) => (
        <li key={event.id} className="subdivision-timeline-event">
          <div className="subdivision-timeline-year">
            {event.event_year ?? "Unknown year"}
          </div>
          <div className="subdivision-timeline-content">
            <strong>{event.title}</strong>
            {event.description && <p>{event.description}</p>}
            {event.source_name && (
              <span className="subdivision-timeline-source">
                Source: {event.source_name}
                {event.source_reference ? ` — ${event.source_reference}` : ""}
              </span>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function ParcelRow({ parcel: p }: { parcel: ParcelRow }) {
  return (
    <div className="subdivision-parcel-row">
      <Link to={propertyPath(p.pin)} className="subdivision-parcel-address">
        {p.address ?? p.pin}
      </Link>
      <div className="subdivision-parcel-meta">
        {p.year_built && <span>Built {p.year_built}</span>}
        {p.lot_number && <span>Lot {p.lot_number}</span>}
        {p.block_number && <span>Block {p.block_number}</span>}
      </div>
    </div>
  );
}

function UnknownsList({ subdivision: s }: { subdivision: SubdivisionWithDetail }) {
  const unknowns: string[] = [];

  if (!s.recorded_year) {
    unknowns.push("The recording date for this subdivision has not been confirmed. It requires research in the Cook County Recorder's plat index.");
  }
  if (!s.original_owner && !s.developer) {
    unknowns.push("The original owner or developer is not yet known.");
  }
  if (!s.plat_book && !s.document_number) {
    unknowns.push("The plat book/page reference and document number have not been found.");
  }
  if (!s.surveyor) {
    unknowns.push("The surveyor who drew the original plat is not yet known.");
  }
  if ((s.parcel_count ?? 0) === 0) {
    unknowns.push("No current parcels have been linked to this subdivision yet.");
  }

  if (!unknowns.length) {
    return <p className="subdivision-no-unknowns">No major data gaps identified for this subdivision.</p>;
  }

  return (
    <ul className="subdivision-unknowns-list">
      {unknowns.map((item, i) => (
        <li key={i} className="subdivision-unknown-item">
          <span className="subdivision-unknown-icon" aria-hidden="true">?</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function NotFoundState({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="content-page">
      <div className="content-page-inner">
        <div className="error-page">
          <h1 className="error-page-title">Subdivision not found</h1>
          <p className="error-page-body">{message}</p>
          {hint && <p className="error-page-hint">{hint}</p>}
          <div className="error-page-links">
            <Link to={ROUTES.subdivisions.path} className="error-page-link">
              Browse all subdivisions
            </Link>
            <Link to={ROUTES.home.path} className="error-page-link">
              Search properties
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
