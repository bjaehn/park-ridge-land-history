# Park Ridge Land History — Developer Notes

## Build Requirement

**Always run `npm run build` locally and confirm it passes before committing and pushing.** Fix any TypeScript or build errors before the commit. Never push broken builds.

## Page Content Order

All discovery pages (city, neighborhood, street, subdivision, PIN group) MUST follow this canonical section order. Omit sections with no data. Extra page-specific sections go in the most logical position within this hierarchy — never appended blindly to the bottom.

1. Breadcrumb
2. Page header (eyebrow · title · subtitle · badges · alias chips)
3. Introductory text / narrative / notes / historical summary
4. Contextual panels (e.g. SubdivisionHistoryPanel)
5. Stat grid
6. Map — always immediately after the stat grid
7. Price comparison (2015 vs. 2024)
8. Sales activity stat cards
9. Assessment snapshot
10. Charts — construction by decade first, then market history / home sales
11. Highlight reel
12. Sub-entity lists (streets, sections, blocks, property grids)
13. Source note


## UI Style Conventions

### Decade grouping
When grouping a list of items by construction decade, always use the pattern from
`app/pin/[prefix]/_PinGroupContent.tsx` (lines 310–352). Never invent a new visual style for this.

Structure:
- Outer container: `space-y-8`
- Header row: `flex items-center gap-3 mb-3` containing:
  - Era color dot: `<span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: getEraColor(decadeYear) ?? "#64748b" }} aria-hidden="true" />`
  - Decade label: `text-sm font-semibold text-text-secondary tracking-wide` — format as `"1990s"`, `"Unknown era"`
  - Horizontal rule: `<div className="flex-1 border-t border-surface-border" />`
  - Item count: `text-xs text-text-muted`
- Per-decade grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3`
- Era colors: `getEraColor()` from `src/lib/mapConfig.ts`
- Decade key: `p.year_built ? \`${Math.floor(p.year_built / 10) * 10}s\` : "Unknown"`
- Sort: chronological ascending, `"Unknown"` always last
