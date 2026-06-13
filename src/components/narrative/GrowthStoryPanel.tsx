import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { DecadeChart } from "../charts/DecadeChart";
import { aggregateChangeStory } from "../../lib/changeStory";
import { formatNumber, formatYear } from "../../lib/formatters";
import type { ParcelFeature } from "../../lib/parcelTypes";
import "./GrowthStoryPanel.css";

const STORY_COLORS: Record<string, string> = {
  preservation: "#c4a97a",
  careful_reinvestment: "#34d399",
  turnover: "#60a5fa",
  rebuild_pressure: "#f87171",
  expansion: "#a78bfa",
  dormant: "rgba(255,255,255,0.35)",
};

type EntityType = "block" | "neighborhood" | "city";
type Scale = "block" | "area" | "city";

const ENTITY_SCALE: Record<EntityType, Scale> = {
  block: "block",
  neighborhood: "area",
  city: "city",
};

type Props = {
  features: ParcelFeature[];
  entityName: string;
  entityType: EntityType;
};

export function GrowthStoryPanel({ features, entityName, entityType }: Props) {
  const story = useMemo(
    () => aggregateChangeStory(features, ENTITY_SCALE[entityType]),
    [features, entityType]
  );

  const growthStats = useMemo(() => {
    const years = features
      .map((f) => f.properties.year_built)
      .filter((y): y is number => y != null && y >= 1800 && y <= 2030);
    const pre1945 = years.filter((y) => y <= 1945).length;
    const post2000 = years.filter((y) => y >= 2000).length;
    const withPermits = features.filter((f) => (f.properties.permit_count ?? 0) > 0).length;
    const withSales = features.filter((f) => (f.properties.sale_count ?? 0) > 0).length;
    return {
      knownYears: years.length,
      total: features.length,
      oldestYear: years.length ? Math.min(...years) : null,
      newestYear: years.length ? Math.max(...years) : null,
      pre1945,
      post2000,
      withPermits,
      withSales,
    };
  }, [features]);

  const color = STORY_COLORS[story.type] ?? "#22d3ee";
  const chartHeight = entityType === "block" ? 110 : 130;

  return (
    <div className="growth-story-panel glass-card">
      <div className="growth-story-header">
        <div className="growth-story-icon">
          <TrendingUp size={18} strokeWidth={1.8} aria-hidden="true" />
        </div>
        <div className="growth-story-title-group">
          <span className="section-eyebrow">Development history</span>
          <h2 className="section-title" style={{ marginTop: 2 }}>{story.title}</h2>
        </div>
        <span
          className="growth-story-badge"
          style={{
            background: `${color}1a`,
            color,
            border: `1px solid ${color}44`,
          }}
        >
          {story.label}
        </span>
      </div>

      <p className="growth-story-body">{story.body}</p>

      <div className="growth-story-chart-section">
        <div className="growth-story-chart-header">
          <strong className="growth-story-chart-label">Construction by decade</strong>
          {growthStats.oldestYear && (
            <span className="growth-story-chart-range">
              {formatYear(growthStats.oldestYear)} – {formatYear(growthStats.newestYear)}
            </span>
          )}
        </div>
        <DecadeChart features={features} height={chartHeight} />
      </div>

      <div className="growth-story-stats">
        <GrowthStat
          label="Pre-1945 homes"
          value={formatNumber(growthStats.pre1945)}
          sub={`${growthStats.total > 0 ? Math.round((growthStats.pre1945 / growthStats.total) * 100) : 0}% of total`}
        />
        <GrowthStat
          label="Built 2000+"
          value={formatNumber(growthStats.post2000)}
          sub="newer construction"
        />
        <GrowthStat
          label="With permits"
          value={formatNumber(growthStats.withPermits)}
          sub="2019+ records"
          accent="#fbbf24"
        />
        <GrowthStat
          label="With sales"
          value={formatNumber(growthStats.withSales)}
          sub="since 1999"
          accent="#34d399"
        />
      </div>

      {story.counts.filter((c) => c.count > 0).length > 0 && (
        <div className="growth-story-signals">
          <strong className="growth-story-signals-label">Change signal distribution</strong>
          <div className="growth-story-signal-bars">
            {story.counts
              .filter((c) => c.count > 0)
              .map((item) => {
                const c = STORY_COLORS[item.type] ?? "#22d3ee";
                return (
                  <div key={item.type} className="growth-signal-row">
                    <div className="growth-signal-meta">
                      <span className="growth-signal-name">{item.label}</span>
                      <span className="growth-signal-value" style={{ color: c }}>
                        {formatNumber(item.count)} ({item.percent}%)
                      </span>
                    </div>
                    <div className="growth-signal-track">
                      <div
                        className="growth-signal-fill"
                        style={{ width: `${item.percent}%`, background: c }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

function GrowthStat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: string;
}) {
  return (
    <div className="growth-stat">
      <strong className="growth-stat-value" style={{ color: accent ?? "rgba(255,255,255,0.88)" }}>
        {value}
      </strong>
      <span className="growth-stat-label">{label}</span>
      <span className="growth-stat-sub">{sub}</span>
    </div>
  );
}
