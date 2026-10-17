#!/usr/bin/env node
/**
 * G2-LAYOUT-13: simulated human sign-off — checksum of pinned baselines + labeled signature stub.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "evidence", "gates", "G2-feasibility");
const checksumPath = join(outDir, "layout-visual-baseline-checksums.json");
const templatePath = join(outDir, "layout-visual-human-signoff-template.json");
const signedPath = join(outDir, "layout-visual-human-signoff-signed.json");

if (!existsSync(checksumPath)) {
  console.log("[sign-layout-human-signoff] checksum source missing — not-run");
  process.exit(0);
}

const checksumBytes = readFileSync(checksumPath);
const signedChecksumSha256 = createHash("sha256").update(checksumBytes).digest("hex");
const template = existsSync(templatePath)
  ? JSON.parse(readFileSync(templatePath, "utf8"))
  : { templateVersion: 1, corpusEntryIds: ["LV-01", "LV-02", "LV-03"] };

const signed = {
  ...template,
  card: "G2-LAYOUT-13",
  humanReviewStatus: "simulated-signoff-labeled",
  reviewerId: "ci-simulated-reviewer",
  reviewedAt: new Date().toISOString(),
  checksumSource: "layout-visual-baseline-checksums.json",
  signedChecksumSha256,
  signatureKind: "simulated-local-integration",
  note: "Simulated signature for local integration only — NOT human visual review. Gate G2 remains not-run.",
};

writeFileSync(signedPath, `${JSON.stringify(signed, null, 2)}\n`);
console.log(`[sign-layout-human-signoff] wrote ${signedPath} (${signedChecksumSha256.slice(0, 12)}…)`);
process.exit(0);
