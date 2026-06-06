import { useMemo } from "react";
import { hotspotLabel, type HotspotCollection, type HotspotFeature, type HotspotType } from "../lib/hotspots";

type HotspotPanelProps = {
  hotspots: HotspotCollection;
  selectedHotspotId: string | null;
  onSelectHotspot: (hotspot: HotspotFeature) => void;
};

export function HotspotPanel({
  hotspots,
  selectedHotspotId,
  onSelectHotspot
}: HotspotPanelProps) {
  const visibleHotspots = hotspots.features.slice(0, 8);
  const selectedHotspot = hotspots.features.find((hotspot) => hotspot.properties.id === selectedHotspotId) ?? null;
  const typeCounts = useMemo(() => countHotspotTypes(hotspots), [hotspots]);

  return (
    <section className="panel-section hotspot-section" aria-label="Areas in Park Ridge">
      <h2>Area / Neighborhood</h2>
      <p className="nearby-tab-note">
        Areas are bigger than one block. They help you spot parts of Park Ridge where nearby homes share the same kind of story.
      </p>

      <div className="scale-definition">
        <strong>What is an area?</strong>
        <p>
          This is not an official neighborhood boundary. It is a data-made place: a small group of nearby parcels with a shared signal, such as older homes, recent work, or teardown pressure.
        </p>
      </div>

      <div className="cluster-stat-grid area-stat-grid">
        <article>
          <strong>{hotspots.features.length}</strong>
          <span>Areas found</span>
        </article>
        <article>
          <strong>{typeCounts.teardown_cluster + typeCounts.changing_area}</strong>
          <span>Changing</span>
        </article>
        <article>
          <strong>{typeCounts.old_home_pocket}</strong>
          <span>Older-home pockets</span>
        </article>
        <article>
          <strong>{typeCounts.stable_area}</strong>
          <span>Quiet</span>
        </article>
      </div>

      <div className="cluster-view-heading">
        <h3>Pick an area to understand</h3>
        <p>Choose one below or click a circle on the map. The map will zoom there.</p>
      </div>

      {visibleHotspots.length === 0 ? (
        <p className="quiet-note hotspot-empty">No area patterns found in the current view.</p>
      ) : (
        <div className="hotspot-list">
          {visibleHotspots.map((hotspot) => (
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
      )}

      {selectedHotspot ? (
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
        <p className="quiet-note hotspot-empty">Pick an area to read what makes it stand out.</p>
      )}
    </section>
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
