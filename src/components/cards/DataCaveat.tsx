import { CAVEATS, type CaveatKey } from "../../lib/dataCaveats";

type DataCaveatProps = {
  caveatKey?: CaveatKey;
  text?: string;
};

export function DataCaveat({ caveatKey, text }: DataCaveatProps) {
  const message = text ?? (caveatKey ? CAVEATS[caveatKey] : null);
  if (!message) return null;

  return (
    <p className="data-caveat" role="note">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
      {message}
    </p>
  );
}
