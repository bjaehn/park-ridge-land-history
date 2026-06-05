import { useMemo, useState } from "react";
import type { ParcelChangeType } from "../lib/parcelChangeTypes";
import { hotspotLabel, type HotspotCollection, type HotspotFeature, type HotspotType } from "../lib/hotspots";
import type { PermitPressureMapMode } from "../lib/permitPressure";
import type { PermitPressureType, PermitStabilityType } from "../lib/parcelTypes";
import { Legend } from "./Legend";
import type { VisualizationPreset } from "./VisualizationPanel";

type HotspotPanelProps = {
  hotspots: HotspotCollection;
  enabled: boolean;
  onSetEnabled: (enabled: boolean) => void;
  selectedHotspotId: string | null;
  onSelectHotspot: (hotspot: HotspotFeature) => void;
  activePreset: VisualizationPreset;
  visibleDecades: Set<string>;
  visibleChangeTypes: Set<ParcelChangeType>;
  showPermitPressure: boolean;
  permitPressureMapMode: PermitPressureMapMode;
  visiblePermitPressureTypes: Set<PermitPressureType>;
  visiblePermitStabilityTypes: Set<PermitStabilityType>;
  onSelectPreset: (preset: VisualizationPreset) => void;
  onToggleDecade: (decade: string) => void;
  onToggleChangeType: (changeType: ParcelChangeType) => void;
  onTogglePermitPressureType: (pressureType: PermitPressureType) => void;
  onTogglePermitStabilityType: (stabilityType: PermitStabilityType) => void;
};

export function HotspotPanel({
  hotspots,
  enabled,
  onSetEnabled,
  selectedHotspotId,
  onSelectHotspot,
  activePreset,
  visibleDecades,
  visibleChangeTypes,
  showPermitPressure,
  permitPressureMapMode,
  visiblePermitPressureTypes,
  visiblePermitStabilityTypes,
  onSelectPreset,
  onToggleDecade,
  onToggleChangeType,
  onTogglePermitPressureType,
  onTogglePermitStabilityType
}: HotspotPanelProps) {
  const [activeClusterView, setActiveClusterView] = useState<ClusterView>("overview");
  const visibleHotspots = hotspots.features.slice(0, 6);
  const selectedHotspot = hotspots.features.find((hotspot) => hotspot.properties.id === selectedHotspotId) ?? null;
  const typeCounts = useMemo(() => countHotspotTypes(hotspots), [hotspots]);

  return (
    <section className="panel-section hotspot-section" aria-label="Areas in Park Ridge">
      <h2>Areas in Park Ridge</h2>
      <p className="nearby-tab-note">
        Use this when you want more than one address, but not the whole town. It finds small groups of nearby homes that share a pattern.
      </p>
      <nav className="cluster-subnav" aria-label="Area steps">
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
          <div className="area-context-card">
            <h3>What am I looking at?</h3>
            <p>
              The map can show two things at once: colored parcels tell you what kind of pattern each home has, and area circles point to places where nearby homes start to tell the same story.
            </p>
          </div>

          <div className="cluster-view-heading">
            <h3>Choose what the colors mean</h3>
            <p>This changes the parcel colors on the map. The area circles stay focused on nearby patterns.</p>
          </div>
          <div className="area-question-grid" aria-label="Area map questions">
            {areaMapQuestions.map((question) => (
              <button
                className={`preset-button area-question-button ${activePreset === question.id ? "is-active" : ""}`}
                type="button"
                aria-pressed={activePreset === question.id}
                key={question.id}
                onClick={() => onSelectPreset(question.id)}
              >
                <span>{question.label}</span>
                <small>{question.meta}</small>
              </button>
            ))}
          </div>

          <div className="area-filter-panel">
            <div className="cluster-view-heading">
              <h3>Pick what stays visible</h3>
              <p>These are the same color controls as the map legend. Click one to hide it; click again to bring it back.</p>
            </div>
            <Legend
              activePreset={activePreset}
              visibleDecades={visibleDecades}
              showParcelChangeLegend={false}
              visibleChangeTypes={visibleChangeTypes}
              showPermitPressureLegend={showPermitPressure}
              permitPressureMapMode={permitPressureMapMode}
              visiblePermitPressureTypes={visiblePermitPressureTypes}
              visiblePermitStabilityTypes={visiblePermitStabilityTypes}
              onToggleDecade={onToggleDecade}
              onToggleChangeType={onToggleChangeType}
              onTogglePermitPressureType={onTogglePermitPressureType}
              onTogglePermitStabilityType={onTogglePermitStabilityType}
              compact
            />
          </div>

          <label className="check-row check-row-strong cluster-toggle-row">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => onSetEnabled(event.target.checked)}
            />
            <span>Show area circles on the map</span>
          </label>
          <p className="nearby-tab-note">
            Turn this on when you want the app to point out small parts of Park Ridge worth inspecting. Then click a circle on the map, or choose one from the next tab.
          </p>
          <div className="cluster-stat-grid">
            <article>
              <strong>{hotspots.features.length}</strong>
              <span>Areas to look at</span>
            </article>
            <article>
              <strong>{typeCounts.teardown_cluster + typeCounts.changing_area}</strong>
              <span>Changing areas</span>
            </article>
            <article>
              <strong>{typeCounts.old_home_pocket}</strong>
              <span>Older homes</span>
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
          <div className="cluster-view-heading">
            <h3>Choose an Area</h3>
            <p>Each button is a nearby group of homes with a shared signal. Choose one to zoom there and see why it matters.</p>
          </div>
          {!enabled ? (
            <p className="quiet-note hotspot-empty">Turn on nearby areas first.</p>
          ) : visibleHotspots.length === 0 ? (
            <p className="quiet-note hotspot-empty">No standout nearby areas in the current view.</p>
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
          <div className="cluster-view-heading">
            <h3>Why This Area?</h3>
            <p>This explains the pattern, not a verdict. Use it as a short list of places to inspect more closely.</p>
          </div>
          {!selectedHotspot ? (
            <p className="quiet-note hotspot-empty">Pick an area from the map or list first.</p>
          ) : (
            <dl className="detail-list cluster-detail-list">
              <div>
                <dt>What we noticed</dt>
                <dd>{hotspotLabel(selectedHotspot.properties.hotspot_type)}</dd>
              </div>
              <div>
                <dt>Homes nearby</dt>
                <dd>{selectedHotspot.properties.parcel_count.toLocaleString()}</dd>
              </div>
              <div>
                <dt>How strong</dt>
                <dd>{strengthLabel(selectedHotspot.properties.score)}</dd>
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

function strengthLabel(score: number): string {
  if (score >= 80) return "Strong signal";
  if (score >= 45) return "Moderate signal";
  return "Light signal";
}

type ClusterView = "overview" | "hotspots" | "selected";

const clusterViews: Array<{ id: ClusterView; label: string }> = [
  { id: "overview", label: "Set Up Map" },
  { id: "hotspots", label: "Pick Area" },
  { id: "selected", label: "Read Area" }
];

const areaMapQuestions: Array<{ id: VisualizationPreset; label: string; meta: string }> = [
  {
    id: "stability",
    label: "Quiet or changing?",
    meta: "Best first view. Shows stable homes, watch areas, and stronger change pressure."
  },
  {
    id: "activity",
    label: "What kind of work?",
    meta: "Separates remodels, additions, new construction, and teardown pressure."
  },
  {
    id: "age",
    label: "How old nearby?",
    meta: "Shows the age mix so you can spot older pockets and newer rebuilds."
  }
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
