export type AnalysisScale = "home" | "cluster" | "city";

type AnalysisTabsProps = {
  activeScale: AnalysisScale;
  onSetScale: (scale: AnalysisScale) => void;
};

const tabs: Array<{ id: AnalysisScale; label: string; meta: string }> = [
  { id: "home", label: "Single Home", meta: "Address, sales, permits" },
  { id: "cluster", label: "Cluster", meta: "Nearby patterns" },
  { id: "city", label: "Citywide", meta: "Map modes and time" }
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
          <small>{tab.meta}</small>
        </button>
      ))}
    </nav>
  );
}
