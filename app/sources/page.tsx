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
          <h2 className="text-base font-semibold text-text-primary mb-2">How we connect the data</h2>
          <p className="text-sm">
            Each parcel record is linked to its property history using the Cook County 14-digit PIN as the common key. Sale records, permit records, and assessment history are each joined to the parcel table using PIN matching. Subdivision plats are linked through two methods: spatial joins (a parcel is assigned to a subdivision when its boundary falls within the recorded plat boundary) and legal description matching from deed records. HARGIS survey records are matched by address and parcel proximity. Neighborhood classifications are derived from spatial joins with approximate boundary polygons based on City of Park Ridge planning areas and locally recognized neighborhood names.
          </p>
        </section>

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
          <h2 className="text-base font-semibold text-text-primary mb-2">How confidence levels work</h2>
          <p className="text-sm mb-3">
            Each property record is assigned a confidence level based on the completeness and consistency of its data.
          </p>
          <ul className="text-sm space-y-2 list-disc list-inside">
            <li><strong className="text-text-primary">High:</strong> The record is directly supported by official Cook County records. Key fields such as year built, address, and PIN are complete and consistent.</li>
            <li><strong className="text-text-primary">Medium:</strong> The record is inferred from multiple consistent sources, or approximated from spatial joins. The data is plausible but relies on at least one step of interpretation.</li>
            <li><strong className="text-text-primary">Low:</strong> Key facts are missing, inconsistent, or sourced from less authoritative data. The record may still be useful but should be treated with caution.</li>
          </ul>
          <p className="text-sm mt-3">
            These definitions appear throughout the app wherever confidence badges are shown.
          </p>
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
