type VisualizationPreset = "stability" | "activity" | "age" | "buildout";

type VisualizationPanelProps = {
  activePreset: VisualizationPreset;
  onSelectPreset: (preset: VisualizationPreset) => void;
};

const presets: Array<{ id: VisualizationPreset; label: string; meta: string }> = [
  { id: "stability", label: "Stable vs changing", meta: "Block signal" },
  { id: "activity", label: "Permit activity", meta: "Work type" },
  { id: "age", label: "Age by decade", meta: "Structure age" },
  { id: "buildout", label: "Buildout", meta: "Time sweep" }
];

export function VisualizationPanel({
  activePreset,
  onSelectPreset
}: VisualizationPanelProps) {
  return (
    <section className="panel-section visualization-section" aria-label="Visualization presets">
      <h2>Visualizations</h2>
      <div className="preset-grid">
        {presets.map((preset) => (
          <button
            className={`preset-button ${activePreset === preset.id ? "is-active" : ""}`}
            type="button"
            key={preset.id}
            onClick={() => onSelectPreset(preset.id)}
          >
            <span>{preset.label}</span>
            <small>{preset.meta}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

export type { VisualizationPreset };
