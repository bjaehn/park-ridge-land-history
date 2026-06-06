import { useMemo } from "react";
import {
  areaGroupingDefinitions,
  type AreaGroupingId,
  type AreaSummaryCollection,
  type AreaSummaryFeature
} from "../lib/areaGroups";
import { hotspotLabel, type HotspotCollection, type HotspotFeature, type HotspotType } from "../lib/hotspots";

type HotspotPanelProps = {
  hotspots: HotspotCollection;
  areaSummaries: AreaSummaryCollection;
  activeGrouping: AreaGroupingId;
  selectedAreaId: string | null;
  selectedHotspotId: string | null;
  hasWardBoundaries: boolean;
  onSetGrouping: (grouping: AreaGroupingId) => void;
  onSelectArea: (area: AreaSummaryFeature) => void;
  onSelectHotspot: (hotspot: HotspotFeature) => void;
};

export function HotspotPanel({
  hotspots,
  areaSummaries,
  activeGrouping,
  selectedAreaId,
  selectedHotspotId,
  hasWardBoundaries,
  onSetGrouping,
  onSelectArea,
  onSelectHotspot
}: HotspotPanelProps) {
  const visibleAreas = areaSummaries.features.slice(0, 9);
  const visibleHotspots = hotspots.features.slice(0, 9);
  const selectedHotspot = hotspots.features.find((hotspot) => hotspot.properties.id === selectedHotspotId) ?? null;
  const selectedArea = areaSummaries.features.find((area) => area.properties.id === selectedAreaId) ?? null;
  const typeCounts = useMemo(() => countHotspotTypes(hotspots), [hotspots]);
  const areaStats = useMemo(() => summarizeAreas(areaSummaries), [areaSummaries]);
  const activeDefinition = areaGroupingDefinitions.find((definition) => definition.id === activeGrouping) ?? areaGroupingDefinitions[0];

  return (
    <section className="panel-section hotspot-section" aria-label="Areas in Park Ridge">
      <h2>Areas</h2>
      <p className="nearby-tab-note">
        Use this when one house is too small and the whole city is too big. Pick how you want to group Park Ridge, then compare what is changing.
      </p>

      <div className="area-lens-picker" aria-label="Choose area grouping">
        {areaGroupingDefinitions.map((definition) => (
          <button
            className={definition.id === activeGrouping ? "is-active" : ""}
            type="button"
            key={definition.id}
            onClick={() => onSetGrouping(definition.id)}
          >
            <strong>{definition.shortLabel}</strong>
            <span>{definition.description}</span>
          </button>
        ))}
      </div>

      <div className="cluster-stat-grid area-stat-grid">
        <article>
          <strong>{areaSummaries.features.length}</strong>
          <span>{activeGrouping === "change_zones" ? "Zones found" : "Areas shown"}</span>
        </article>
        <article>
          <strong>{areaStats.active}</strong>
          <span>Active change</span>
        </article>
        <article>
          <strong>{areaStats.olderHomes || typeCounts.old_home_pocket}</strong>
          <span>Older-home signals</span>
        </article>
        <article>
          <strong>{areaStats.quiet || typeCounts.stable_area}</strong>
          <span>Quiet</span>
        </article>
      </div>

      <div className="cluster-view-heading">
        <h3>{activeDefinition.shortLabel}</h3>
        <p>{activeDefinition.description}</p>
      </div>

      {activeGrouping === "change_zones" ? (
        <ChangeZoneList
          hotspots={visibleHotspots}
          selectedHotspotId={selectedHotspotId}
          onSelectHotspot={onSelectHotspot}
        />
      ) : (
        <AreaList
          areas={visibleAreas}
          activeGrouping={activeGrouping}
          hasWardBoundaries={hasWardBoundaries}
          selectedAreaId={selectedAreaId}
          onSelectArea={onSelectArea}
        />
      )}

      {selectedArea ? (
        <AreaReadout area={selectedArea} />
      ) : selectedHotspot ? (
        <div className="area-readout">
          <h3>{selectedHotspot.properties.title}</h3>
          <p>{selectedHotspot.properties.description}</p>
          <dl className="detail-list cluster-detail-list">
            <div>
              <dt>Pattern</dt>
              <dd>{hotspotLabel(selectedHotspot.properties.hotspot_type)}</dd>
            </div>
            <div>
              <dt>Homes nearby</dt>
              <dd>{selectedHotspot.properties.parcel_count.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Signal strength</dt>
              <dd>{strengthLabel(selectedHotspot.properties.score)}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <p className="quiet-note hotspot-empty">Pick one area to see why it matters.</p>
      )}
    </section>
  );
}

function AreaList({
  areas,
  activeGrouping,
  hasWardBoundaries,
  selectedAreaId,
  onSelectArea
}: {
  areas: AreaSummaryFeature[];
  activeGrouping: AreaGroupingId;
  hasWardBoundaries: boolean;
  selectedAreaId: string | null;
  onSelectArea: (area: AreaSummaryFeature) => void;
}) {
  if (areas.length === 0 && activeGrouping === "wards" && !hasWardBoundaries) {
    return (
      <div className="scale-definition">
        <strong>Official ward file needed</strong>
        <p>
          Election wards will show here once the official Park Ridge ward boundary file is added. The app no longer uses approximate ward shapes.
        </p>
      </div>
    );
  }
  if (areas.length === 0) return <p className="quiet-note hotspot-empty">No areas found in the current view.</p>;
  return (
    <div className="hotspot-list">
      {areas.map((area) => (
        <button
          className={`hotspot-button ${area.properties.id === selectedAreaId ? "is-active" : ""}`}
          type="button"
          key={area.properties.id}
          onClick={() => onSelectArea(area)}
        >
          <span className="area-list-title">
            {area.properties.displayColor ? (
              <i className="area-color-dot" style={{ backgroundColor: area.properties.displayColor }} aria-hidden="true" />
            ) : null}
            {area.properties.label}
          </span>
          <small>{area.properties.signalLabel} - {area.properties.description}</small>
        </button>
      ))}
    </div>
  );
}

function ChangeZoneList({
  hotspots,
  selectedHotspotId,
  onSelectHotspot
}: {
  hotspots: HotspotFeature[];
  selectedHotspotId: string | null;
  onSelectHotspot: (hotspot: HotspotFeature) => void;
}) {
  if (hotspots.length === 0) return <p className="quiet-note hotspot-empty">No change zones found in the current view.</p>;
  return (
    <div className="hotspot-list">
      {hotspots.map((hotspot) => (
        <button
          className={`hotspot-button ${hotspot.properties.id === selectedHotspotId ? "is-active" : ""}`}
          type="button"
          key={hotspot.properties.id}
          onClick={() => onSelectHotspot(hotspot)}
        >
          <span>{hotspot.properties.title}</span>
          <small>{hotspot.properties.description}</small>
        </button>
      ))}
    </div>
  );
}

function AreaReadout({ area }: { area: AreaSummaryFeature }) {
  return (
    <div className="area-readout">
      <h3>{area.properties.label}</h3>
      <p>{area.properties.description}</p>
      <dl className="detail-list cluster-detail-list">
        <div>
          <dt>Main signal</dt>
          <dd>{area.properties.signalLabel}</dd>
        </div>
        <div>
          <dt>Homes</dt>
          <dd>{area.properties.parcelCount.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Remodeling</dt>
          <dd>{area.properties.remodelCount.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Older homes</dt>
          <dd>{area.properties.olderHomeCount.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Teardown pressure</dt>
          <dd>{area.properties.teardownPressureCount.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{area.properties.sourceLabel}</dd>
        </div>
      </dl>
    </div>
  );
}

function strengthLabel(score: number): string {
  if (score >= 80) return "Strong";
  if (score >= 45) return "Moderate";
  return "Light";
}

function countHotspotTypes(hotspots: HotspotCollection): Record<HotspotType, number> {
  return hotspots.features.reduce<Record<HotspotType, number>>(
    (counts, hotspot) => {
      counts[hotspot.properties.hotspot_type] += 1;
      return counts;
    },
    {
      teardown_cluster: 0,
      changing_area: 0,
      old_home_pocket: 0,
      stable_area: 0
    }
  );
}

function summarizeAreas(areas: AreaSummaryCollection) {
  return areas.features.reduce(
    (counts, area) => {
      if (area.properties.signal === "active" || area.properties.signal === "teardown_pressure") counts.active += 1;
      if (area.properties.signal === "older_homes") counts.olderHomes += 1;
      if (area.properties.signal === "quiet") counts.quiet += 1;
      return counts;
    },
    { active: 0, olderHomes: 0, quiet: 0 }
  );
}
