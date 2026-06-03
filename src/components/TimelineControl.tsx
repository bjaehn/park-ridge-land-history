import { decadeOrder } from "../lib/colorScales";

type TimelineControlProps = {
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
  const progressStyle = {
    width: `${percentBuilt}%`
  };

  return (
    <section className="panel-section" aria-label="Time filters">
      <div className="section-heading">
        <h2>Time</h2>
        <div className="mini-actions">
          <button type="button" onClick={onSelectAll}>All</button>
          <button type="button" onClick={onClearKnown}>Clear</button>
        </div>
      </div>

      <label className="range-control">
        <span>Built by {maxBuiltYear}</span>
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
          {builtByYearCount.toLocaleString()} of {knownYearTotal.toLocaleString()} known-year parcels built
          <strong>{percentBuilt}%</strong>
        </p>
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
        <span>Show unknown year built</span>
      </label>
    </section>
  );
}
