import { decadeColors, decadeOrder } from "../lib/colorScales";

type LegendProps = {
  visibleDecades: Set<string>;
};

export function Legend({ visibleDecades }: LegendProps) {
  return (
    <section className="panel-section" aria-label="Decade color legend">
      <h2>Legend</h2>
      <div className="legend-grid">
        {decadeOrder.map((bucket) => (
          <div className={`legend-item ${visibleDecades.has(bucket) ? "" : "is-muted"}`} key={bucket}>
            <span className="legend-swatch" style={{ backgroundColor: decadeColors[bucket] }} />
            <span>{bucket}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
