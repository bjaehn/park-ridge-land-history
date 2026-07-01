// Standalone runner for the data_quality_report()/data_quality_summary() RPCs
// (see supabase/migrations/20260703000013_data_quality_report.sql). Mirrors
// scripts/data/subdivisions/06_generate_qa_report.py: same "run after a data
// pipeline and dump a markdown snapshot" pattern, applied to the app's live
// data quality checks instead of the subdivision-matching pipeline.
//
// Usage: node scripts/data_quality_report.mjs
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the
// environment (same variables the app's admin server actions use).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outPath = path.join(repoRoot, "docs", "data-sources", "data-quality-report.md");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const { data: summary, error: summaryErr } = await supabase.rpc("data_quality_summary");
  if (summaryErr) throw summaryErr;

  const sections = [];
  for (const row of summary) {
    if (Number(row.issue_count) === 0) continue;
    const { data: detail, error: detailErr } = await supabase.rpc("data_quality_report", {
      p_check_type: row.check_type,
      p_limit: 50,
    });
    if (detailErr) throw detailErr;
    sections.push({ row, detail: detail ?? [] });
  }

  const total = summary.reduce((sum, r) => sum + Number(r.issue_count), 0);
  const lines = [];
  lines.push("# Data Quality Report");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push(`**${total.toLocaleString()} total issues** across ${summary.length} checks.`);
  lines.push("");
  lines.push("| Check | Severity | Count |");
  lines.push("|---|---|---|");
  for (const row of summary) {
    lines.push(`| ${row.label} | ${row.severity} | ${Number(row.issue_count).toLocaleString()} |`);
  }
  lines.push("");

  for (const { row, detail } of sections) {
    lines.push(`## ${row.label} (${row.severity}, ${Number(row.issue_count).toLocaleString()} total, showing up to 50)`);
    lines.push("");
    lines.push("| Entity | Problem | Suggested fix |");
    lines.push("|---|---|---|");
    for (const d of detail) {
      lines.push(`| ${d.entity_type} \`${d.entity_id}\` | ${d.problem} | ${d.suggested_fix} |`);
    }
    lines.push("");
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, lines.join("\n"));
  console.log(`Wrote ${outPath} (${total.toLocaleString()} issues across ${summary.length} checks)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
