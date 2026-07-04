/**
 * Regression test for a recurring layout bug: a narrative paragraph gets a
 * `max-w-prose` (or similar) class, capping it at ~65 characters while
 * everything else on the page (stat grids, charts, maps) spans the full
 * `.page-shell` width. This exact pattern has been found and fixed at least
 * 6 times before -- always on the subdivisions pages (see commits 7e417f2,
 * 3106c02, 64606b4, d4068a2, b86ac74, ac03fdd) -- and then reappeared on
 * /city and /neighborhoods/[slug]. Nothing previously prevented it from
 * recurring elsewhere.
 *
 * This is a static source scan, not a rendered-DOM check: it flags any
 * narrative-style <p> (identified by the `text-text-secondary` class, the
 * established convention for narrative/intro text) that also carries a
 * narrowing `max-w-*` token. Pages that deliberately cap their WHOLE content
 * width (e.g. app/about/page.tsx's `page-shell max-w-prose` on the outer
 * container `<div>`) are unaffected -- this only matches `<p>` tags.
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const NARROWING_MAX_W = /max-w-(prose|xs|sm|md|lg|xl|2xl|3xl|4xl)\b/;
const P_TAG_CLASS = /<p\s+className="([^"]*)"/g;

function collectTsxFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTsxFiles(fullPath));
    } else if (entry.isFile() && fullPath.endsWith(".tsx")) {
      results.push(fullPath);
    }
  }
  return results;
}

describe("narrative paragraphs span full page width", () => {
  it("no narrative <p> (text-text-secondary) combines with a narrowing max-w- class", () => {
    const appDir = path.resolve(process.cwd(), "app");
    const files = collectTsxFiles(appDir);
    const violations: string[] = [];

    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8");
      for (const match of content.matchAll(P_TAG_CLASS)) {
        const classes = match[1];
        if (classes.includes("text-text-secondary") && NARROWING_MAX_W.test(classes)) {
          violations.push(`${path.relative(process.cwd(), file)}: <p className="${classes}">`);
        }
      }
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });
});
