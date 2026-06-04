import type { HotspotCollection, HotspotFeature } from "../lib/hotspots";

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
  const visibleHotspots = hotspots.features.slice(0, 6);

  return (
    <section className="panel-section hotspot-section" aria-label="Interesting places">
      <h2>Trend Clusters</h2>
      <label className="check-row check-row-strong cluster-toggle-row">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => onSetEnabled(event.target.checked)}
        />
        <span>Show teardown and trend clusters on the map</span>
      </label>
      {!enabled ? (
        <p className="quiet-note hotspot-empty">Clusters stay hidden until you turn them on.</p>
      ) : visibleHotspots.length === 0 ? (
        <p className="quiet-note hotspot-empty">No hotspots in the current view.</p>
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
    </section>
  );
}
