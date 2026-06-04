type VisualizationPreset = "stability" | "activity" | "age" | "buildout";

type VisualizationPanelProps = {
  activePreset: VisualizationPreset;
  onSelectPreset: (preset: VisualizationPreset) => void;
};

const presets: Array<{ id: VisualizationPreset; label: string; meta: string }> = [
  { id: "age", label: "Age map", meta: "Color parcels by build decade" },
  { id: "buildout", label: "Buildout over time", meta: "Play the city forward by year built" },
  { id: "stability", label: "Stable vs changing", meta: "Color parcels by change pressure" },
  { id: "activity", label: "Permit activity", meta: "Color parcels by recent work type" }
];

export function VisualizationPanel({
  activePreset,
  onSelectPreset
}: VisualizationPanelProps) {
  return (
    <section className="panel-section visualization-section" aria-label="Citywide map mode">
      <h2>Citywide Map Mode</h2>
      <p className="mode-note">Pick one. This changes the main parcel coloring on the map.</p>
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
