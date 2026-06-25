import Link from "next/link";
import type { ChangeSignal } from "@/lib/formatters";
import { SIGNAL_DESCRIPTION } from "@/lib/formatters";
import { TeardownBadge } from "./TeardownBadge";


export type MetaItem = { icon: React.ReactElement; value: string };

type Props = {
  href?: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  meta?: string;
  metaItems?: MetaItem[];
  signal?: ChangeSignal;
  eraSwatch?: string;
  onClick?: () => void;
  isTeardownRebuild?: boolean | null;
  teardownConfidence?: string | null;
  hasDeedNotes?: boolean | null;
};

const SIGNAL_STYLES: Record<ChangeSignal, string> = {
  Dormant:           "bg-signal-dormant/15 text-signal-dormant",
  Reinvestment:      "bg-signal-reinvestment/15 text-signal-reinvestment",
  Turnover:          "bg-signal-turnover/15 text-signal-turnover",
  "Rebuild pressure": "bg-signal-rebuild/15 text-signal-rebuild",
};

/**
 * Single entity card used for neighborhoods, streets, subdivisions,
 * and related-homes rows. Variants controlled by props, not by forking.
 *
 * When `href` is provided, the card is a link.
 * When `onClick` is provided, the card is a button.
 * Both are not needed simultaneously.
 */
export function EntityCard({
  href,
  eyebrow,
  title,
  subtitle,
  meta,
  metaItems,
  signal,
  eraSwatch,
  isTeardownRebuild,
  teardownConfidence,
  hasDeedNotes,
}: Props) {
  const inner = (
    <div className="relative flex flex-col gap-2 bg-surface-card border border-surface-border rounded-lg p-4 h-full transition-colors hover:border-accent-purple/50">
      {eraSwatch && (
        <div
          className="w-4 h-4 rounded-sm shrink-0 absolute top-4 right-4"
          style={{ backgroundColor: eraSwatch }}
          aria-hidden="true"
        />
      )}
      {eyebrow && (
        <p className="text-xs text-text-muted uppercase tracking-wide font-medium">
          {eyebrow}
        </p>
      )}
      <h3 className="text-base font-semibold text-text-primary leading-snug pr-6">
        {title}
      </h3>
      {subtitle && (
        <p className="text-sm text-text-secondary leading-relaxed">{subtitle}</p>
      )}
      {isTeardownRebuild && (
        <div className="mt-auto pt-2">
          <TeardownBadge confidence={teardownConfidence} />
        </div>
      )}
      {(signal || meta || (metaItems && metaItems.length > 0) || hasDeedNotes) && (
        <div className="flex flex-col gap-1 mt-auto pt-2">
          {metaItems && metaItems.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {metaItems.map((item, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-xs text-text-muted">
                  {item.icon}
                  <span>{item.value}</span>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between flex-wrap gap-2">
            {meta && <p className="text-xs text-text-muted">{meta}</p>}
            <div className="flex items-center gap-2">
              {hasDeedNotes && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-accent-teal/10 border border-accent-teal/20 text-accent-teal uppercase tracking-wide">
                  deed
                </span>
              )}
              {signal && (
                <span
                  className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded ${SIGNAL_STYLES[signal]}`}
                  title={SIGNAL_DESCRIPTION[signal]}
                >
                  {signal}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href} className="block h-full">{inner}</Link>;
  }
  return inner;
}

/**
 * Non-clickable entity representation for items with no resolved address.
 * Never render "Unknown address" as a link.
 */
export function UnresolvableEntityCard({ pin }: { pin: string }) {
  return (
    <div className="flex flex-col gap-1 bg-surface-card border border-surface-border rounded-lg p-4 opacity-60 cursor-default select-none">
      <p className="text-xs text-text-muted uppercase tracking-wide">Address not on record</p>
      <p className="text-sm text-text-secondary">PIN {pin}</p>
      <p className="text-xs text-text-muted">No street address on record. This parcel is included in totals but cannot be searched by address.</p>
    </div>
  );
}
