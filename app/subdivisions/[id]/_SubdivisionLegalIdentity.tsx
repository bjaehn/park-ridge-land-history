import type { SubdivisionFullDetail, HistoricalSubdivisionLineage } from "@/lib/subdivisionTypes";
import { PlatLayersIcon, SourceIcon } from "@/lib/icons";

type Props = {
  sub: SubdivisionFullDetail;
  lineage: HistoricalSubdivisionLineage[];
};

function formatRecordedDate(
  recordedDate: string | null | undefined,
  recordedYear: number | null | undefined
): string | null {
  if (recordedDate) {
    try {
      return new Date(recordedDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return recordedDate;
    }
  }
  if (recordedYear) return String(recordedYear);
  return null;
}

function LegalField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-0.5">
        {label}
      </dt>
      <dd className="text-sm text-text-primary leading-snug break-words">{value}</dd>
    </div>
  );
}

export function SubdivisionLegalIdentity({ sub, lineage }: Props) {
  const hasPlatBook = Boolean(sub.plat_book || sub.plat_page);
  const hasDocument = Boolean(sub.document_number);
  const hasDeveloper = Boolean(sub.original_owner || sub.developer);
  const hasSurveyor = Boolean(sub.surveyor);

  // Pull section/township/range from the first lineage record that has them
  const geoLineage = lineage.find(
    (l) => l.section || l.township || l.range
  );

  // Pull a legal description source text from lineage (if any)
  const deedSource = lineage.find(
    (l) => l.source_text && l.source_text.trim().length > 20
  );

  const hasAnyField =
    hasPlatBook ||
    hasDocument ||
    hasDeveloper ||
    hasSurveyor ||
    Boolean(geoLineage) ||
    Boolean(deedSource);

  if (!hasAnyField) return null;

  const recordedFormatted = formatRecordedDate(sub.recorded_date, sub.recorded_year);
  const platRef =
    sub.plat_book && sub.plat_page
      ? `Book ${sub.plat_book}, Page ${sub.plat_page}`
      : sub.plat_book
      ? `Plat Book ${sub.plat_book}`
      : sub.plat_page
      ? `Page ${sub.plat_page}`
      : null;

  const geoDescription =
    geoLineage
      ? [
          geoLineage.section ? `Section ${geoLineage.section}` : null,
          geoLineage.township ? `Township ${geoLineage.township}` : null,
          geoLineage.range ? `Range ${geoLineage.range}` : null,
          geoLineage.meridian ? geoLineage.meridian : null,
        ]
          .filter(Boolean)
          .join(", ")
      : null;

  const sourceName =
    sub.source_name ??
    sub.sources?.[0]?.source_name ??
    null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <PlatLayersIcon
          size={14}
          strokeWidth={1.8}
          className="text-text-muted"
          aria-hidden="true"
        />
        <h2 className="section-heading !mb-0">Plat and legal identity</h2>
      </div>

      <div className="bg-surface-card border border-surface-border rounded-lg p-5">
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
          <LegalField label="Recorded" value={recordedFormatted} />
          <LegalField label="Plat reference" value={platRef} />
          <LegalField label="Document number" value={sub.document_number} />
          <LegalField label="Developer" value={sub.original_owner ?? sub.developer} />
          <LegalField label="Surveyor" value={sub.surveyor} />
          <LegalField label="Legal description area" value={geoDescription} />
        </dl>

        {/* Source context */}
        {(sub.source_reference || sourceName) && (
          <div className="mt-4 pt-4 border-t border-surface-border flex items-start gap-2 text-xs text-text-muted">
            <SourceIcon size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              {sourceName && <span className="font-medium">{sourceName}</span>}
              {sourceName && sub.source_reference && <span> - </span>}
              {sub.source_reference && <span>{sub.source_reference}</span>}
            </span>
          </div>
        )}

        {/* Legal description from deed */}
        {deedSource && (
          <div className="mt-4 pt-4 border-t border-surface-border">
            <details>
              <summary className="text-xs font-semibold text-text-muted uppercase tracking-wide cursor-pointer hover:text-text-secondary select-none">
                Source text from deed
              </summary>
              <div className="mt-3 space-y-2">
                <p className="text-xs text-text-muted leading-relaxed italic">
                  This legal description is shown as source text. It identifies the land area or
                  parent tract connected to this subdivision. It is not legal advice.
                </p>
                <blockquote className="text-xs text-text-secondary border-l-2 border-surface-border pl-3 leading-relaxed">
                  {deedSource.source_text}
                </blockquote>
                {deedSource.confidence === "low" || deedSource.needs_verification ? (
                  <p className="text-xs text-text-muted">
                    This source needs additional verification.
                  </p>
                ) : null}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
