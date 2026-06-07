import { formatNumber } from "../lib/formatters";
import type { VisualizationPreset } from "./VisualizationPanel";

type TimelineControlProps = {
  activePreset: VisualizationPreset;
  maxBuiltYear: number;
  minAvailableYear: number;
  maxAvailableYear: number;
  isBuildoutPlaying: boolean;
  animationSpeed: "slow" | "normal" | "fast";
  builtByYearCount: number;
  knownYearTotal: number;
  percentBuilt: number;
  totalCount: number;
  onSetMaxBuiltYear: (year: number) => void;
  onToggleBuildoutPlayback: () => void;
  onResetBuildout: () => void;
  onSetAnimationSpeed: (speed: "slow" | "normal" | "fast") => void;
};

export function TimelineControl({
  activePreset,
  maxBuiltYear,
  minAvailableYear,
  maxAvailableYear,
  isBuildoutPlaying,
  animationSpeed,
  builtByYearCount,
  knownYearTotal,
  percentBuilt,
  totalCount,
  onSetMaxBuiltYear,
  onToggleBuildoutPlayback,
  onResetBuildout,
  onSetAnimationSpeed
}: TimelineControlProps) {
  const knownYearPercent = totalCount ? Math.round((knownYearTotal / totalCount) * 100) : 0;
  const progressStyle = {
    width: `${percentBuilt}%`
  };
  const showBuildoutControls = activePreset === "buildout";

  return (
    <section className="panel-section city-map-controls" aria-label="Park Ridge citywide snapshot">
      <h2>Park Ridge Snapshot</h2>
      <dl className="stat-grid city-stat-grid">
        <div>
          <dt>Homes analyzed</dt>
          <dd>{formatNumber(totalCount)}</dd>
        </div>
        <div>
          <dt>Build year known</dt>
          <dd>{formatNumber(knownYearTotal)}</dd>
        </div>
        <div>
          <dt>Age coverage</dt>
          <dd>{knownYearPercent}%</dd>
        </div>
      </dl>

      {showBuildoutControls && (
        <div className="city-control-block">
          <div className="city-control-heading">
            <h3>Move Through Time</h3>
            <span>{percentBuilt}% built</span>
          </div>
          <p className="city-control-note">Move through build years to watch Park Ridge fill in on the map.</p>
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
    </section>
  );
}
