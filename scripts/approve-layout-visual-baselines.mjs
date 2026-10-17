#!/usr/bin/env node
/**
 * G2-LAYOUT-10: CI structural baseline approval via pinned checksums (not true human review).
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "evidence", "gates", "G2-feasibility");
const diffPath = join(outDir, "layout-shaped-flow-visual-diff.json");
const manifestPath = join(outDir, "layout-visual-baseline-manifest.json");
const checksumPath = join(outDir, "layout-visual-baseline-checksums.json");

function snapshotChecksum(entry) {
  const stable = {
    corpusId: entry.corpusId,
    lineBreakEqual: entry.lineBreakEqual,
    flowLines: entry.flowLines,
    parleyLines: entry.parleyLines,
  };
  return createHash("sha256").update(JSON.stringify(stable)).digest("hex");
}

if (!existsSync(diffPath)) {
  console.log("[approve-layout-visual-baselines] source missing — not-run");
  process.exit(0);
}

const diff = JSON.parse(readFileSync(diffPath, "utf8"));
const pinMode = process.argv.includes("--pin");
let pinned = existsSync(checksumPath)
  ? JSON.parse(readFileSync(checksumPath, "utf8"))
  : { version: 1, entries: {} };

if (pinMode || !existsSync(checksumPath)) {
  for (const entry of diff.entries ?? []) {
    pinned.entries[entry.corpusId] = snapshotChecksum(entry);
  }
  pinned.pinnedAt = new Date().toISOString();
  pinned.note =
    "G2-LAYOUT-10: checksum pins simulate CI approval; this is NOT substitute for human visual review.";
  writeFileSync(checksumPath, `${JSON.stringify(pinned, null, 2)}\n`);
  console.log(`[approve-layout-visual-baselines] pinned ${Object.keys(pinned.entries).length} checksums`);
}

const mismatches = [];
for (const entry of diff.entries ?? []) {
  const expected = pinned.entries[entry.corpusId];
  const actual = snapshotChecksum(entry);
  if (expected !== actual) mismatches.push({ corpusId: entry.corpusId, expected, actual });
}

const manifest = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, "utf8"))
  : {
      generatedAt: new Date().toISOString(),
      sourceArtifact: "layout-shaped-flow-visual-diff.json",
      baselineMarkdown: "layout-visual-baselines.md",
      entries: [],
    };

manifest.approvalWorkflow = "G2-LAYOUT-10-checksum-pinned";
manifest.humanReviewStatus =
  mismatches.length === 0 ? "checksum-approved-ci-simulated" : "checksum-mismatch";
manifest.checksumSource = "layout-visual-baseline-checksums.json";
manifest.checksumMismatches = mismatches;
manifest.approvedAt = new Date().toISOString();
manifest.note =
  mismatches.length === 0
    ? "Structural baselines match pinned checksums for CI; gate G2 still not-run (no human sign-off)."
    : "Checksum mismatch — re-run record:layout-visual-diff or --pin after intentional change.";

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  `[approve-layout-visual-baselines] ${manifest.humanReviewStatus} (${mismatches.length} mismatches)`,
);
process.exit(mismatches.length === 0 ? 0 : 1);
