import { historicalLayerStatusLabels, type HistoricalLayerStatus } from "../lib/historicalLayerTypes";

type LayerStatusBadgeProps = {
  status: HistoricalLayerStatus;
};

export function LayerStatusBadge({ status }: LayerStatusBadgeProps) {
  return (
    <span className={`layer-status layer-status-${status}`}>
      {historicalLayerStatusLabels[status]}
    </span>
  );
}
