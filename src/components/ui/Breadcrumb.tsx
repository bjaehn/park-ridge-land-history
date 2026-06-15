import Link from "next/link";

export type BreadcrumbItem =
  | { label: string; href: string }
  | { label: string; current: true };

type Props = {
  items: BreadcrumbItem[];
};

/**
 * Single breadcrumb component for the City > Neighborhood > Street > Property
 * hierarchy. No "Block" level ever appears here.
 *
 * Items with `href` are links; the last item should have `current: true`.
 */
export function Breadcrumb({ items }: Props) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-text-secondary">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && (
              <span aria-hidden="true" className="text-text-muted">
                /
              </span>
            )}
            {"href" in item ? (
              <Link
                href={item.href}
                className="hover:text-text-link transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span
                aria-current="page"
                className="text-text-primary font-medium truncate max-w-[32ch]"
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
