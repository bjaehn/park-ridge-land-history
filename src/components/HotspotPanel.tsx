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
      <h2>Trend Clusters</h2>
      <nav className="cluster-subnav" aria-label="Cluster views">
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
            <span>Show clusters on map</span>
          </label>
          <div className="cluster-stat-grid">
            <article>
              <strong>{hotspots.features.length}</strong>
              <span>Total clusters</span>
            </article>
            <article>
              <strong>{typeCounts.teardown_cluster + typeCounts.changing_area}</strong>
              <span>Change signals</span>
            </article>
            <article>
              <strong>{typeCounts.old_home_pocket}</strong>
              <span>Older pockets</span>
            </article>
            <article>
              <strong>{typeCounts.stable_area}</strong>
              <span>Stable pockets</span>
            </article>
          </div>
        </div>
      )}

      {activeClusterView === "hotspots" && (
        <>
          {!enabled ? (
            <p className="quiet-note hotspot-empty">Turn clusters on to show these on the map.</p>
          ) : visibleHotspots.length === 0 ? (
            <p className="quiet-note hotspot-empty">No hotspots in the current view.</p>
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
            <p className="quiet-note hotspot-empty">Choose a hotspot to inspect it here.</p>
          ) : (
            <dl className="detail-list cluster-detail-list">
              <div>
                <dt>Type</dt>
                <dd>{hotspotLabel(selectedHotspot.properties.hotspot_type)}</dd>
              </div>
              <div>
                <dt>Parcels</dt>
                <dd>{selectedHotspot.properties.parcel_count.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Score</dt>
                <dd>{Math.round(selectedHotspot.properties.score).toLocaleString()}</dd>
              </div>
              <div>
                <dt>Why</dt>
                <dd>{selectedHotspot.properties.description}</dd>
              </div>
            </dl>
          )}
        </>
      )}
    </section>
  );
}

type ClusterView = "overview" | "hotspots" | "selected";

const clusterViews: Array<{ id: ClusterView; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "hotspots", label: "Hotspots" },
  { id: "selected", label: "Selected" }
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
