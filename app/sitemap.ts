import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { fetchNeighborhoodSummaries } from "@/lib/data/neighborhoods";
import { fetchSubdivisionIndex } from "@/lib/supabase/subdivisionQueries";
import { fetchStreetList } from "@/lib/data/streets";
import { fetchAllParcelPins } from "@/lib/data/properties";

export const revalidate = 86400;

const STATIC_PATHS: Array<{ path: string; priority: number }> = [
  { path: "/", priority: 1 },
  { path: "/city", priority: 0.8 },
  { path: "/neighborhoods", priority: 0.7 },
  { path: "/subdivisions", priority: 0.7 },
  { path: "/streets", priority: 0.7 },
  { path: "/business-districts", priority: 0.6 },
  { path: "/planning-districts", priority: 0.6 },
  { path: "/permits", priority: 0.6 },
  { path: "/sources", priority: 0.5 },
  { path: "/about", priority: 0.5 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [neighborhoods, subdivisions, streets, pins] = await Promise.all([
    fetchNeighborhoodSummaries(),
    fetchSubdivisionIndex(),
    fetchStreetList(),
    fetchAllParcelPins(),
  ]);

  // PIN-group pages (/pin/[prefix]) exist at Township/Section/Block granularity.
  // The 10-digit Parcel level is deliberately excluded: it has no dedicated
  // content branch (see app/pin/[prefix]/_PinGroupContent.tsx) and would be
  // near-duplicate of the corresponding /properties/[pin] page.
  const townshipPrefixes = new Set<string>();
  const sectionPrefixes = new Set<string>();
  const blockPrefixes = new Set<string>();
  for (const pin of pins) {
    if (pin.length >= 2) townshipPrefixes.add(pin.slice(0, 2));
    if (pin.length >= 4) sectionPrefixes.add(pin.slice(0, 4));
    if (pin.length >= 7) blockPrefixes.add(pin.slice(0, 7));
  }
  const pinGroupPrefixes = [...townshipPrefixes, ...sectionPrefixes, ...blockPrefixes];

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map(({ path, priority }) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "weekly",
    priority,
  }));

  const neighborhoodEntries: MetadataRoute.Sitemap = neighborhoods.map((n) => ({
    url: `${SITE_URL}/neighborhoods/${encodeURIComponent(n.slug)}`,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const subdivisionEntries: MetadataRoute.Sitemap = subdivisions.map((s) => ({
    url: `${SITE_URL}/subdivisions/${encodeURIComponent(s.id)}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const streetEntries: MetadataRoute.Sitemap = streets.map((s) => ({
    url: `${SITE_URL}/streets/${encodeURIComponent(s.street_name_normalized)}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const pinGroupEntries: MetadataRoute.Sitemap = pinGroupPrefixes.map((prefix) => ({
    url: `${SITE_URL}/pin/${encodeURIComponent(prefix)}`,
    changeFrequency: "monthly",
    priority: 0.4,
  }));

  const propertyEntries: MetadataRoute.Sitemap = pins.map((pin) => ({
    url: `${SITE_URL}/properties/${encodeURIComponent(pin)}`,
    changeFrequency: "yearly",
    priority: 0.5,
  }));

  return [
    ...staticEntries,
    ...neighborhoodEntries,
    ...subdivisionEntries,
    ...streetEntries,
    ...pinGroupEntries,
    ...propertyEntries,
  ];
}
