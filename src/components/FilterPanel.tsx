import type { ParcelCollection } from "../lib/parcelTypes";
import { formatNumber } from "../lib/formatters";

type FilterPanelProps = {
  parcels: ParcelCollection | null;
  filteredCount: number;
  isSampleData: boolean;
};

export function FilterPanel({ parcels, filteredCount, isSampleData }: FilterPanelProps) {
  const total = parcels?.features.length ?? 0;
  const withYears = parcels?.features.filter((feature) => Boolean(feature.properties.year_built)).length ?? 0;

  return (
    <section className="panel-section summary-section" aria-label="Map summary">
      <h2>Summary</h2>
      {isSampleData && <div className="sample-notice">Sample Data</div>}
      <dl className="stat-grid">
        <div>
          <dt>Visible</dt>
          <dd>{formatNumber(filteredCount)}</dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd>{formatNumber(total)}</dd>
        </div>
        <div>
          <dt>With year</dt>
          <dd>{formatNumber(withYears)}</dd>
        </div>
      </dl>
      <p className="quiet-note">Year built reflects assessor structure data, not subdivision date.</p>
    </section>
  );
}
