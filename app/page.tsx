import type { Metadata } from "next";
import { HOME_HERO_HEADLINE, HOME_HERO_SUBHEAD, COVERAGE_DISCLAIMER } from "@/lib/content";
import { InlineSourceNote } from "@/components/ui/SourceNote";
import { HighlightReel } from "@/components/ui/HighlightReel";
import { HomeSearch, HomeStats } from "./_components/HomeClientComponents";
import { NeighborhoodsGrid } from "./neighborhoods/_NeighborhoodsGrid";
import { SparklinePriceCard } from "@/components/ui/SparklinePriceCard";
import { SparklineSalesVolumeCard } from "@/components/ui/SparklineSalesVolumeCard";
import { SparklinePermitCard } from "@/components/ui/SparklinePermitCard";
import { ArchiveInventory } from "@/components/ui/ArchiveInventory";
import { NeighborhoodIcon, HighlightIcon } from "@/lib/icons";
import { NeighborhoodCharts } from "@/components/ui/NeighborhoodCharts";
import type { HighlightGroup } from "@/components/ui/HighlightReel";

export const metadata: Metadata = {
  title: "Park Ridge Land History",
  description:
    "Find your property's story. Park Ridge Land History traces 13,381 properties from recorded plat to today.",
};

const CITY_HIGHLIGHTS: readonly HighlightGroup[] = [
  { heading: "Oldest surviving homes", category: "oldest" },
  { heading: "Most active properties", category: "most_active" },
  { heading: "Built since 2000", category: "newest" },
];

export default function HomePage() {
  return (
    <div className="page-shell">
      {/* Hero */}
      <section className="py-12 md:py-16">
        <h1 className="text-3xl md:text-4xl font-bold text-text-primary leading-tight mb-4">
          {HOME_HERO_HEADLINE}
        </h1>
        <p className="text-lg text-text-secondary leading-relaxed mb-8">
          {HOME_HERO_SUBHEAD}
        </p>
        <HomeSearch />
      </section>

      {/* Key facts */}
      <section className="mb-10">
        <HomeStats />
        <InlineSourceNote>{COVERAGE_DISCLAIMER}</InlineSourceNote>
      </section>

      <hr className="border-surface-border" />

      {/* City trends */}
      <section className="mt-10 mb-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SparklinePriceCard />
          <SparklineSalesVolumeCard />
          <SparklinePermitCard />
        </div>
      </section>

      <hr className="border-surface-border" />

      {/* Archive inventory */}
      <section className="mt-10 mb-10">
        <ArchiveInventory cardMode />
      </section>

      <hr className="border-surface-border" />

      {/* City-level highlights */}
      <section className="mt-10 mb-12">
        <div className="flex items-center gap-2 mb-4">
          <HighlightIcon size={14} strokeWidth={1.8} className="text-text-muted" aria-hidden="true" />
          <p className="section-heading !mb-0">Notable properties</p>
        </div>
        <HighlightReel scope="city" scopeId="" groups={CITY_HIGHLIGHTS} limit={6} />
      </section>

      <hr className="border-surface-border" />

      {/* Neighborhood charts */}
      <section className="mt-10 mb-10">
        <NeighborhoodCharts />
      </section>

      <hr className="border-surface-border" />

      {/* Neighborhoods */}
      <section className="mt-10 mb-10">
        <div className="flex items-center gap-2 mb-4">
          <NeighborhoodIcon size={14} strokeWidth={1.8} className="text-text-muted" aria-hidden="true" />
          <p className="section-heading !mb-0">Explore by neighborhood</p>
        </div>
        <NeighborhoodsGrid />
      </section>
    </div>
  );
}
