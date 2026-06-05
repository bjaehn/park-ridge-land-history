export type AnalysisScale = "home" | "cluster" | "city";

type AnalysisTabsProps = {
  activeScale: AnalysisScale;
  onSetScale: (scale: AnalysisScale) => void;
};

const tabs: Array<{ id: AnalysisScale; label: string }> = [
  { id: "home", label: "Single Home" },
  { id: "cluster", label: "Cluster" },
  { id: "city", label: "Citywide" }
];

export function AnalysisTabs({ activeScale, onSetScale }: AnalysisTabsProps) {
  return (
    <nav className="analysis-tabs" aria-label="Analysis scale">
      {tabs.map((tab) => (
        <button
          className={activeScale === tab.id ? "is-active" : ""}
          type="button"
          role="tab"
          aria-selected={activeScale === tab.id}
          key={tab.id}
          onClick={() => onSetScale(tab.id)}
        >
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
