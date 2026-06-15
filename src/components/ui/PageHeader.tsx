import type { ReactNode } from "react";

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

/**
 * Single page header component used by every top-level page.
 * Title casing and spacing are enforced here, not per page.
 * No em dashes allowed in any prop.
 */
export function PageHeader({ eyebrow, title, subtitle, action }: Props) {
  return (
    <div className="flex items-start justify-between gap-6 mb-8">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-semibold tracking-widest uppercase text-text-secondary mb-2">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-base text-text-secondary leading-relaxed max-w-prose">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
