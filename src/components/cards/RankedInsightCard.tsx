import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import type { RankedProperty } from "../../lib/rankings";
import { ROUTES } from "../../lib/routes";
import { formatAddress } from "../../lib/formatters";
import "./RankedInsightCard.css";

type Props = {
  title: string;
  icon?: LucideIcon;
  accentColor?: string;
  items: RankedProperty[];
  loading?: boolean;
};

export function RankedInsightCard({ title, icon: Icon, accentColor = "#22d3ee", items, loading }: Props) {
  return (
    <div className="ranked-card">
      <div className="ranked-card-header">
        {Icon && (
          <div className="ranked-card-icon" style={{ color: accentColor, borderColor: `${accentColor}33`, background: `${accentColor}14` }}>
            <Icon size={14} strokeWidth={2.2} aria-hidden="true" />
          </div>
        )}
        <h3 className="ranked-card-title">{title}</h3>
      </div>

      {loading ? (
        <div className="ranked-loading">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="ranked-skeleton" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="ranked-empty">No data available</p>
      ) : (
        <ol className="ranked-list">
          {items.map((item, i) => (
            <li key={item.pin} className="ranked-item">
              <span className="ranked-index" style={{ color: i < 3 ? accentColor : undefined }}>
                {i + 1}
              </span>
              <div className="ranked-item-body">
                <Link to={item.linkTo ?? ROUTES.property(item.pin)} className="ranked-address">
                  {formatAddress(item.address)}
                </Link>
                {item.secondaryLabel && (
                  <span className="ranked-secondary">{item.secondaryLabel}</span>
                )}
              </div>
              <span className="ranked-value" style={{ color: accentColor }}>
                {typeof item.valueLabel === "string" ? item.valueLabel : String(item.value)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
