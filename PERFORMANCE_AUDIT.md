# Park Ridge Land History — Performance & Accessibility Baseline (2026-07-09)

Produced for Sprint 5 (A5.3). This is a **local relative baseline for regression-tracking within this repo, not a production SLA number.** It was measured against a local `next build && node .next/standalone/server.js` instance (Windows dev machine, no CDN, no real network conditions, shared CPU with everything else running locally) with real data — the same live Supabase project the production app uses (`NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` were added to local `.env.local` for this purpose, matching the values already present under `VITE_`-prefixed names). `parkridgelandhistory.com` is not yet deployed/resolvable, so a true production audit isn't possible yet — re-run this against the live URL once it exists, and expect materially better performance numbers there (CDN, dedicated CPU, HTTP/2, etc.) — do not compare these local numbers directly to a future production run.

**Methodology**: Lighthouse (`npx lighthouse`, headless Chrome, default simulated throttling) and axe-core (`npx @axe-core/cli`, real headless Chrome via chromedriver) against 4 representative pages: homepage `/`, `/city`, a property detail page `/properties/12022090040000` (1317 S Crescent Ave — a real parcel with sales/permit/assessment data), and `/search`.

## Lighthouse scores

| Page | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| Home | 85 | 96 | 96 | 100 | 3.6s | 0.102 | 0ms |
| City | **38** | 93 | 96 | 100 | **7.1s** | 0.174 | **1,370ms** |
| Property | 57 | 96 | 96 | 100 | 5.0s | 0.014 | 690ms |
| Search | 99 | 96 | 96 | 100 | 2.1s | 0 | 0ms |

## Top 5 performance findings

1. **[A2] `/city` is the slowest page by a wide margin** — Performance 38, LCP 7.1s, TBT 1,370ms. It renders the most chart-heavy content (era portrait, market history, permit activity) client-side; worth profiling which chart is the bottleneck and whether any can be deferred/lazy-loaded below the fold.
2. **[A3] Property detail page has a slow initial server response** — "Reduce initial server response time (Root document took 940ms)" was Lighthouse's #1 opportunity on `/properties/[pin]`, consistent with `_PropertyDetailContent.tsx` being the largest client-fetch page in the app (fetches property detail + block/nearby-homes data in parallel per Sprint 4's `Promise.all`). Worth checking whether any of those queries can be combined or cached server-side.
3. **[A3] Unused JavaScript across all 4 pages** — 116-197 KiB of estimated savings flagged on every page tested, largest on `/city` (197 KiB) and `/properties/[pin]` (196 KiB). Likely shared chart/map library code being shipped to pages that don't render it on initial load — a code-splitting/dynamic-import candidate.
4. **[A4] Elevated CLS on `/city` (0.174) and `/home` (0.102)** — above Google's "good" threshold (0.1). Both pages load chart/data sections that likely shift layout once data arrives; consider reserving space (skeleton height matching final content) before data loads.
5. **[A5] Property page LCP (5.0s) and City page LCP (7.1s) exceed the 2.5s "good" threshold** — likely the same root cause as #1/#2 (client-side data fetch before the largest content paints). A future sprint could investigate moving the first paint's critical content to the server component instead of the client-fetch pattern this app uses for every detail page.

## axe-core accessibility violations

| Page | Violations | Rules triggered |
|---|---|---|
| Home | 11 | color-contrast |
| City | 6 | aria-prohibited-attr, color-contrast |
| Property | 19 | aria-prohibited-attr, color-contrast |
| Search | 4 | color-contrast |

## Top 5 accessibility findings

1. **[A1] `color-contrast` fails on every page tested (4-18 occurrences each)** — the common thread across all 4 pages is footer links (`about`, `sources`, `mailto:`) and `text-text-muted`-classed text (source notes, meta labels, timestamps) not meeting WCAG AA 4.5:1 contrast against the dark background. Property page is worst (18 occurrences) because it has the most `text-muted` metadata (PIN breakdown labels, source notes, technical-detail `<dt>` labels). This is a design-token-level fix (lighten `text.muted` in `tailwind.config.ts`, currently `#5c5a72`) that would resolve most occurrences at once rather than page-by-page.
2. **[A1] `aria-prohibited-attr` on `LoadingSkeleton` (`src/components/ui/EmptyState.tsx:50`)** — the loading-state `<div>` has `aria-label="Loading"` with no ARIA role; axe flags `aria-label` as prohibited on a role-less generic element (screen readers may ignore it). Fix: add `role="status"` to the div (standard pattern for loading indicators) — a one-line, low-risk change since this component is used app-wide.
3. **[A2] The `aria-prohibited-attr` finding appeared on `/city` and `/properties/[pin]` but not `/` or `/search`** — meaning those two pages hit a loading state during the scan while the others didn't (client components fetch on mount). Worth re-running axe with a longer wait/settle time to confirm whether other pages have the same latent issue once their own loading states are triggered, rather than assuming only 2 pages are affected.
4. **[A3] Lighthouse's accessibility category (93-96) is more forgiving than axe's raw violation count would suggest** — Lighthouse only samples a subset of axe rules and weights by page impact; the gap between "96/100" and "18 raw violations" on the property page is a good illustration of why this sprint ran both tools rather than relying on the Lighthouse score alone.
5. **[A4] SEO and Best Practices are already strong (96-100 across all pages)** — no action needed there; noted so a future re-audit knows this isn't a regression risk area to prioritize re-checking.

## Not covered by this pass

- No live production URL audit (blocked on deployment — re-run once `parkridgelandhistory.com` is live).
- Only 4 of the app's ~15 page types were sampled (homepage, city, one property detail, search) — subdivision, neighborhood, street, and admin pages were not included; a future pass could extend coverage.
- Mobile-specific Lighthouse run (this pass used Lighthouse's default desktop-equivalent config) was not performed separately.
