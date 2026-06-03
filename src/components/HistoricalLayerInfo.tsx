import type { HistoricalLayer } from "../lib/historicalLayerTypes";

type HistoricalLayerInfoProps = {
  layer: HistoricalLayer;
  loadError?: string;
};

export function HistoricalLayerInfo({ layer, loadError }: HistoricalLayerInfoProps) {
  return (
    <details className="historical-info">
      <summary>Details</summary>
      <dl>
        <div>
          <dt>Question</dt>
          <dd>{layer.historicalQuestion}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>
            {layer.sourceUrl ? (
              <a href={layer.sourceUrl} target="_blank" rel="noreferrer">
                {layer.sourceName}
              </a>
            ) : (
              layer.sourceName
            )}
          </dd>
        </div>
        <div>
          <dt>Credit</dt>
          <dd>{layer.attribution}</dd>
        </div>
        {layer.notes && (
          <div>
            <dt>Note</dt>
            <dd>{layer.notes}</dd>
          </div>
        )}
        {loadError && (
          <div>
            <dt>Error</dt>
            <dd>{loadError}</dd>
          </div>
        )}
      </dl>
    </details>
  );
}
