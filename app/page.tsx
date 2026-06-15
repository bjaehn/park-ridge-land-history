import type { Metadata } from "next";
import { HOME_HERO_HEADLINE, HOME_HERO_SUBHEAD, COVERAGE_DISCLAIMER } from "@/lib/content";
import { InlineSourceNote } from "@/components/ui/SourceNote";
import { HighlightReel } from "@/components/ui/HighlightReel";
import { HomeSearch, HomeStats } from "./_components/HomeClientComponents";
import { NeighborhoodsGrid } from "./neighborhoods/_NeighborhoodsGrid";
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
      <section className="py-12 md:py-16 max-w-2xl">
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

      {/* City-level highlights */}
      <section className="mb-12">
        <HighlightReel scope="city" scopeId="" groups={CITY_HIGHLIGHTS} limit={6} />
      </section>

      {/* Neighborhoods */}
      <section className="mb-10">
        <p className="section-heading">Explore by neighborhood</p>
        <NeighborhoodsGrid />
      </section>
    </div>
  );
}
