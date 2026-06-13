import type { AnalysisScale } from "../AnalysisTabs";

type StartHereSectionProps = {
  onNavigate: (scale: AnalysisScale) => void;
};

const cards: Array<{
  icon: JSX.Element;
  title: string;
  body: string;
  cta: string;
  scale: AnalysisScale;
}> = [
  {
    scale: "home",
    title: "Search a home",
    body: "Look up any Park Ridge address and see what records are available: year built, permits, sales, assessments, and historic survey matches.",
    cta: "Search above",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5z" />
        <polyline points="9 21 9 12 15 12 15 21" />
      </svg>
    )
  },
  {
    scale: "area",
    title: "Explore a neighborhood",
    body: "Compare housing age, permit activity, sales, and development patterns across Park Ridge neighborhoods, wards, and change zones.",
    cta: "Go to Neighborhoods",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2a7 7 0 017 7c0 4.97-6.22 12.18-6.7 12.76a.4.4 0 01-.6 0C11.22 21.18 5 13.97 5 9a7 7 0 017-7z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
    )
  },
  {
    scale: "city",
    title: "See how Park Ridge grew",
    body: "Understand the citywide development story by decade: when most homes were built, where reinvestment is visible, and what data is available.",
    cta: "Go to Park Ridge",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="1" y1="22" x2="23" y2="22" />
        <path d="M2 22V15l5-2v9" /><path d="M7 22V10l5-5v17" />
        <path d="M12 22V13l5-3v12" /><path d="M17 22V17l4-2v7" />
      </svg>
    )
  }
];

const steps = [
  "Search an address",
  "Review what the records say",
  "Compare the property to its block, neighborhood, and the city",
  "Check sources and caveats before drawing conclusions"
];

export function StartHereSection({ onNavigate }: StartHereSectionProps) {
  return (
    <section className="start-here-section" aria-label="Getting started">
      <div className="start-here-cards" role="list">
        {cards.map((card) => (
          <div key={card.scale} className="start-here-card" role="listitem">
            <div className="shc-icon" aria-hidden="true">{card.icon}</div>
            <h3 className="shc-title">{card.title}</h3>
            <p className="shc-body">{card.body}</p>
            {card.scale !== "home" && (
              <button
                className="shc-cta"
                type="button"
                onClick={() => onNavigate(card.scale)}
                aria-label={card.cta}
              >
                {card.cta}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="start-here-guide">
        <h3 className="shg-title">How to use this site</h3>
        <ol className="shg-steps">
          {steps.map((step, i) => (
            <li key={i} className="shg-step">
              <span className="shg-step-num" aria-hidden="true">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
