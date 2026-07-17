import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { MapView } from "@/components/MapView";
import { CityIcon } from "@/lib/icons";
import { CityContent } from "./_CityContent";

export const metadata: Metadata = {
  title: "City history",
  description: "How Park Ridge grew, decade by decade. Development history for the full city.",
  alternates: { canonical: "/city" },
};

export default async function CityPage() {
  return (
    <div className="page-shell">
      <Breadcrumb
        items={[{ label: "Park Ridge", current: true }]}
      />
      <PageHeader
        eyebrow="Park Ridge, Illinois"
        title="City history"
        subtitle="How Park Ridge's 13,000+ properties took shape, decade by decade."
        icon={<CityIcon size={22} strokeWidth={1.5} className="text-text-muted mt-1 shrink-0" aria-hidden="true" />}
      />

      <CityContent
        mapSlot={
          <div className="map-full-bleed">
            <MapView scope={{ kind: "city" }} height="min(700px, 65vh)" showExpand />
          </div>
        }
      />

      <p className="text-xs text-text-muted mt-6 pt-4 border-t border-surface-border">
        <Link href="/sources" className="hover:underline">About our data sources</Link>
      </p>
    </div>
  );
}
