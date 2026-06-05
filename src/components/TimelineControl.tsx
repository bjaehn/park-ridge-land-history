import { decadeOrder } from "../lib/colorScales";
import { formatNumber } from "../lib/formatters";
import type { VisualizationPreset } from "./VisualizationPanel";

type TimelineControlProps = {
  activePreset: VisualizationPreset;
  selectedDecades: Set<string>;
  maxBuiltYear: number;
  minAvailableYear: number;
  maxAvailableYear: number;
  isBuildoutPlaying: boolean;
  animationSpeed: "slow" | "normal" | "fast";
  builtByYearCount: number;
  knownYearTotal: number;
  percentBuilt: number;
  showUnknown: boolean;
  totalCount: number;
  filteredCount: number;
  isSampleData: boolean;
  onToggleDecade: (decade: string) => void;
  onSetMaxBuiltYear: (year: number) => void;
  onToggleBuildoutPlayback: () => void;
  onResetBuildout: () => void;
  onSetAnimationSpeed: (speed: "slow" | "normal" | "fast") => void;
  onSetShowUnknown: (show: boolean) => void;
  onSelectAll: () => void;
  onClearKnown: () => void;
};

export function TimelineControl({
  activePreset,
  selectedDecades,
  maxBuiltYear,
  minAvailableYear,
  maxAvailableYear,
  isBuildoutPlaying,
  animationSpeed,
  builtByYearCount,
  knownYearTotal,
  percentBuilt,
  showUnknown,
  totalCount,
  filteredCount,
  isSampleData,
  onToggleDecade,
  onSetMaxBuiltYear,
  onToggleBuildoutPlayback,
  onResetBuildout,
  onSetAnimationSpeed,
  onSetShowUnknown,
  onSelectAll,
  onClearKnown
}: TimelineControlProps) {
  const selectableDecades = decadeOrder.filter((bucket) => bucket !== "Unknown" && bucket !== "Suspicious");
  const selectedDecadeCount = selectedDecades.size + (showUnknown ? 1 : 0);
  const progressStyle = {
    width: `${percentBuilt}%`
  };
  const showBuildoutControls = activePreset === "buildout";

  return (
    <section className="panel-section city-map-controls" aria-label="Whole city map controls">
      <h2>What Is Showing</h2>
      {isSampleData && <div className="sample-notice">Sample Data</div>}
      <dl className="stat-grid city-stat-grid">
        <div>
          <dt>On map</dt>
          <dd>{formatNumber(filteredCount)}</dd>
        </div>
        <div>
          <dt>Total homes</dt>
          <dd>{formatNumber(totalCount)}</dd>
        </div>
        <div>
          <dt>Build year known</dt>
          <dd>{formatNumber(knownYearTotal)}</dd>
        </div>
      </dl>

      {showBuildoutControls && (
        <div className="city-control-block">
          <div className="city-control-heading">
            <h3>Move Through Time</h3>
            <span>{percentBuilt}% built</span>
          </div>
          <p className="city-control-note">Use this only for the city growth view.</p>
          <label className="range-control">
            <span>Show homes built by {maxBuiltYear}</span>
            <input
              type="range"
              min={minAvailableYear}
              max={maxAvailableYear}
              step={1}
              value={maxBuiltYear}
              onChange={(event) => onSetMaxBuiltYear(Number(event.target.value))}
            />
          </label>

          <div className="buildout-player" aria-label="Build-out animation controls">
            <div className="buildout-actions">
              <button className="primary-action" type="button" onClick={onToggleBuildoutPlayback}>
                {isBuildoutPlaying ? "Pause" : "Play"}
              </button>
              <button type="button" onClick={onResetBuildout}>Reset</button>
              <label className="speed-control">
                <span>Speed</span>
                <select
                  value={animationSpeed}
                  onChange={(event) => onSetAnimationSpeed(event.target.value as "slow" | "normal" | "fast")}
                >
                  <option value="slow">Slow</option>
                  <option value="normal">Normal</option>
                  <option value="fast">Fast</option>
                </select>
              </label>
            </div>
            <div className="buildout-progress" aria-label={`${percentBuilt}% of known-year parcels built`}>
              <span style={progressStyle} />
            </div>
            <p className="buildout-stat">
              {builtByYearCount.toLocaleString()} of {knownYearTotal.toLocaleString()} homes with known build years
              <strong>{percentBuilt}%</strong>
            </p>
          </div>
        </div>
      )}

      <div className="city-control-block">
        <div className="city-control-heading">
          <h3>Filter by Home Age</h3>
          <span>{selectedDecadeCount} selected</span>
        </div>
        <p className="city-control-note">Choose which build decades stay visible on the map.</p>
        <div className="mini-actions city-age-actions">
          <button type="button" onClick={onSelectAll}>Show all ages</button>
          <button type="button" onClick={onClearKnown}>Clear ages</button>
        </div>
        <div className="decade-list">
          {selectableDecades.map((bucket) => (
            <label key={bucket} className="check-row">
              <input
                type="checkbox"
                checked={selectedDecades.has(bucket)}
                onChange={() => onToggleDecade(bucket)}
              />
              <span>{bucket}</span>
            </label>
          ))}
        </div>

        <label className="check-row check-row-strong">
          <input
            type="checkbox"
            checked={showUnknown}
            onChange={(event) => onSetShowUnknown(event.target.checked)}
          />
          <span>Include homes with unknown build year</span>
        </label>
      </div>
    </section>
  );
}
