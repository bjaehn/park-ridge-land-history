import { useMemo, useState } from "react";
import { hotspotLabel, type HotspotCollection, type HotspotFeature, type HotspotType } from "../lib/hotspots";

type HotspotPanelProps = {
  hotspots: HotspotCollection;
  enabled: boolean;
  onSetEnabled: (enabled: boolean) => void;
  selectedHotspotId: string | null;
  onSelectHotspot: (hotspot: HotspotFeature) => void;
};

export function HotspotPanel({
  hotspots,
  enabled,
  onSetEnabled,
  selectedHotspotId,
  onSelectHotspot
}: HotspotPanelProps) {
  const [activeClusterView, setActiveClusterView] = useState<ClusterView>("overview");
  const visibleHotspots = hotspots.features.slice(0, 6);
  const selectedHotspot = hotspots.features.find((hotspot) => hotspot.properties.id === selectedHotspotId) ?? null;
  const typeCounts = useMemo(() => countHotspotTypes(hotspots), [hotspots]);

  return (
    <section className="panel-section hotspot-section" aria-label="Interesting places">
      <h2>Nearby Change</h2>
      <nav className="cluster-subnav" aria-label="Nearby change views">
        {clusterViews.map((view) => (
          <button
            className={activeClusterView === view.id ? "is-active" : ""}
            type="button"
            key={view.id}
            onClick={() => setActiveClusterView(view.id)}
          >
            {view.label}
          </button>
        ))}
      </nav>

      {activeClusterView === "overview" && (
        <div className="cluster-panel-view">
          <label className="check-row check-row-strong cluster-toggle-row">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => onSetEnabled(event.target.checked)}
            />
            <span>Show nearby change areas on map</span>
          </label>
          <div className="cluster-stat-grid">
            <article>
              <strong>{hotspots.features.length}</strong>
              <span>Areas found</span>
            </article>
            <article>
              <strong>{typeCounts.teardown_cluster + typeCounts.changing_area}</strong>
              <span>Likely changing</span>
            </article>
            <article>
              <strong>{typeCounts.old_home_pocket}</strong>
              <span>Older-home areas</span>
            </article>
            <article>
              <strong>{typeCounts.stable_area}</strong>
              <span>Quiet areas</span>
            </article>
          </div>
        </div>
      )}

      {activeClusterView === "hotspots" && (
        <>
          {!enabled ? (
            <p className="quiet-note hotspot-empty">Turn the map layer on to see these areas.</p>
          ) : visibleHotspots.length === 0 ? (
            <p className="quiet-note hotspot-empty">No nearby change areas in the current view.</p>
          ) : (
            <div className="hotspot-list">
              {visibleHotspots.map((hotspot) => (
                <button
                  className={`hotspot-button ${hotspot.properties.id === selectedHotspotId ? "is-active" : ""}`}
                  type="button"
                  key={hotspot.properties.id}
                  onClick={() => {
                    onSelectHotspot(hotspot);
                    setActiveClusterView("selected");
                  }}
                >
                  <span>{hotspot.properties.title}</span>
                  <small>{hotspot.properties.description}</small>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {activeClusterView === "selected" && (
        <>
          {!selectedHotspot ? (
            <p className="quiet-note hotspot-empty">Choose an area to see why it stands out.</p>
          ) : (
            <dl className="detail-list cluster-detail-list">
              <div>
                <dt>Kind</dt>
                <dd>{hotspotLabel(selectedHotspot.properties.hotspot_type)}</dd>
              </div>
              <div>
                <dt>Parcels</dt>
                <dd>{selectedHotspot.properties.parcel_count.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Strength</dt>
                <dd>{strengthLabel(selectedHotspot.properties.score)}</dd>
              </div>
              <div>
                <dt>Why it matters</dt>
                <dd>{selectedHotspot.properties.description}</dd>
              </div>
            </dl>
          )}
        </>
      )}
    </section>
  );
}

function strengthLabel(score: number): string {
  if (score >= 80) return "Strong signal";
  if (score >= 45) return "Moderate signal";
  return "Light signal";
}

type ClusterView = "overview" | "hotspots" | "selected";

const clusterViews: Array<{ id: ClusterView; label: string }> = [
  { id: "overview", label: "Turn On Map" },
  { id: "hotspots", label: "Areas Found" },
  { id: "selected", label: "Area Details" }
];

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
