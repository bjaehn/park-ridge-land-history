import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

export const metadata: Metadata = {
  title: "Streets",
  description: "Browse every street in Park Ridge, block by block.",
};

export default function StreetsPage() {
  return (
    <div className="page-shell max-w-prose">
      <Breadcrumb
        items={[
          { label: "Park Ridge", href: "/city" },
          { label: "Streets", current: true },
        ]}
      />
      <PageHeader
        eyebrow="Park Ridge"
        title="Streets"
        subtitle="Browse every street in Park Ridge, block by block."
      />
      <div className="text-sm text-text-secondary leading-relaxed">
        <p>
          Each street page shows all properties on that street, grouped by construction era. To find
          a specific street, search for any address on that street using the{" "}
          <Link href="/" className="text-accent-purple hover:underline">
            search bar on the homepage
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
