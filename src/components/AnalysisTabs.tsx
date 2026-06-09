export type AnalysisScale = "home" | "block" | "area" | "city";

type AnalysisTabsProps = {
  activeScale: AnalysisScale;
  onSetScale: (scale: AnalysisScale) => void;
};

const tabs: Array<{ id: AnalysisScale; label: string; detail: string }> = [
  { id: "home", label: "Property", detail: "One house story" },
  { id: "block", label: "Block", detail: "Nearby homes" },
  { id: "area", label: "Area", detail: "Neighborhood dynamics" },
  { id: "city", label: "Park Ridge", detail: "Whole city view" }
];

export function AnalysisTabs({ activeScale, onSetScale }: AnalysisTabsProps) {
  return (
    <nav className="analysis-tabs" aria-label="Analysis scale">
      {tabs.map((tab, index) => (
        <button
          className={activeScale === tab.id ? "is-active" : ""}
          type="button"
          role="tab"
          aria-selected={activeScale === tab.id}
          key={tab.id}
          onClick={() => onSetScale(tab.id)}
        >
          <span className="tab-index">{String(index + 1).padStart(2, "0")}</span>
          <span className="tab-copy">
            <strong>{tab.label}</strong>
            <span>{tab.detail}</span>
          </span>
        </button>
      ))}
    </nav>
  );
}
