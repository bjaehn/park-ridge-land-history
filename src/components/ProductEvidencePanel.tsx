import type { ReactNode } from "react";
import type { AnalysisScale } from "./AnalysisTabs";

type ProductEvidencePanelProps = {
  activeScale: AnalysisScale;
  children: ReactNode;
};

type EvidenceCopy = {
  title: string;
  description: string;
  items: Array<{ label: string; detail: string }>;
};

const evidenceByScale: Record<AnalysisScale, EvidenceCopy> = {
  home: {
    title: "Evidence for this property",
    description: "The map helps locate the selected home. The story comes from parcel, permit, sale, value, and historic records.",
    items: [
      { label: "Permits", detail: "Work history and major changes" },
      { label: "Sales", detail: "How often ownership changed" },
      { label: "Value", detail: "Assessment movement over time" },
      { label: "Artifacts", detail: "Historic surveys, photos, PDFs, and public records" }
    ]
  },
  block: {
    title: "Evidence for this block",
    description: "The map shows the selected street context. The analysis compares nearby homes around the starting property.",
    items: [
      { label: "Nearby homes", detail: "Immediate residential context" },
      { label: "Permit activity", detail: "Remodeling, additions, and rebuild signals" },
      { label: "Recent sales", detail: "Turnover around the address" },
      { label: "Age mix", detail: "Older homes and newer construction nearby" }
    ]
  },
  area: {
    title: "Evidence for this area",
    description: "The map shows neighborhood shapes or change zones. The analysis compares groups of blocks rather than one address.",
    items: [
      { label: "Neighborhoods", detail: "Common Park Ridge area groupings" },
      { label: "Reinvestment", detail: "Remodeling and addition activity" },
      { label: "Turnover", detail: "Homes sold in the last few years" },
      { label: "Older homes", detail: "Historic fabric and long-standing pockets" }
    ]
  },
  city: {
    title: "Evidence for Park Ridge",
    description: "The map shows citywide patterns. The analysis compares neighborhoods and explains how the whole city is changing.",
    items: [
      { label: "All parcels", detail: "Current Park Ridge property fabric" },
      { label: "Build years", detail: "How the city filled in over time" },
      { label: "Permits", detail: "Remodeling, additions, and rebuild signals" },
      { label: "Historical layers", detail: "Older parcel shapes, aerials, HARGIS, and building context" }
    ]
  }
};

export function ProductEvidencePanel({ activeScale, children }: ProductEvidencePanelProps) {
  const copy = evidenceByScale[activeScale];

  return (
    <section className="panel-section product-evidence" aria-label={copy.title}>
      <div className="product-evidence-heading">
        <h2>{copy.title}</h2>
        <p>{copy.description}</p>
      </div>
      <div className="evidence-item-grid">
        {copy.items.map((item) => (
          <article key={item.label}>
            <strong>{item.label}</strong>
            <span>{item.detail}</span>
          </article>
        ))}
      </div>
      <details className="evidence-map-controls">
        <summary>
          <span>
            <strong>Evidence on the map</strong>
            <small>Choose what the map should display while this tab explains the results.</small>
          </span>
        </summary>
        <div className="evidence-map-body">{children}</div>
      </details>
    </section>
  );
}
