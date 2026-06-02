import { decadeOrder } from "../lib/colorScales";

type TimelineControlProps = {
  selectedDecades: Set<string>;
  maxBuiltYear: number;
  minAvailableYear: number;
  maxAvailableYear: number;
  showUnknown: boolean;
  onToggleDecade: (decade: string) => void;
  onSetMaxBuiltYear: (year: number) => void;
  onSetShowUnknown: (show: boolean) => void;
  onSelectAll: () => void;
  onClearKnown: () => void;
};

export function TimelineControl({
  selectedDecades,
  maxBuiltYear,
  minAvailableYear,
  maxAvailableYear,
  showUnknown,
  onToggleDecade,
  onSetMaxBuiltYear,
  onSetShowUnknown,
  onSelectAll,
  onClearKnown
}: TimelineControlProps) {
  const selectableDecades = decadeOrder.filter((bucket) => bucket !== "Unknown" && bucket !== "Suspicious");

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
