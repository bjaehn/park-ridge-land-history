import { formatCurrency, formatNumber, formatYear } from "../lib/formatters";
import type { HargisMediaItem, HomeArtifactRecord, ParcelProperties } from "../lib/parcelTypes";

type HouseBiographyProps = {
  properties: ParcelProperties;
};

type Artifact = {
  label: string;
  detail: string;
  href?: string | null;
};

type StoryInsight = {
  label: string;
  value: string;
  detail: string;
};

const saleHistoryStartYear = 1999;

export function HouseBiography({ properties }: HouseBiographyProps) {
  const artifacts = houseArtifacts(properties);
  const storyParagraphs = propertyStoryParagraphs(properties);
  const storyInsights = propertyStoryInsights(properties);
  const photoItems = hargisPhotoItems(properties);
  const pdfItems = hargisPdfItems(properties);
  const homeArtifactGroups = groupedHomeArtifacts(properties);
  const featuredPdf = pdfItems[0];

  return (
    <div className="house-biography" aria-label="House biography">
      <div className="house-biography-intro">
        <span>Home ancestry</span>
        <p>{biographySummary(properties)}</p>
      </div>

      <div className="home-ancestry-story" aria-label="Property story summary">
        {storyParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <div className="ancestry-summary-grid" aria-label="Home ancestry summary">
        {storyInsights.map((insight) => (
          <article key={insight.label}>
            <span>{insight.label}</span>
            <strong>{insight.value}</strong>
            <p>{insight.detail}</p>
          </article>
        ))}
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
          <h4>Photos and records</h4>
          <p>Historic survey images, PDFs, and source records attached to this home story.</p>
        </div>
        {photoItems.length > 0 && (
          <div className="artifact-gallery" aria-label="Historic survey photos">
            {photoItems.map((photo, index) => (
              <a
                className="artifact-photo-tile"
                href={photo.url || "#"}
                key={`${photo.url || photo.item_id || photo.photo_id || "photo"}-${index}`}
                rel="noreferrer"
                target="_blank"
              >
                <img
                  alt={photo.label || `Historic survey photo ${index + 1} for ${properties.address || "this property"}`}
                  loading="lazy"
                  src={photo.url || ""}
                />
                <span>{photo.label || `Historic photo ${index + 1}`}</span>
              </a>
            ))}
          </div>
        )}
        {featuredPdf?.url && (
          <div className="artifact-preview artifact-pdf-preview">
            <iframe loading="lazy" src={featuredPdf.url} title={featuredPdf.label || "Historic survey PDF preview"} />
            <a href={featuredPdf.url} rel="noreferrer" target="_blank">
              Open full survey PDF
            </a>
          </div>
        )}
        {pdfItems.length > 0 && (
          <div className="document-tray" aria-label="Historic survey PDFs">
            {pdfItems.map((pdf, index) => (
              <a
                className="document-pill"
                href={pdf.url || "#"}
                key={`${pdf.url || pdf.item_id || "pdf"}-${index}`}
                rel="noreferrer"
                target="_blank"
              >
                <strong>{pdf.label || `Survey PDF ${index + 1}`}</strong>
                <span>{pdf.refnum ? `HARGIS ${pdf.refnum}` : "Historic survey document"}</span>
              </a>
            ))}
          </div>
        )}
        {homeArtifactGroups.length > 0 && (
          <div className="home-artifact-shelves" aria-label="Home history source clues">
            {homeArtifactGroups.map((group) => (
              <section className="home-artifact-shelf" key={group.label}>
                <div>
                  <h5>{group.label}</h5>
                  <p>{group.detail}</p>
                </div>
                <div className="home-artifact-grid">
                  {group.items.map((item, index) => (
                    <HomeArtifactCard item={item} key={`${group.label}-${item.title || item.source_url || index}`} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
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
  pieces.push(salePatternSentence(properties));
  pieces.push(updatePatternSentence(properties));
  if (properties.hargis_record_count) {
    const style = properties.hargis_arch_class ? `, including ${properties.hargis_arch_class} style` : "";
    pieces.push(`appears in the Illinois historic survey${style}`);
  }
  const clueCount = homeArtifactCount(properties);
  if (clueCount) {
    pieces.push(`has ${clueCount.toLocaleString()} extra public-history clue${clueCount === 1 ? "" : "s"}`);
  }
  pieces.push(valuePatternSentence(properties));
  return `${pieces.join("; ")}.`;
}

function propertyStoryParagraphs(properties: ParcelProperties): string[] {
  return [
    buildStorySentence(properties),
    `${salePatternSentence(properties)}. ${updatePatternSentence(properties)}.`,
    `${valuePatternSentence(properties)}.`
  ];
}

function propertyStoryInsights(properties: ParcelProperties): StoryInsight[] {
  return [
    {
      label: "Sales rhythm",
      value: saleInsightValue(properties),
      detail: saleInsightDetail(properties)
    },
    {
      label: "Update signal",
      value: updateInsightValue(properties),
      detail: updateInsightDetail(properties)
    },
    {
      label: "Value change",
      value: valueInsightValue(properties),
      detail: valueInsightDetail(properties)
    }
  ];
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
      value: formatNumber((properties.hargis_photo_count ?? 0) + (properties.hargis_pdf_count ?? 0) + homeArtifactCount(properties)),
      detail: "linked photos, PDFs, and public-history clues"
    }
  ];
}

function buildStorySentence(properties: ParcelProperties): string {
  const year = formatYear(properties.year_built);
  if (year === "Unknown") return "The public record does not yet show a reliable build year for this property.";
  const historicSurvey = properties.hargis_record_count
    ? historicSurveySentence(properties)
    : "No historic survey artifact is attached yet.";
  return `The home story starts around ${year}${properties.decade_built ? `, in the ${properties.decade_built} build group` : ""}. ${historicSurvey}`;
}

function historicSurveySentence(properties: ParcelProperties): string {
  const details = [
    properties.hargis_arch_class ? `${properties.hargis_arch_class} architecture` : null,
    properties.hargis_architect ? `architect ${properties.hargis_architect}` : null,
    properties.hargis_builder ? `builder ${properties.hargis_builder}` : null
  ].filter(Boolean);
  if (!details.length) return "It also has a match in the Illinois historic architecture survey.";
  return `It also has a match in the Illinois historic architecture survey with ${details.join(", ")}.`;
}

function salePatternSentence(properties: ParcelProperties): string {
  const count = properties.sale_count ?? 0;
  if (count === 0) return "No market sale record has been found since 1999";
  if (count === 1) {
    const latest = formatYear(properties.latest_sale_year);
    return latest === "Unknown" ? "It has sold once since 1999" : `It has sold once since 1999, most recently in ${latest}`;
  }
  const yearsPerSale = Math.max(1, Math.round((new Date().getFullYear() - saleHistoryStartYear + 1) / count));
  const latest = formatYear(properties.latest_sale_year);
  const latestText = latest === "Unknown" ? "" : `, most recently in ${latest}`;
  return `It has sold ${count.toLocaleString()} times since 1999, about once every ${yearsPerSale} years${latestText}`;
}

function saleInsightValue(properties: ParcelProperties): string {
  const count = properties.sale_count ?? 0;
  if (count === 0) return "No sales found";
  if (count === 1) return "Sold once";
  return `${count.toLocaleString()} sales`;
}

function saleInsightDetail(properties: ParcelProperties): string {
  const count = properties.sale_count ?? 0;
  if (count === 0) return "No Cook County market sale record is attached to this parcel since 1999.";
  const price = formatCurrency(properties.latest_sale_price);
  const latest = formatYear(properties.latest_sale_year);
  const priceText = price === "Unknown" ? "" : ` for ${price}`;
  if (count === 1) {
    return latest === "Unknown" ? "One market sale is attached to the parcel record." : `Latest sale: ${latest}${priceText}.`;
  }
  return latest === "Unknown" ? "Multiple market sale records are attached." : `Latest sale: ${latest}${priceText}.`;
}

function updatePatternSentence(properties: ParcelProperties): string {
  const count = properties.permit_count ?? 0;
  if (count === 0) return "No permit record is attached to the property timeline";
  const latest = formatYear(properties.latest_permit_year);
  const latestText = latest === "Unknown" ? "" : `, with the latest in ${latest}`;
  return `${updateSentenceLead(count)}: ${formatCount(count, "permit record")}${latestText}`;
}

function updateInsightValue(properties: ParcelProperties): string {
  const count = properties.permit_count ?? 0;
  if (count === 0) return "Quiet record";
  return updateLevelLabel(count);
}

function updateInsightDetail(properties: ParcelProperties): string {
  const count = properties.permit_count ?? 0;
  const recent = properties.recent_permit_count ?? 0;
  if (count === 0) return "No remodeling, addition, garage, porch, deck, or teardown permit has been matched yet.";
  const latest = formatYear(properties.latest_permit_year);
  const latestText = latest === "Unknown" ? "" : ` Latest permit year: ${latest}.`;
  const recentText = recent > 0 ? ` ${recent.toLocaleString()} recent permit${recent === 1 ? "" : "s"} in the selected window.` : "";
  return `${formatCount(count, "permit record")} found.${latestText}${recentText}`;
}

function updateLevelLabel(count: number): string {
  if (count >= 8) return "Heavily updated";
  if (count >= 3) return "Updated";
  if (count >= 1) return "Lightly updated";
  return "Quiet record";
}

function updateSentenceLead(count: number): string {
  if (count >= 8) return "The permit record shows a lot of work";
  if (count >= 3) return "The permit record shows meaningful updates";
  if (count >= 1) return "The permit record shows light updates";
  return "The permit record is quiet";
}

function valuePatternSentence(properties: ParcelProperties): string {
  const latestValue = formatCurrency(properties.latest_assessed_total);
  if (latestValue === "Unknown") return "No assessed value trend is attached yet";
  const latestYear = formatYear(properties.latest_assessed_year);
  const firstValue = formatCurrency(properties.first_assessed_total);
  const firstYear = formatYear(properties.first_assessed_year);
  if (
    firstValue !== "Unknown" &&
    firstYear !== "Unknown" &&
    latestYear !== "Unknown" &&
    firstYear !== latestYear &&
    typeof properties.assessed_value_change_pct === "number"
  ) {
    return `Assessed value changed ${formatSignedPercent(properties.assessed_value_change_pct)} from ${firstValue} in ${firstYear} to ${latestValue} in ${latestYear}`;
  }
  return latestYear === "Unknown" ? `Latest assessed value is ${latestValue}` : `Latest assessed value is ${latestValue} in ${latestYear}`;
}

function valueInsightValue(properties: ParcelProperties): string {
  if (typeof properties.assessed_value_change_pct === "number") {
    return formatSignedPercent(properties.assessed_value_change_pct);
  }
  return formatCurrency(properties.latest_assessed_total);
}

function valueInsightDetail(properties: ParcelProperties): string {
  const latestValue = formatCurrency(properties.latest_assessed_total);
  if (latestValue === "Unknown") return "No assessment trend has been matched to this parcel yet.";
  const latestYear = formatYear(properties.latest_assessed_year);
  const firstValue = formatCurrency(properties.first_assessed_total);
  const firstYear = formatYear(properties.first_assessed_year);
  if (firstValue !== "Unknown" && firstYear !== "Unknown" && latestYear !== "Unknown" && firstYear !== latestYear) {
    return `${firstValue} in ${firstYear} to ${latestValue} in ${latestYear}.`;
  }
  return latestYear === "Unknown" ? `Latest value: ${latestValue}.` : `Latest value: ${latestValue} in ${latestYear}.`;
}

function houseArtifacts(properties: ParcelProperties): Artifact[] {
  const artifacts: Artifact[] = [];
  const photos = hargisPhotoItems(properties);
  const pdfs = hargisPdfItems(properties);
  if (properties.hargis_photo_count || photos.length) {
    const photoCount = properties.hargis_photo_count || photos.length;
    artifacts.push({
      label: photoCount > 1 ? "Historic survey photos" : "Historic survey photo",
      detail: `${photoCount.toLocaleString()} linked HARGIS photo${photoCount === 1 ? "" : "s"}`,
      href: photos[0]?.url || properties.hargis_photo_url
    });
  }
  if (properties.hargis_pdf_count || pdfs.length) {
    const pdfCount = properties.hargis_pdf_count || pdfs.length;
    artifacts.push({
      label: pdfCount > 1 ? "Historic survey PDFs" : "Historic survey PDF",
      detail: `${pdfCount.toLocaleString()} linked HARGIS PDF${pdfCount === 1 ? "" : "s"}`,
      href: pdfs[0]?.url || properties.hargis_pdf_url
    });
  }
  if (properties.hargis_refnum) {
    artifacts.push({
      label: "HARGIS record",
      detail: `Illinois historic architecture survey record ${properties.hargis_refnum}`
    });
  }
  for (const group of groupedHomeArtifacts(properties)) {
    artifacts.push({
      label: group.label,
      detail: `${group.items.length.toLocaleString()} ${group.items.length === 1 ? "clue" : "clues"} attached`,
      href: artifactHref(group.items[0])
    });
  }
  return artifacts;
}

function HomeArtifactCard({ item }: { item: HomeArtifactRecord }) {
  const href = artifactHref(item);
  const body = (
    <>
      <strong>{item.title || artifactKindLabel(item.kind)}</strong>
      <span>{homeArtifactDetail(item)}</span>
      {homeArtifactSource(item) && <small>{homeArtifactSource(item)}</small>}
    </>
  );
  return href ? (
    <a className="home-artifact-card" href={href} rel="noreferrer" target="_blank">
      {body}
    </a>
  ) : (
    <div className="home-artifact-card">{body}</div>
  );
}

function groupedHomeArtifacts(properties: ParcelProperties): Array<{ label: string; detail: string; items: HomeArtifactRecord[] }> {
  return [
    {
      label: "City files",
      detail: "Public case records for exterior changes, appearance review, zoning, or similar city decisions.",
      items: parseHomeArtifactRecords(properties.civic_records_json)
    },
    {
      label: "Directory clues",
      detail: "Address breadcrumbs from city directories, phone books, and local history indexes.",
      items: parseHomeArtifactRecords(properties.directory_records_json)
    },
    {
      label: "Sanborn maps",
      detail: "Fire insurance map references that can reveal older footprints, materials, porches, and outbuildings.",
      items: parseHomeArtifactRecords(properties.sanborn_snapshots_json)
    },
    {
      label: "Paper trail",
      detail: "Recorded land documents such as deeds, mortgages, releases, quit claims, liens, and foreclosure-related filings.",
      items: parseHomeArtifactRecords(properties.paper_trail_records_json)
    },
    {
      label: "Recognized history",
      detail: "Local landmark, 100-year-home, or other recognized historic status tied to this address.",
      items: parseHomeArtifactRecords(properties.recognized_history_json)
    },
    {
      label: "Land family",
      detail: "Subdivision, plat, lot/block, developer, or street-bounded family clues for this parcel.",
      items: parseHomeArtifactRecords(properties.land_family_records_json)
    }
  ].filter((group) => group.items.length > 0);
}

function parseHomeArtifactRecords(value?: HomeArtifactRecord[] | string | null): HomeArtifactRecord[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((item): item is HomeArtifactRecord => Boolean(item && typeof item === "object"));
  }
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is HomeArtifactRecord => Boolean(item && typeof item === "object"));
  } catch {
    return [];
  }
}

function homeArtifactCount(properties: ParcelProperties): number {
  return (
    (properties.civic_record_count ?? 0) +
    (properties.directory_record_count ?? 0) +
    (properties.sanborn_snapshot_count ?? 0) +
    (properties.paper_trail_record_count ?? 0) +
    (properties.recognized_history_count ?? 0) +
    (properties.land_family_record_count ?? 0)
  );
}

function artifactHref(item?: HomeArtifactRecord | null): string | null {
  return item?.document_url || item?.source_url || null;
}

function homeArtifactDetail(item: HomeArtifactRecord): string {
  const year = formatYear(item.year || item.map_year || item.source_year);
  const parts = [
    year !== "Unknown" ? year : null,
    item.case_number ? `case ${item.case_number}` : null,
    item.sheet ? `sheet ${item.sheet}` : null,
    item.resident_display,
    item.description
  ].filter(Boolean);
  return parts.length ? parts.join(" - ") : "Public-history clue attached to this address.";
}

function homeArtifactSource(item: HomeArtifactRecord): string | null {
  return item.source_name || item.access_note || item.rights_note || null;
}

function artifactKindLabel(kind?: string | null): string {
  if (kind === "civic_record") return "City file";
  if (kind === "directory_record") return "Directory clue";
  if (kind === "sanborn_snapshot") return "Sanborn map";
  if (kind === "paper_trail_record") return "Recorded land document";
  if (kind === "recognized_history") return "Recognized history";
  if (kind === "land_family_record") return "Land family clue";
  return "History clue";
}

function hargisPhotoItems(properties: ParcelProperties): HargisMediaItem[] {
  const items = parseHargisMedia(properties.hargis_photos_json).filter((item) => item.url);
  if (items.length > 0) return items;
  return properties.hargis_photo_url
    ? [
        {
          type: "photo",
          refnum: properties.hargis_refnum,
          label: "Historic survey photo",
          url: properties.hargis_photo_url
        }
      ]
    : [];
}

function hargisPdfItems(properties: ParcelProperties): HargisMediaItem[] {
  const items = parseHargisMedia(properties.hargis_pdfs_json).filter((item) => item.url);
  if (items.length > 0) return items;
  return properties.hargis_pdf_url
    ? [
        {
          type: "pdf",
          refnum: properties.hargis_refnum,
          label: "Historic survey PDF",
          url: properties.hargis_pdf_url
        }
      ]
    : [];
}

function parseHargisMedia(value?: HargisMediaItem[] | string | null): HargisMediaItem[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((item): item is HargisMediaItem => Boolean(item && typeof item === "object"));
  }
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is HargisMediaItem => Boolean(item && typeof item === "object"));
  } catch {
    return [];
  }
}

function formatCount(value: number | null | undefined, label: string): string {
  const count = value ?? 0;
  return `${count.toLocaleString()} ${label}${count === 1 ? "" : "s"}`;
}

function formatSignedPercent(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toLocaleString()}%`;
}
