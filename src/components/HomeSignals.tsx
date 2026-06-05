import { buildHomeSignals } from "../lib/homeSignals";
import type { ParcelProperties } from "../lib/parcelTypes";

type HomeSignalsProps = {
  properties: ParcelProperties;
};

export function HomeSignals({ properties }: HomeSignalsProps) {
  const signals = buildHomeSignals(properties);
  if (signals.length === 0) return null;

  return (
    <div className="home-signals" aria-label="Home signals">
      <h4>Home Signals</h4>
      <div className="home-signal-grid">
        {signals.map((signal) => (
          <article className={`home-signal home-signal-${signal.tone}`} key={signal.id}>
            <strong>{signal.label}</strong>
            <span>{signal.detail}</span>
          </article>
        ))}
      </div>
    </div>
  );
}
