import { useMemo } from "react";
import { computeDataCoverage } from "../lib/dataCoverage";
import { DataCoverageNotice } from "./cards/DataCoverageNotice";
import type { ParcelCollection } from "../lib/parcelTypes";

type GrowthStoryPanelProps = {
  parcels: ParcelCollection | null;
};

type DecadeStat = {
  decade: string;
  count: number;
  percent: number;
};

export function GrowthStoryPanel({ parcels }: GrowthStoryPanelProps) {
  const coverage = useMemo(() => computeDataCoverage(parcels), [parcels]);

  const decadeStats = useMemo((): DecadeStat[] => {
    if (!parcels) return [];
    const counts = new Map<string, number>();
    let total = 0;
    for (const f of parcels.features) {
      const decade = f.properties.decade_built;
      if (!decade || decade === "Unknown" || decade === "Suspicious") continue;
      counts.set(decade, (counts.get(decade) ?? 0) + 1);
      total++;
    }
    if (total === 0) return [];
    return Array.from(counts.entries())
      .map(([decade, count]) => ({
        decade,
        count,
        percent: Math.round((count / total) * 100)
      }))
      .sort((a, b) => a.decade.localeCompare(b.decade));
  }, [parcels]);

  const peakDecade = useMemo(() => {
    if (decadeStats.length === 0) return null;
    return decadeStats.reduce((best, d) => d.count > best.count ? d : best);
  }, [decadeStats]);

  const pre1945Count = useMemo(() => {
    if (!parcels) return 0;
    return parcels.features.filter(f => {
      const y = f.properties.year_built;
      return typeof y === "number" && y < 1945;
    }).length;
  }, [parcels]);

  const post2000Count = useMemo(() => {
    if (!parcels) return 0;
    return parcels.features.filter(f => {
      const y = f.properties.year_built;
      return typeof y === "number" && y >= 2000;
    }).length;
  }, [parcels]);

  const total = coverage.total;
  const pre1945Pct = total > 0 ? Math.round((pre1945Count / total) * 100) : 0;
  const post2000Pct = total > 0 ? Math.round((post2000Count / total) * 100) : 0;

  if (!parcels || total === 0) {
    return (
      <section className="growth-story-panel" aria-label="How Park Ridge grew">
        <h3 className="growth-story-title">How Park Ridge grew</h3>
        <p className="quiet-note">Loading city data...</p>
      </section>
    );
  }

  return (
    <section className="growth-story-panel" aria-label="How Park Ridge grew">
      <h3 className="growth-story-title">How Park Ridge grew</h3>

      <div className="growth-story-summary">
        <p className="growth-story-lead">
          Park Ridge has {total.toLocaleString()} residential properties
          {coverage.yearBuiltPct > 0 ? `, with year built confirmed for ${coverage.yearBuiltPct}% of them` : ""}.
          {peakDecade ? ` Most homes were built in the ${peakDecade.decade}s (${peakDecade.percent}% of known construction).` : ""}
        </p>

        <div className="growth-story-stats">
          {pre1945Count > 0 && (
            <div className="gss-stat">
              <span className="gss-stat-value">{pre1945Pct}%</span>
              <span className="gss-stat-label">built before 1945</span>
            </div>
          )}
          {post2000Count > 0 && (
            <div className="gss-stat">
              <span className="gss-stat-value">{post2000Pct}%</span>
              <span className="gss-stat-label">built since 2000</span>
            </div>
          )}
          {coverage.permitsAny > 0 && (
            <div className="gss-stat">
              <span className="gss-stat-value">{coverage.permitsPct}%</span>
              <span className="gss-stat-label">have permit records</span>
            </div>
          )}
        </div>
      </div>

      {decadeStats.length > 0 && (
        <div className="growth-decade-bars" aria-label="Construction by decade">
          <h4 className="growth-decade-title">Construction by decade</h4>
          {decadeStats.map(d => (
            <div key={d.decade} className="growth-decade-row">
              <span className="gdr-label">{d.decade}s</span>
              <div className="gdr-bar-wrap" role="presentation">
                <div
                  className="gdr-bar"
                  style={{ width: `${Math.max(d.percent, 2)}%` }}
                  aria-hidden="true"
                />
              </div>
              <span className="gdr-count">{d.count.toLocaleString()} homes</span>
            </div>
          ))}
        </div>
      )}

      <DataCoverageNotice stats={coverage} title="Data coverage at a glance" />
    </section>
  );
}
