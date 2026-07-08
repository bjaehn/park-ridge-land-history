import type { ReactNode } from "react";

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: ReactNode;
  /** "hero" is for the homepage and section-index landing pages; every other page uses the default. */
  variant?: "default" | "hero";
};

const TITLE_CLASSES: Record<"default" | "hero", string> = {
  default: "text-2xl md:text-3xl font-bold text-text-primary leading-tight",
  hero: "text-3xl md:text-4xl font-bold text-text-primary leading-tight",
};

const SUBTITLE_CLASSES: Record<"default" | "hero", string> = {
  default: "mt-2 text-base text-text-secondary leading-relaxed",
  hero: "mt-2 text-lg text-text-secondary leading-relaxed",
};

/**
 * Single page header component used by every top-level page.
 * Title casing and spacing are enforced here, not per page.
 * No em dashes allowed in any prop.
 */
export function PageHeader({ eyebrow, title, subtitle, action, icon, variant = "default" }: Props) {
  return (
    <div className="flex items-start justify-between gap-6 mb-8">
      <div className="flex items-start gap-3 min-w-0">
        {icon}
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-xs font-semibold tracking-widest uppercase text-text-secondary mb-2">
              {eyebrow}
            </p>
          )}
          <h1 className={TITLE_CLASSES[variant]}>
            {title}
          </h1>
          {subtitle && (
            <p className={SUBTITLE_CLASSES[variant]}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
