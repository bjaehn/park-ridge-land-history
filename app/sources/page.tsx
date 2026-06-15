import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SOURCES } from "@/lib/content";

export const metadata: Metadata = {
  title: "Data sources",
  description: "Sources, methodology, and known limitations for Park Ridge Land History.",
};

export default function SourcesPage() {
  return (
    <div className="page-shell max-w-prose">
      <Breadcrumb items={[{ label: "Data sources", current: true }]} />
      <PageHeader
        title="Data sources"
        subtitle="Where the data comes from, how it is joined, and what we know we are missing."
      />

      <div className="space-y-8 text-text-secondary leading-relaxed">
        {Object.values(SOURCES).map((src) => (
          <section key={src.label}>
            <h2 className="text-base font-semibold text-text-primary mb-2">{src.label}</h2>
            <p className="text-sm">{src.detail}</p>
          </section>
        ))}

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-2">Known limitations</h2>
          <ul className="text-sm space-y-2 list-disc list-inside">
            <li>About 9% of parcels (approximately 1,190) could not be matched to a street address using the available data. These appear as "Address not on record" and are excluded from ranked lists unless otherwise noted.</li>
            <li>Neighborhood boundaries are approximate. They are derived from Census tract groupings, not official Park Ridge boundaries. The five area labels are for orientation only.</li>
            <li>Build year is sourced from the Cook County assessor. It reflects the year the primary improvement was first assessed, which may differ from the actual construction date by a year or two.</li>
            <li>Permit records have gaps, especially before 1990. The absence of a permit does not mean no work was done.</li>
            <li>Sale records come from assessor data and cover sales since approximately 1999. Earlier sales are not reflected.</li>
            <li>Subdivision plat recording dates are taken from the Cook County Recorder index. Where the date is uncertain, a confidence level is shown on the subdivision page.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-2">What is not shown</h2>
          <p className="text-sm">
            Owner names are never displayed, even in raw data views. Internal data-quality flags are visible only in the raw data disclosure, not in primary property views.
          </p>
        </section>
      </div>
    </div>
  );
}
