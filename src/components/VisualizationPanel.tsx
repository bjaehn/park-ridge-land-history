type VisualizationPreset = "stability" | "activity" | "age" | "buildout";

type VisualizationPanelProps = {
  activePreset: VisualizationPreset;
  onSelectPreset: (preset: VisualizationPreset) => void;
};

const presets: Array<{ id: VisualizationPreset; label: string; meta: string }> = [
  { id: "age", label: "How old are the homes?", meta: "Colors show when each home was built." },
  { id: "buildout", label: "How did the city grow?", meta: "Move through time by year built." },
  { id: "stability", label: "Where is change happening?", meta: "Shows quiet areas versus places with more recent activity." },
  { id: "activity", label: "What kind of work is happening?", meta: "Shows permits, additions, new construction, and teardown pressure." }
];

export function VisualizationPanel({
  activePreset,
  onSelectPreset
}: VisualizationPanelProps) {
  return (
    <section className="panel-section visualization-section" aria-label="Citywide map mode">
      <h2>Whole City View</h2>
      <p className="mode-note">Choose the question you want the map to answer.</p>
      <div className="preset-grid">
        {presets.map((preset) => (
          <button
            className={`preset-button ${activePreset === preset.id ? "is-active" : ""}`}
            type="button"
            aria-pressed={activePreset === preset.id}
            key={preset.id}
            onClick={() => onSelectPreset(preset.id)}
          >
            <span>{preset.label}</span>
            <small>{preset.meta}</small>
            {activePreset === preset.id && <em>Showing now</em>}
          </button>
        ))}
      </div>
    </section>
  );
}

export type { VisualizationPreset };
