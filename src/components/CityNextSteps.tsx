import type { AnalysisScale } from "./AnalysisTabs";
import type { VisualizationPreset } from "./VisualizationPanel";

type Props = {
  onNavigate: (scale: AnalysisScale) => void;
  onSelectPreset: (preset: VisualizationPreset) => void;
};

function IconHome() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5z" />
      <polyline points="9 21 9 12 15 12 15 21" />
    </svg>
  );
}

function IconNeighborhood() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2a7 7 0 017 7c0 4.97-6.22 12.18-6.7 12.76a.4.4 0 01-.6 0C11.22 21.18 5 13.97 5 9a7 7 0 017-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

function IconChange() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0114.36-3.36L23 10M1 14l5.13 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}

const actions = [
  {
    id: "home" as const,
    icon: <IconHome />,
    label: "Find your home",
    desc: "See when your house was built and how it's changed",
    primary: true,
  },
  {
    id: "neighborhood" as const,
    icon: <IconNeighborhood />,
    label: "Explore your neighborhood",
    desc: "Compare how your area fits into Park Ridge's story",
    primary: false,
  },
  {
    id: "change" as const,
    icon: <IconChange />,
    label: "See what's changing today",
    desc: "Map which areas are settled and which are active",
    primary: false,
  },
];

export function CityNextSteps({ onNavigate, onSelectPreset }: Props) {
  return (
    <section className="city-next-steps" aria-label="Where to explore next">
      <p className="cns-invite">
        Park Ridge grew for 150 years. Now pick where to look closer.
      </p>
      <div className="cns-actions">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            className={`cns-btn${action.primary ? " cns-btn--primary" : ""}`}
            onClick={() => {
              if (action.id === "home") onNavigate("home");
              else if (action.id === "neighborhood") onNavigate("area");
              else onSelectPreset("stability");
            }}
          >
            <span className="cns-icon">{action.icon}</span>
            <span className="cns-copy">
              <strong>{action.label}</strong>
              <span>{action.desc}</span>
            </span>
            <svg className="cns-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ))}
      </div>
    </section>
  );
}
