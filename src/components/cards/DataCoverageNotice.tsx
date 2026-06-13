import type { DataCoverageStats } from "../../lib/dataCoverage";

type DataCoverageNoticeProps = {
  stats: DataCoverageStats;
  title?: string;
};

export function DataCoverageNotice({ stats, title = "Data coverage at a glance" }: DataCoverageNoticeProps) {
  if (stats.total === 0) return null;

  const rows: Array<{ label: string; value: number; pct: number; caveat?: string }> = [
    { label: "Year built on record", value: stats.yearBuiltKnown, pct: stats.yearBuiltPct, caveat: "From assessor records" },
    { label: "At least one permit", value: stats.permitsAny, pct: stats.permitsPct, caveat: "Records may begin 2019" },
    { label: "At least one sale", value: stats.salesAny, pct: stats.salesPct, caveat: "Sales since 1999" },
    { label: "Assessment on file", value: stats.assessedAny, pct: stats.assessedPct },
    { label: "Historic survey match", value: stats.historicSurveyAny, pct: stats.historicSurveyPct, caveat: "HARGIS survey only" }
  ];

  return (
    <section className="coverage-notice" aria-label={title}>
      <h3 className="coverage-notice-title">{title}</h3>
      <p className="coverage-notice-total">
        {stats.total.toLocaleString()} total parcels in this dataset.
      </p>
      <ul className="coverage-rows">
        {rows.map(row => (
          <li key={row.label} className="coverage-row">
            <div className="coverage-row-top">
              <span className="coverage-row-label">{row.label}</span>
              <span className="coverage-row-count">{row.value.toLocaleString()} ({row.pct}%)</span>
            </div>
            <div className="coverage-bar-track" aria-hidden="true">
              <div
                className={`coverage-bar-fill ${row.pct >= 80 ? "cb-strong" : row.pct >= 50 ? "cb-partial" : "cb-sparse"}`}
                style={{ width: `${row.pct}%` }}
              />
            </div>
            {row.caveat && <p className="coverage-row-caveat">{row.caveat}</p>}
          </li>
        ))}
      </ul>
      <p className="coverage-notice-note">
        Coverage reflects the records linked to this dataset. Some properties may have records in other sources not yet included.
      </p>
    </section>
  );
}
