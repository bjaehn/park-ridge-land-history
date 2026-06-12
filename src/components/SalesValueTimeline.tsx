import { formatCurrency, formatYear } from "../lib/formatters";
import { getHouseEvolutionTimeline } from "../lib/houseEvolution";
import type { HouseEvolutionEvent, ParcelProperties } from "../lib/parcelTypes";

type SalesValueTimelineProps = {
  properties: ParcelProperties;
};

export function SalesValueTimeline({ properties }: SalesValueTimelineProps) {
  const allEvents = getHouseEvolutionTimeline(properties);
  const saleEvents = allEvents
    .filter((e): e is HouseEvolutionEvent & { year: number } => e.event_type === "sale" && typeof e.year === "number")
    .sort((a, b) => a.year - b.year);
  const assessmentEvents = allEvents
    .filter((e): e is HouseEvolutionEvent & { year: number } => e.event_type === "assessment" && typeof e.year === "number")
    .sort((a, b) => a.year - b.year);
  const appealEvents = allEvents
    .filter((e): e is HouseEvolutionEvent & { year: number } => e.event_type === "appeal" && typeof e.year === "number")
    .sort((a, b) => a.year - b.year);

  const hasData =
    properties.latest_assessed_total ||
    properties.latest_sale_price ||
    saleEvents.length > 0 ||
    assessmentEvents.length > 0;

  if (!hasData) {
    return (
      <div className="sv-empty">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
        <p>No financial records matched to this parcel yet.</p>
      </div>
    );
  }

  const firstYear = properties.first_assessed_year || properties.year_built;
  const latestYear = properties.latest_assessed_year || new Date().getFullYear();
  const valueChangePct = properties.assessed_value_change_pct;
  const hasValueTrend = typeof valueChangePct === "number" && !Number.isNaN(valueChangePct)
    && properties.first_assessed_year && properties.latest_assessed_year
    && properties.first_assessed_year !== properties.latest_assessed_year;

  return (
    <div className="sv-timeline" aria-label="Sales and value history">

      {/* Key metrics row */}
      <div className="sv-metrics">
        {properties.latest_assessed_total && (
          <div className="sv-metric">
            <span className="sv-metric-label">Current value</span>
            <strong className="sv-metric-value">{formatCurrency(properties.latest_assessed_total)}</strong>
            <span className="sv-metric-sub">{properties.latest_assessed_year ? `assessed ${properties.latest_assessed_year}` : "latest assessment"}</span>
          </div>
        )}
        {hasValueTrend && (
          <div className={`sv-metric sv-metric-trend ${(valueChangePct ?? 0) >= 0 ? "sv-metric-up" : "sv-metric-down"}`}>
            <span className="sv-metric-label">Value change</span>
            <strong className="sv-metric-value">{formatSignedPct(valueChangePct!)}</strong>
            <span className="sv-metric-sub">
              {formatCurrency(properties.first_assessed_total)} in {properties.first_assessed_year}
            </span>
          </div>
        )}
        {properties.latest_sale_price && (
          <div className="sv-metric">
            <span className="sv-metric-label">Latest sale</span>
            <strong className="sv-metric-value">{formatCurrency(properties.latest_sale_price)}</strong>
            <span className="sv-metric-sub">{properties.latest_sale_year ? `sold ${properties.latest_sale_year}` : "most recent"}</span>
          </div>
        )}
        {properties.max_sale_price && properties.max_sale_price !== properties.latest_sale_price && (
          <div className="sv-metric">
            <span className="sv-metric-label">Highest sale</span>
            <strong className="sv-metric-value">{formatCurrency(properties.max_sale_price)}</strong>
            <span className="sv-metric-sub">peak recorded price</span>
          </div>
        )}
      </div>

      {/* Assessment visual */}
      {(properties.first_assessed_year && properties.latest_assessed_year && properties.first_assessed_total && properties.latest_assessed_total) && (
        <div className="sv-assessment-section">
          <div className="sv-section-label">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
            Assessment history
          </div>
          <AssessmentBar
            firstYear={properties.first_assessed_year}
            firstValue={properties.first_assessed_total}
            latestYear={properties.latest_assessed_year}
            latestValue={properties.latest_assessed_total}
            changePct={properties.assessed_value_change_pct}
          />
        </div>
      )}

      {/* Sales events */}
      {saleEvents.length > 0 && (
        <div className="sv-sales-section">
          <div className="sv-section-label">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
            </svg>
            Ownership transfers ({saleEvents.length})
          </div>
          <SalesTrack events={saleEvents} />
        </div>
      )}

      {/* Appeals */}
      {appealEvents.length > 0 && (
        <div className="sv-appeals-section">
          <div className="sv-section-label">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Assessment appeals ({appealEvents.length})
          </div>
          <div className="sv-appeals-list">
            {appealEvents.map((event, i) => (
              <div key={i} className="sv-appeal-row">
                <span className="sv-appeal-year">{event.year}</span>
                <span className="sv-appeal-title">{event.title || "Assessment appeal"}</span>
                {event.description && <span className="sv-appeal-desc">{event.description}</span>}
              </div>
            ))}
          </div>
          {properties.total_assessment_reduction && (
            <div className="sv-appeal-total">
              Total reductions: {formatCurrency(properties.total_assessment_reduction)}
            </div>
          )}
        </div>
      )}

      {/* Raw counts summary */}
      <div className="sv-footnote">
        {[
          properties.sale_count ? `${properties.sale_count} sale record${properties.sale_count === 1 ? "" : "s"} since 1999` : null,
          properties.assessed_year_count ? `${properties.assessed_year_count} assessment year${properties.assessed_year_count === 1 ? "" : "s"}` : null,
          properties.appeal_count ? `${properties.appeal_count} appeal${properties.appeal_count === 1 ? "" : "s"} filed` : null
        ].filter(Boolean).join(" · ")}
      </div>
    </div>
  );
}

