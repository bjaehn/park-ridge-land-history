import type { HomeArtifactRecord, ParcelProperties } from "../lib/parcelTypes";

type HistoricMentionsProps = {
  properties: ParcelProperties;
};

type Mention = {
  label: string;
  title: string;
  detail: string;
  source?: string | null;
  href?: string | null;
  tone: "verified" | "lead" | "media";
};

export function HistoricMentions({ properties }: HistoricMentionsProps) {
  const mentions = buildHistoricMentions(properties);
  if (mentions.length === 0) return null;

  const verifiedCount = mentions.filter((mention) => mention.tone === "verified").length;
  const leadCount = mentions.filter((mention) => mention.tone === "lead").length;
  const mediaCount = mentions.filter((mention) => mention.tone === "media").length;

  return (
    <section className="historic-mentions" aria-label="Historic mentions and artifacts">
      <div className="historic-mentions-heading">
        <div>
          <span>Historic mentions</span>
          <h4>What else is attached to this address?</h4>
        </div>
        <p>
          {summarySentence(verifiedCount, mediaCount, leadCount)}
        </p>
      </div>
      <div className="historic-mention-grid">
        {mentions.map((mention, index) => (
          <HistoricMentionCard mention={mention} key={`${mention.label}-${mention.title}-${index}`} />
        ))}
      </div>
    </section>
  );
}

function HistoricMentionCard({ mention }: { mention: Mention }) {
  const body = (
    <>
      <span>{mention.label}</span>
      <strong>{mention.title}</strong>
      <p>{mention.detail}</p>
      {mention.source && <small>{mention.source}</small>}
    </>
  );

  return mention.href ? (
    <a className={`historic-mention-card historic-mention-${mention.tone}`} href={mention.href} rel="noreferrer" target="_blank">
      {body}
    </a>
  ) : (
    <article className={`historic-mention-card historic-mention-${mention.tone}`}>
      {body}
    </article>
  );
}

function buildHistoricMentions(properties: ParcelProperties): Mention[] {
  const mentions: Mention[] = [];

  if (properties.hargis_record_count) {
    mentions.push({
      label: "Historic survey",
      title: properties.hargis_name || properties.hargis_arch_class || "Illinois historic survey match",
      detail: hargisDetail(properties),
      source: properties.hargis_refnum ? `HARGIS ${properties.hargis_refnum}` : "Illinois HARGIS",
      href: properties.hargis_pdf_url || properties.hargis_photo_url || "https://dnrhistoric.illinois.gov/preserve/hargis.html",
      tone: "verified"
    });
  }

  parseRecords(properties.recognized_history_json).forEach((record) => {
    mentions.push(recordMention(record, "Recognized history", "verified"));
  });

  parseRecords(properties.paper_trail_records_json).forEach((record) => {
    const isLead = /lead/i.test(`${record.record_type || ""} ${record.title || ""}`);
    const isMedia = /newspaper|media|article/i.test(`${record.record_type || ""} ${record.source_name || ""}`);
    mentions.push(recordMention(record, isLead ? "Newspaper lead" : isMedia ? "Media mention" : "Paper trail", isLead ? "lead" : isMedia ? "media" : "verified"));
  });

  parseRecords(properties.sanborn_snapshots_json).forEach((record) => {
    const isLead = /lead|lookup needed|verify/i.test(`${record.record_type || ""} ${record.title || ""} ${record.description || ""}`);
    mentions.push(recordMention(record, isLead ? "Sanborn lead" : "Sanborn map", isLead ? "lead" : "verified"));
  });

  parseRecords(properties.directory_records_json).forEach((record) => {
    mentions.push(recordMention(record, "People clue", "lead"));
  });

  return mentions.slice(0, 8);
}

function hargisDetail(properties: ParcelProperties): string {
  const parts = [
    properties.hargis_arch_class ? `Style: ${properties.hargis_arch_class}` : null,
    properties.hargis_architect ? `Architect: ${properties.hargis_architect}` : null,
    properties.hargis_builder ? `Builder: ${properties.hargis_builder}` : null,
    properties.hargis_survey_date ? `Surveyed ${properties.hargis_survey_date}` : null,
    mediaCountLabel(properties.hargis_photo_count, properties.hargis_pdf_count)
  ].filter(Boolean);
  return parts.length ? parts.join(". ") : "Matched to a state historic architecture survey record.";
}

function mediaCountLabel(photoCount?: number | null, pdfCount?: number | null): string | null {
  const photos = photoCount ?? 0;
  const pdfs = pdfCount ?? 0;
  if (!photos && !pdfs) return null;
  const parts = [];
  if (photos) parts.push(`${photos.toLocaleString()} photo${photos === 1 ? "" : "s"}`);
  if (pdfs) parts.push(`${pdfs.toLocaleString()} PDF${pdfs === 1 ? "" : "s"}`);
  return parts.join(", ");
}

function recordMention(record: HomeArtifactRecord, fallbackLabel: string, tone: Mention["tone"]): Mention {
  return {
    label: fallbackLabel,
    title: record.title || record.record_type || artifactKindLabel(record.kind),
    detail: recordDetail(record),
    source: record.source_name || record.access_note || null,
    href: record.document_url || record.source_url || null,
    tone
  };
}

function recordDetail(record: HomeArtifactRecord): string {
  const parts = [
    record.year || record.map_year || record.source_year ? String(record.year || record.map_year || record.source_year) : null,
    record.resident_display,
    record.sheet ? `sheet ${record.sheet}` : null,
    record.case_number ? `case ${record.case_number}` : null,
    record.description,
    record.access_note
  ].filter(Boolean);
  return parts.join(" - ") || "Public-history clue attached to this address.";
}

function parseRecords(value?: HomeArtifactRecord[] | string | null): HomeArtifactRecord[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(isRecord);
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(isRecord) : [];
  } catch {
    return [];
  }
}

function isRecord(value: unknown): value is HomeArtifactRecord {
  return Boolean(value && typeof value === "object");
}

function artifactKindLabel(kind?: string | null): string {
  if (kind === "directory_record") return "Directory clue";
  if (kind === "sanborn_snapshot") return "Sanborn map";
  if (kind === "paper_trail_record") return "Paper trail";
  if (kind === "recognized_history") return "Recognized history";
  return "Historic clue";
}

function summarySentence(verifiedCount: number, mediaCount: number, leadCount: number): string {
  const parts = [];
  if (verifiedCount) parts.push(`${verifiedCount.toLocaleString()} verified clue${verifiedCount === 1 ? "" : "s"}`);
  if (mediaCount) parts.push(`${mediaCount.toLocaleString()} media mention${mediaCount === 1 ? "" : "s"}`);
  if (leadCount) parts.push(`${leadCount.toLocaleString()} research lead${leadCount === 1 ? "" : "s"}`);
  return parts.length ? parts.join(", ") : "No historic mentions found yet";
}
