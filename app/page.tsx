import type { Metadata } from "next";
import { Suspense } from "react";
import { HOME_HERO_HEADLINE, HOME_HERO_SUBHEAD, HOW_IT_WORKS_STEPS, EXPLORE_CARDS, COVERAGE_DISCLAIMER } from "@/lib/content";
import { StatGrid } from "@/components/ui/StatGrid";
import { EntityCard } from "@/components/ui/EntityCard";
import { LoadingSkeleton } from "@/components/ui/EmptyState";
import { InlineSourceNote } from "@/components/ui/SourceNote";
import { HomeDecadeChart, HomeSearch, HomeStats } from "./_components/HomeClientComponents";

export const metadata: Metadata = {
  title: "Park Ridge Land History",
  description: "Find your property's story. Park Ridge Land History traces 13,381 properties from recorded plat to today.",
};

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

      {/* Stats */}
      <section className="mb-10">
        <p className="section-heading">Dataset at a glance</p>
        <Suspense fallback={<LoadingSkeleton rows={1} className="h-24" />}>
          <HomeStats />
        </Suspense>
        <InlineSourceNote>{COVERAGE_DISCLAIMER}</InlineSourceNote>
      </section>

      {/* Decade chart */}
      <section className="mb-10">
        <p className="section-heading">When Park Ridge was built</p>
        <Suspense fallback={<LoadingSkeleton rows={14} />}>
          <HomeDecadeChart />
        </Suspense>
      </section>

      {/* How it works */}
      <section className="mb-10">
        <p className="section-heading">How it works</p>
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {HOW_IT_WORKS_STEPS.map((step, i) => (
            <li key={i} className="bg-surface-card border border-surface-border rounded-lg p-4">
              <div className="text-accent-purple font-mono text-sm mb-2">0{i + 1}</div>
              <h3 className="text-sm font-semibold text-text-primary mb-1">{step.heading}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Explore cards */}
      <section className="mb-10">
        <p className="section-heading">Explore</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {EXPLORE_CARDS.map((card) => (
            <EntityCard
              key={card.href}
              href={card.href}
              title={card.heading}
              subtitle={card.body}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
