import {
  historyPeriods,
  periodLabel,
  roadHistoryColor,
  type HistoryPeriodId,
  type RoadParcelHistoryData,
  type RoadSegmentHistoryFeature
} from "../lib/roadParcelHistory";

type RoadParcelTimelinePanelProps = {
  data: RoadParcelHistoryData | null;
  selectedPeriod: HistoryPeriodId;
  showRoadHistory: boolean;
  selectedRoad: RoadSegmentHistoryFeature | null;
  onSelectPeriod: (period: HistoryPeriodId) => void;
  onSetShowRoadHistory: (show: boolean) => void;
  onClearSelectedRoad: () => void;
};

export function RoadParcelTimelinePanel({
  data,
  selectedPeriod,
  showRoadHistory,
  selectedRoad,
  onSelectPeriod,
  onSetShowRoadHistory,
  onClearSelectedRoad
}: RoadParcelTimelinePanelProps) {
  const roadCount = data?.road_segments.features.length ?? 0;
  const parcelHistoryCount = data?.parcel_history.length ?? 0;
  const overlayCount = data?.historical_overlays.length ?? 0;

  return (
    <section className="panel-section road-history-panel" aria-label="Road and parcel history timeline">
      <div className="road-history-hero">
        <span>Observed history</span>
        <h2>Road & Parcel History Timeline</h2>
        <p>
          This timeline shows when roads and parcels are first observed in available historical sources. It does not
          always represent the exact date a road was built or a parcel was legally subdivided.
        </p>
      </div>

      {data?.sample_data && (
        <p className="road-history-warning">
          MVP scaffold: road segment periods are demo placeholders until historic aerials, Sanborn sheets, topo maps,
          or parcel snapshots are manually reviewed.
        </p>
      )}

      <div className="road-history-toolbar">
        <label className="switch-row">
          <input
            type="checkbox"
            checked={showRoadHistory}
            onChange={(event) => onSetShowRoadHistory(event.target.checked)}
          />
          <span>Show road timeline on map</span>
        </label>
      </div>

      <div className="period-selector" aria-label="Choose historical period">
        {historyPeriods.map((period) => (
          <button
            className={selectedPeriod === period.id ? "is-active" : ""}
            type="button"
            key={period.id}
            onClick={() => onSelectPeriod(period.id)}
          >
            <span className="period-dot" style={{ backgroundColor: roadHistoryColor(period.id) }} />
            <strong>{period.label}</strong>
            <small>{period.shortLabel}</small>
          </button>
        ))}
      </div>

      <dl className="stat-grid road-history-stats">
        <div>
          <dt>Road records</dt>
          <dd>{roadCount.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Parcel records</dt>
          <dd>{parcelHistoryCount.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Overlay refs</dt>
          <dd>{overlayCount.toLocaleString()}</dd>
        </div>
      </dl>

      <div className="road-history-legend">
        <h3>Map meaning</h3>
        <p>
          Roads visible in or before <strong>{periodLabel(selectedPeriod)}</strong> are shown. The heavier line marks
          roads first observed in the selected period.
        </p>
        <div className="road-history-legend-grid">
          {historyPeriods.map((period) => (
            <span key={period.id}>
              <i style={{ backgroundColor: roadHistoryColor(period.id) }} />
              {period.label}
            </span>
          ))}
        </div>
      </div>

      <RoadEvidenceCard road={selectedRoad} onClear={onClearSelectedRoad} />
    </section>
  );
}

function RoadEvidenceCard({
  road,
  onClear
}: {
  road: RoadSegmentHistoryFeature | null;
  onClear: () => void;
}) {
  if (!road) {
    return (
      <div className="road-evidence-card">
        <h3>Click a road segment</h3>
        <p>
          The evidence panel will show the source behind the period estimate, confidence, and whether the record has
          been reviewed.
        </p>
      </div>
    );
  }

  return (
    <div className="road-evidence-card is-selected">
      <div className="road-evidence-heading">
        <div>
          <span>Selected road</span>
          <h3>{road.properties.street_name}</h3>
        </div>
        <button className="text-button" type="button" onClick={onClear}>Clear</button>
      </div>
      <dl className="detail-list">
        <div>
          <dt>First observed</dt>
          <dd>{periodLabel(road.properties.first_observed_period)}</dd>
        </div>
        <div>
          <dt>Date type</dt>
          <dd>Observed, not constructed</dd>
        </div>
        <div>
          <dt>Confidence</dt>
          <dd>{road.properties.confidence}</dd>
        </div>
        <div>
          <dt>Review</dt>
          <dd>{road.properties.review_status.replace(/_/g, " ")}</dd>
        </div>
      </dl>
      <div className="road-evidence-list">
        {road.properties.evidence.map((item, index) => (
          <article key={`${item.source_name}-${index}`}>
            <strong>{item.source_name}</strong>
            <span>{item.evidence_type.replace(/_/g, " ")}</span>
            <p>{item.notes}</p>
          </article>
        ))}
      </div>
      <p className="road-history-disclaimer">
        This is the first observed/documented date, not necessarily the construction date.
      </p>
    </div>
  );
}
