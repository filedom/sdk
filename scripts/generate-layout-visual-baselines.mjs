#!/usr/bin/env node
/**
 * G2-LAYOUT-09: human-reviewable baselines derived from G2-LAYOUT-08 JSON diff.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "evidence", "gates", "G2-feasibility");
const diffPath = join(outDir, "layout-shaped-flow-visual-diff.json");
mkdirSync(outDir, { recursive: true });

const manifest = {
  generatedAt: new Date().toISOString(),
  status: "not-run",
  sourceArtifact: "layout-shaped-flow-visual-diff.json",
  baselineMarkdown: "layout-visual-baselines.md",
  humanReviewStatus: "pending",
  entries: [],
  note: "G2-LAYOUT-09 review baselines; gate G2 not-run until humanReviewStatus=approved.",
};

if (!existsSync(diffPath)) {
  manifest.status = "source-missing-not-run";
  writeFileSync(join(outDir, "layout-visual-baseline-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log("[generate-layout-visual-baselines] source missing");
  process.exit(0);
}

const diff = JSON.parse(readFileSync(diffPath, "utf8"));
manifest.status = diff.status === "recorded-json-snapshots" ? "generated-awaiting-review" : "source-not-run";

const mdLines = [
  "# Layout visual baselines (G2-LAYOUT-09)",
  "",
  `Generated: ${manifest.generatedAt}`,
  "",
  `Source status: \`${diff.status}\` — human review **${manifest.humanReviewStatus}**.`,
  "",
  "Compare flow vs Parley line text and widths per corpus entry.",
  "",
];

for (const entry of diff.entries ?? []) {
  manifest.entries.push({
    corpusId: entry.corpusId,
    jsonEqual: entry.jsonEqual,
    lineBreakEqual: entry.lineBreakEqual,
    flowLineCount: entry.flowLines?.length ?? 0,
    parleyLineCount: entry.parleyLines?.length ?? 0,
  });
  mdLines.push(`## ${entry.corpusId}`, "");
  mdLines.push(`- jsonEqual: **${entry.jsonEqual}**`);
  mdLines.push(`- lineBreakEqual: **${entry.lineBreakEqual}**`);
  mdLines.push(`- flow backend: \`${entry.flowBackend}\``);
  mdLines.push(`- parley backend: \`${entry.parleyBackend}\``, "");
  mdLines.push("### Flow lines");
  for (const line of entry.flowLines ?? []) {
    mdLines.push(`- \`${line.text}\` (${line.width_pt}×${line.height_pt} pt)`);
  }
  mdLines.push("", "### Parley lines");
  for (const line of entry.parleyLines ?? []) {
    mdLines.push(`- \`${line.text}\` (${line.width_pt}×${line.height_pt} pt)`);
  }
  mdLines.push("");
}

writeFileSync(join(outDir, "layout-visual-baselines.md"), `${mdLines.join("\n")}\n`);
writeFileSync(join(outDir, "layout-visual-baseline-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`[generate-layout-visual-baselines] ${manifest.status} (${manifest.entries.length} entries)`);
