import type { LucideIcon } from "lucide-react";
import "./StatCard.css";

type Props = {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: LucideIcon;
  accent?: "blue" | "green" | "amber" | "red" | "purple" | "cyan";
};

export function StatCard({ label, value, subValue, icon: Icon, accent = "cyan" }: Props) {
  return (
    <article className={`stat-card stat-card-${accent}`}>
      {Icon && (
        <div className="stat-card-icon">
          <Icon size={16} strokeWidth={2} aria-hidden="true" />
        </div>
      )}
      <div className="stat-card-body">
        <span className="stat-card-label">{label}</span>
        <strong className="stat-card-value">{value}</strong>
        {subValue && <span className="stat-card-sub">{subValue}</span>}
      </div>
    </article>
  );
}
