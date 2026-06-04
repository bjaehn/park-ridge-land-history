import type { ReactNode } from "react";

type AccordionSectionProps = {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function AccordionSection({
  title,
  summary,
  defaultOpen = false,
  children
}: AccordionSectionProps) {
  return (
    <details className="accordion-section" open={defaultOpen}>
      <summary className="accordion-heading">
        <span>
          <strong>{title}</strong>
          {summary && <small>{summary}</small>}
        </span>
      </summary>
      <div className="accordion-body">{children}</div>
    </details>
  );
}
