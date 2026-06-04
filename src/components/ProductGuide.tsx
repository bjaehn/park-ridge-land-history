export function ProductGuide() {
  return (
    <section className="panel-section product-guide" aria-label="How to use this map">
      <h2>Choose an Analysis Scale</h2>
      <div className="analysis-scale-list">
        <article>
          <strong>Single Home</strong>
          <span>Search one address, then read its age, sales, permits, and timeline.</span>
        </article>
        <article>
          <strong>Cluster</strong>
          <span>Turn on trend clusters to find nearby teardown pressure or older-home pockets.</span>
        </article>
        <article>
          <strong>Citywide</strong>
          <span>Use map modes and the time slider to see patterns across Park Ridge.</span>
        </article>
      </div>
    </section>
  );
}
