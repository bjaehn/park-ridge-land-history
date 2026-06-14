import type { RankedInsightList } from "../lib/rankedInsights";

type RankedInsightSectionProps = {
  insight: RankedInsightList;
  onSelectProperty: (pin: string) => void;
};

export function RankedInsightSection({
  insight,
  onSelectProperty,
}: RankedInsightSectionProps) {
  return (
    <section className="ranked-insight-section" aria-label={insight.title}>
      <div className="ris-header">
        <h3 className="ris-title">{insight.title}</h3>
        <p className="ris-description">{insight.description}</p>
      </div>

      {insight.items.length === 0 ? (
        <p className="ris-empty">{insight.emptyText}</p>
      ) : (
        <ol className="ris-list" aria-label={`${insight.title} list`}>
          {insight.items.map((item) => (
            <li key={item.pin || item.rank} className="ris-item">
              <span className="ris-rank" aria-hidden="true">
                {item.rank}
              </span>
              <button
                className="ris-property-btn"
                type="button"
                onClick={() => item.pin && onSelectProperty(item.pin)}
                disabled={!item.pin}
                title={`View ${item.address}`}
                aria-label={`${item.address}: ${item.primaryValue}`}
              >
                <span className="ris-address">{item.address}</span>
                <span className="ris-values">
                  <strong className="ris-primary">{item.primaryValue}</strong>
                  {item.secondaryValue && (
                    <span className="ris-secondary">{item.secondaryValue}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}

      <p className="ris-source">
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        {insight.sourceNote}
      </p>
    </section>
  );
}
