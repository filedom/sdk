#!/usr/bin/env node
/**
 * G2-LAYOUT-18: record independent human PNG review outside CI attestation flags.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "evidence", "gates", "G2-feasibility");
const manifestPath = join(outDir, "layout-visual-baseline-manifest.json");
const outPath = join(outDir, "layout-visual-independent-human-png-review.json");

const reviewerId = process.env.LAYOUT_INDEPENDENT_REVIEWER_ID?.trim();
if (!reviewerId) {
  console.error(
    "[record-layout-independent-png-review] set LAYOUT_INDEPENDENT_REVIEWER_ID (independent of LAYOUT_SIGNOFF_VISUAL_REVIEW_COMPLETE).",
  );
  process.exit(2);
}

if (!existsSync(manifestPath)) {
  console.log("[record-layout-independent-png-review] baseline manifest missing — not-run");
  process.exit(0);
}

const manifestBytes = readFileSync(manifestPath);
const manifestSha256 = createHash("sha256").update(manifestBytes).digest("hex");
const manifest = JSON.parse(manifestBytes.toString("utf8"));
const pngPaths = (manifest.entries ?? []).map((e) => e.baselinePngRelativePath).filter(Boolean);

const record = {
  recordedAt: new Date().toISOString(),
  card: "G2-LAYOUT-18",
  gateStatus: "not-run",
  reviewKind: "independent-human-png-review",
  independentOfCiAttestation: true,
  reviewerId,
  manifestSha256,
  reviewedPngRelativePaths: pngPaths,
  note: "G2-LAYOUT-18 independent PNG review recorded; NOT equivalent to gate G2 pass or LAYOUT_SIGNOFF_VISUAL_REVIEW_COMPLETE attestation.",
};

writeFileSync(outPath, `${JSON.stringify(record, null, 2)}\n`);
console.log(`[record-layout-independent-png-review] wrote ${outPath}`);
