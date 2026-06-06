import { formatCurrency, formatNumber, formatYear } from "../lib/formatters";
import type { ParcelProperties } from "../lib/parcelTypes";

type HouseBiographyProps = {
  properties: ParcelProperties;
};

type Artifact = {
  label: string;
  detail: string;
  href?: string | null;
};

export function HouseBiography({ properties }: HouseBiographyProps) {
  const artifacts = houseArtifacts(properties);

  return (
    <div className="house-biography" aria-label="House biography">
      <div className="house-biography-intro">
        <span>House biography</span>
        <p>{biographySummary(properties)}</p>
      </div>

      <div className="biography-chapters" aria-label="House record chapters">
        {biographyChapters(properties).map((chapter) => (
          <article key={chapter.label}>
            <span>{chapter.label}</span>
            <strong>{chapter.value}</strong>
            <small>{chapter.detail}</small>
          </article>
        ))}
      </div>

      <div className="evidence-drawer">
        <div>
          <h4>Evidence</h4>
          <p>Photos, PDFs, and records attached to this home story.</p>
        </div>
        {artifacts.length === 0 ? (
          <p className="quiet-note evidence-empty">No linked artifacts yet.</p>
        ) : (
          <div className="artifact-list">
            {artifacts.map((artifact) =>
              artifact.href ? (
                <a className="artifact-card" href={artifact.href} key={artifact.label} rel="noreferrer" target="_blank">
                  <strong>{artifact.label}</strong>
                  <span>{artifact.detail}</span>
                </a>
              ) : (
                <div className="artifact-card" key={artifact.label}>
                  <strong>{artifact.label}</strong>
                  <span>{artifact.detail}</span>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function biographySummary(properties: ParcelProperties): string {
  const pieces = [];
  const year = formatYear(properties.year_built);
  pieces.push(year === "Unknown" ? "The build year is not yet known" : `Built around ${year}`);
  pieces.push(`${formatCount(properties.sale_count, "ownership record")} since 1999`);
  pieces.push(`${formatCount(properties.permit_count, "permit record")} in the timeline`);
  if (properties.hargis_record_count) {
    const style = properties.hargis_arch_class ? `, including ${properties.hargis_arch_class} style` : "";
    pieces.push(`appears in the Illinois historic survey${style}`);
  }
  if (properties.latest_assessed_total) {
    pieces.push(`latest assessed value ${formatCurrency(properties.latest_assessed_total)}`);
  }
  return `${pieces.join("; ")}.`;
}

function biographyChapters(properties: ParcelProperties) {
  return [
    {
      label: "Built",
      value: formatYear(properties.year_built),
      detail: properties.decade_built ? `${properties.decade_built} assessor decade` : "Assessor build year"
    },
    {
      label: "Ownership",
      value: formatNumber(properties.sale_count ?? 0),
      detail: "market sale records since 1999"
    },
    {
      label: "Work",
      value: formatNumber(properties.permit_count ?? 0),
      detail: "permit records found"
    },
    {
      label: "Value",
      value: formatCurrency(properties.latest_assessed_total),
      detail: properties.latest_assessed_year ? `latest assessment year ${properties.latest_assessed_year}` : "assessment record"
    },
    {
      label: "Artifacts",
      value: formatNumber((properties.hargis_photo_count ?? 0) + (properties.hargis_pdf_count ?? 0)),
      detail: "linked photos and PDFs"
    }
  ];
}

function houseArtifacts(properties: ParcelProperties): Artifact[] {
  const artifacts: Artifact[] = [];
  if (properties.hargis_photo_count) {
    artifacts.push({
      label: properties.hargis_photo_count > 1 ? "Historic survey photos" : "Historic survey photo",
      detail: `${properties.hargis_photo_count.toLocaleString()} linked HARGIS photo${properties.hargis_photo_count === 1 ? "" : "s"}`,
      href: properties.hargis_photo_url
    });
  }
  if (properties.hargis_pdf_count) {
    artifacts.push({
      label: properties.hargis_pdf_count > 1 ? "Historic survey PDFs" : "Historic survey PDF",
      detail: `${properties.hargis_pdf_count.toLocaleString()} linked HARGIS PDF${properties.hargis_pdf_count === 1 ? "" : "s"}`,
      href: properties.hargis_pdf_url
    });
  }
  if (properties.hargis_refnum) {
    artifacts.push({
      label: "HARGIS record",
      detail: `Illinois historic architecture survey record ${properties.hargis_refnum}`
    });
  }
  return artifacts;
}

function formatCount(value: number | null | undefined, label: string): string {
  const count = value ?? 0;
  return `${count.toLocaleString()} ${label}${count === 1 ? "" : "s"}`;
}
