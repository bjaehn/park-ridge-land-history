import type { BreadcrumbItem } from "@/components/ui/Breadcrumb";

export const SITE_URL = "https://parkridgelandhistory.com";

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

/** Builds schema.org BreadcrumbList JSON-LD from the same items array passed to <Breadcrumb>. */
export function breadcrumbJsonLd(items: BreadcrumbItem[], currentPath: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      item: "href" in item ? absoluteUrl(item.href) : absoluteUrl(currentPath),
    })),
  };
}

type PlaceJsonLdOptions = {
  name: string;
  description: string;
  path: string;
  /** [minLng, minLat, maxLng, maxLat] */
  bbox?: [number, number, number, number] | null;
};

/** Builds schema.org Place JSON-LD for neighborhood/subdivision/street pages. */
export function placeJsonLd({ name, description, path, bbox }: PlaceJsonLdOptions) {
  return {
    "@context": "https://schema.org",
    "@type": "Place",
    name,
    description,
    url: absoluteUrl(path),
    ...(bbox
      ? {
          geo: {
            "@type": "GeoShape",
            box: `${bbox[1]} ${bbox[0]} ${bbox[3]} ${bbox[2]}`,
          },
        }
      : {}),
  };
}
