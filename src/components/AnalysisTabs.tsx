export type AnalysisScale = "home" | "block" | "area" | "city";

type AnalysisTabsProps = {
  activeScale: AnalysisScale;
  onSetScale: (scale: AnalysisScale) => void;
};

function IconHome() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5z" />
      <polyline points="9 21 9 12 15 12 15 21" />
    </svg>
  );
}

function IconBlock() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconArea() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2a7 7 0 017 7c0 4.97-6.22 12.18-6.7 12.76a.4.4 0 01-.6 0C11.22 21.18 5 13.97 5 9a7 7 0 017-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

function IconCity() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="1" y1="22" x2="23" y2="22" />
      <path d="M2 22V15l5-2v9" />
      <path d="M7 22V10l5-5v17" />
      <path d="M12 22V13l5-3v12" />
      <path d="M17 22V17l4-2v7" />
    </svg>
  );
}

const tabs: Array<{ id: AnalysisScale; label: string; detail: string; Icon: () => JSX.Element }> = [
  { id: "home",  label: "Property",    detail: "One home's story",     Icon: IconHome  },
  { id: "block", label: "Block",       detail: "Nearby homes",         Icon: IconBlock },
  { id: "area",  label: "Area",        detail: "Neighborhood view",    Icon: IconArea  },
  { id: "city",  label: "Park Ridge",  detail: "Whole city",           Icon: IconCity  }
];

export function AnalysisTabs({ activeScale, onSetScale }: AnalysisTabsProps) {
  return (
    <nav className="analysis-tabs" aria-label="Analysis scale">
      {tabs.map((tab) => {
        const { Icon } = tab;
        return (
          <button
            className={activeScale === tab.id ? "is-active" : ""}
            type="button"
            role="tab"
            aria-selected={activeScale === tab.id}
            key={tab.id}
            onClick={() => onSetScale(tab.id)}
          >
            <span className="tab-icon"><Icon /></span>
            <span className="tab-copy">
              <strong>{tab.label}</strong>
              <span>{tab.detail}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
