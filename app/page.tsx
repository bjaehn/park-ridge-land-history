import type { Metadata } from "next";
import Link from "next/link";
import { HOME_HERO_HEADLINE, HOME_HERO_SUBHEAD, COVERAGE_DISCLAIMER, CITY_NARRATIVE, CITY_NARRATIVE_SOURCE_NOTE } from "@/lib/content";
import { InlineSourceNote } from "@/components/ui/SourceNote";
import { PageHeader } from "@/components/ui/PageHeader";
import { HighlightReel } from "@/components/ui/HighlightReel";
import { HomeSearch, HomeStats } from "./_components/HomeClientComponents";
import { HighlightIcon } from "@/lib/icons";
import type { HighlightGroup } from "@/components/ui/HighlightReel";

export const metadata: Metadata = {
  title: "Park Ridge Land History",
  description:
    "Find your property's story. Park Ridge Land History traces every property in Park Ridge, Illinois from its recorded plat to today.",
};

const CITY_HIGHLIGHTS: readonly HighlightGroup[] = [
  { heading: "Oldest surviving homes", category: "oldest" },
  { heading: "Most renovated properties", category: "most_active" },
  { heading: "Built since 2000", category: "newest" },
  { heading: "Largest homes", category: "largest" },
];

export default function HomePage() {
  return (
    <div className="page-shell">
      {/* Hero + key facts */}
      <section className="py-12 md:py-16">
        <PageHeader variant="hero" title={HOME_HERO_HEADLINE} subtitle={HOME_HERO_SUBHEAD} />
        <HomeSearch />
        <div className="mt-8">
          <HomeStats />
          <InlineSourceNote>{COVERAGE_DISCLAIMER}</InlineSourceNote>
        </div>
      </section>

      <hr className="border-surface-border" />

      {/* City story teaser */}
      <section className="mt-10 mb-10">
        <Link
          href="/city"
          className="block group bg-surface-card border border-surface-border rounded-lg px-5 py-4 hover:border-accent-purple/40 transition-colors"
        >
          <p className="text-sm text-text-secondary leading-relaxed group-hover:text-text-primary transition-colors">
            {CITY_NARRATIVE}
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent-purple">
            Explore city history →
          </span>
        </Link>
        <InlineSourceNote className="mt-2">{CITY_NARRATIVE_SOURCE_NOTE}</InlineSourceNote>
      </section>

      <hr className="border-surface-border" />

      {/* City-level highlights */}
      <section className="mt-10 mb-12">
        <div className="flex items-center gap-2 mb-4">
          <HighlightIcon size={14} strokeWidth={1.8} className="text-text-muted" aria-hidden="true" />
          <h2 className="section-heading !mb-0">Notable properties</h2>
        </div>
        <HighlightReel scope="city" scopeId="" groups={CITY_HIGHLIGHTS} limit={6} />
      </section>
    </div>
  );
}
