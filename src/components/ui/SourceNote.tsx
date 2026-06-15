import { SOURCES } from "@/lib/content";
import type { SourceKey } from "@/lib/content";

type Props = {
  sources: SourceKey[];
  note?: string;
};

/**
 * Source attribution footnote. One component, one place that defines
 * each canonical disclaimer string (via content.ts SOURCES map).
 *
 * Used at the bottom of pages and inside disclosure sections.
 * Internal source keys ("tiger") are allowed in attribution because
 * this is a source note, not user-facing primary content.
 */
export function SourceNote({ sources, note }: Props) {
  return (
    <aside className="text-xs text-text-muted border-t border-surface-border pt-4 mt-6 space-y-1">
      {note && <p className="italic">{note}</p>}
      <p className="font-semibold text-text-secondary">Sources</p>
      <ul className="space-y-0.5">
        {sources.map((key) => {
          const src = SOURCES[key];
          return (
            <li key={key}>
              <span className="font-medium text-text-secondary">{src.label}:</span>{" "}
              {src.detail}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

type InlineProps = {
  children: string;
};

export function InlineSourceNote({ children }: InlineProps) {
  return (
    <p className="text-xs text-text-muted italic mt-1">{children}</p>
  );
}
