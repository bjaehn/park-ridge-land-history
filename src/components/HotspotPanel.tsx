import type { HotspotCollection, HotspotFeature } from "../lib/hotspots";

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
  const visibleHotspots = hotspots.features.slice(0, 6);

  return (
    <section className="panel-section hotspot-section" aria-label="Interesting places">
      <h2>Interesting Places</h2>
      {visibleHotspots.length === 0 ? (
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
