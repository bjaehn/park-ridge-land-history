import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SOURCES, NEIGHBORHOOD_BOUNDARY_DISCLAIMER } from "@/lib/content";
import { CONFIDENCE_DESCRIPTION } from "@/lib/formatters";

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
            <li>{NEIGHBORHOOD_BOUNDARY_DISCLAIMER}</li>
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
            <li><strong className="text-text-primary">High:</strong> The record is directly supported by official Cook County records. Key fields such as year built, address, and PIN are complete and consistent. {CONFIDENCE_DESCRIPTION.High}</li>
            <li><strong className="text-text-primary">Medium:</strong> The record is inferred from multiple consistent sources, or approximated from spatial joins. The data is plausible but relies on at least one step of interpretation. {CONFIDENCE_DESCRIPTION.Medium}</li>
            <li><strong className="text-text-primary">Low:</strong> Key facts are missing, inconsistent, or sourced from less authoritative data. The record may still be useful but should be treated with caution. {CONFIDENCE_DESCRIPTION.Low}</li>
          </ul>
          <p className="text-sm mt-3">
            This is the property-level confidence model, shown wherever a property's confidence badge appears. Subdivision records, historical facts, and teardown detection each use a related but distinct confidence convention, suited to their own source types (deed and plat records for subdivisions; cited sources for historical facts; permit and assessment records for teardown detection) rather than one universal definition.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-2">How development signals work</h2>
          <p className="text-sm mb-3">
            Each property, block, and neighborhood is assigned a development signal that summarizes recent activity. The signal is calculated from permit count, sale count, and teardown count using fixed thresholds.
          </p>
          <ul className="text-sm space-y-2 list-disc list-inside">
            <li><strong className="text-text-primary">Active redevelopment:</strong> One or more recent teardowns detected, or three or more recent permits on record. Indicates active redevelopment or high construction concentration.</li>
            <li><strong className="text-text-primary">Ongoing improvements:</strong> Two or more total permits on record and no teardown detected. Suggests ongoing improvement activity.</li>
            <li><strong className="text-text-primary">Frequently resold:</strong> Four or more recorded sales and no teardown or high-permit activity. Indicates a property that has changed hands frequently.</li>
            <li><strong className="text-text-primary">No recent activity:</strong> Fewer than two permits and three or fewer sales. No detected teardown or active permit work.</li>
          </ul>
          <p className="text-sm mt-3">
            These signals are computed automatically from available data. They are interpretive labels, not official designations. Permit records before 2018 are incomplete, which may cause some properties to show No recent activity when earlier activity exists.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-2">What is not yet in the record</h2>
          <p className="text-sm mb-3">
            The following historical sources would improve the depth and accuracy of this dataset but have not yet been integrated. They represent the gap between what is documented here and the full historical record of Park Ridge.
          </p>
          <ul className="text-sm space-y-2 list-disc list-inside">
            <li><strong className="text-text-primary">Park Ridge city directories (1900s to 1970s):</strong> Annual or biennial directories listing residents by address. These would allow tracing occupancy history and first-occupancy dates independent of assessor records.</li>
            <li><strong className="text-text-primary">Sanborn fire insurance maps:</strong> Detailed block-by-block building footprint maps published for Park Ridge from approximately the 1890s to 1950s. These would allow verifying construction dates and original building forms.</li>
            <li><strong className="text-text-primary">Historic newspaper archives (Park Ridge Herald and predecessors):</strong> Local newspaper coverage of subdivision announcements, home completions, and neighborhood developments would add primary-source narrative to subdivision records.</li>
            <li><strong className="text-text-primary">Cook County deed chain records pre-1970:</strong> Grantor-grantee deed index going back to the 1870s would allow tracing land transfers before the assessor sale record begins in the 1990s.</li>
            <li><strong className="text-text-primary">Permit records before 2018:</strong> The City of Park Ridge permit data available here begins in 2018. Earlier permit records exist at City Hall but have not been digitized or integrated.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-2">What is not shown</h2>
          <p className="text-sm">
            Owner names are never displayed, even in raw data views. Internal data-quality flags are visible only in the raw data disclosure, not in primary property views.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-2">What to do if something looks wrong</h2>
          <ul className="text-sm space-y-3 list-disc list-inside">
            <li>
              <strong className="text-text-primary">Year built looks wrong:</strong> The authoritative source is the Cook County Assessor parcel search at cookcountyassessor.com. Look up the PIN shown on the property page. If the assessor record shows a different year, the assessor is correct and this app may be displaying stale data.
            </li>
            <li>
              <strong className="text-text-primary">Subdivision name looks wrong:</strong> The authoritative source for recorded plat names is the Cook County Recorder of Deeds. The plat name shown here is drawn from the legal description in deed records. Alternate names and shortened versions are common and both may be correct.
            </li>
            <li>
              <strong className="text-text-primary">Something else looks wrong or is missing:</strong> Use the contact link on the <a href="/about" className="text-accent-purple hover:underline">About page</a> to report it. Include the property address or PIN and a description of what appears incorrect.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