function AssessmentBar({
  firstYear, firstValue, latestYear, latestValue, changePct
}: {
  firstYear: number; firstValue: number;
  latestYear: number; latestValue: number;
  changePct?: number | null;
}) {
  const isUp = latestValue >= firstValue;
  const barFirstPct = isUp ? Math.round((firstValue / latestValue) * 100) : 100;
  const barLatestPct = isUp ? 100 : Math.round((latestValue / firstValue) * 100);

  return (
    <div className="sv-assessment-bar-group">
      <div className="sv-bar-row">
        <div className="sv-bar-label">{firstYear}</div>
        <div className="sv-bar-track">
          <div
            className="sv-bar sv-bar-first"
            style={{ width: `${barFirstPct}%` }}
            title={formatCurrency(firstValue)}
          />
        </div>
        <div className="sv-bar-value">{formatCurrency(firstValue)}</div>
      </div>
      <div className="sv-bar-row sv-bar-row-latest">
        <div className="sv-bar-label">{latestYear}</div>
        <div className="sv-bar-track">
          <div
            className="sv-bar sv-bar-latest"
            style={{ width: `${barLatestPct}%` }}
            title={formatCurrency(latestValue)}
          />
        </div>
        <div className="sv-bar-value">{formatCurrency(latestValue)}</div>
      </div>
      {typeof changePct === "number" && !Number.isNaN(changePct) && (
        <div className={`sv-bar-change ${isUp ? "sv-change-up" : "sv-change-down"}`}>
          {isUp ? "▲" : "▼"} {Math.abs(Math.round(changePct))}% change over {latestYear - firstYear} years
        </div>
      )}
    </div>
  );
}

function SalesTrack({ events }: { events: Array<HouseEvolutionEvent & { year: number }> }) {
  const years = events.map((e) => e.year);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const span = Math.max(maxYear - minYear, 1);

  const prices = events.map((e) => e.price).filter((p): p is number => typeof p === "number" && p > 0);
  const maxPrice = prices.length > 0 ? Math.max(...prices) : null;

  return (
    <div className="sv-sales-track-wrap">
      <div className="sv-sales-track" role="list">
        {events.map((event, index) => {
          const pct = span > 0 ? ((event.year - minYear) / span) * 100 : 50;
          const hasPrice = typeof event.price === "number" && event.price > 0;
          const heightPct = hasPrice && maxPrice ? Math.max(20, Math.round((event.price! / maxPrice) * 100)) : 50;
          return (
            <div
              key={index}
              className="sv-sale-event"
              style={{ left: `${pct}%` }}
              role="listitem"
            >
              <div className="sv-sale-price-label">
                {hasPrice ? formatCurrency(event.price!) : ""}
              </div>
              <div
                className="sv-sale-stem"
                style={{ height: `${heightPct}%` }}
              />
              <div className="sv-sale-dot" title={`${event.year}${hasPrice ? ` · ${formatCurrency(event.price!)}` : ""}`} />
              <div className="sv-sale-year">{event.year}</div>
            </div>
          );
        })}
        <div className="sv-sales-axis" aria-hidden="true">
          <span>{minYear}</span>
          <span>{maxYear}</span>
        </div>
      </div>
    </div>
  );
}

function formatSignedPct(value: number): string {
  const rounded = Math.round(value);
  return `${rounded >= 0 ? "+" : ""}${rounded.toLocaleString()}%`;
}
