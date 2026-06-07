type VisualizationPreset = "stability" | "activity" | "age" | "buildout";

type VisualizationPanelProps = {
  activePreset: VisualizationPreset;
  onSelectPreset: (preset: VisualizationPreset) => void;
};

const presets: Array<{ id: VisualizationPreset; label: string; meta: string }> = [
  { id: "age", label: "How old are the homes?", meta: "Compare today's homes by decade built." },
  { id: "buildout", label: "How did the city grow?", meta: "Watch the city fill in over time." },
  { id: "stability", label: "Where is change happening?", meta: "Compare neighborhoods by stability and activity." },
  { id: "activity", label: "What kind of work is happening?", meta: "Compare remodeling, additions, and rebuild signals." }
];

export function VisualizationPanel({
  activePreset,
  onSelectPreset
}: VisualizationPanelProps) {
  return (
    <section className="panel-section visualization-section" aria-label="Park Ridge map mode">
      <h2>Park Ridge View</h2>
      <p className="mode-note">Choose the citywide question you want to answer. The map supports the analysis below.</p>
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
