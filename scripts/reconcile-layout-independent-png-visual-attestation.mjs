#!/usr/bin/env node
/**
 * G2-LAYOUT-20: reconcile independent PNG review vs visual attestation packets.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { reconcileLayoutIndependentPngWithVisualAttestation } from "../packages/core/dist/layout/layout-visual-packet-reconciliation.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "evidence", "gates", "G2-feasibility");

function readJson(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null;
}

const independentPngReview = readJson(join(outDir, "layout-visual-independent-human-png-review.json"));
const visualAttestation = readJson(join(outDir, "layout-visual-human-signoff-signed.json"));
const coordinatorIndependentAccept = readJson(
  join(outDir, "layout-visual-independent-png-review-coordinator-accepted.json"),
);

const reconciliation = reconcileLayoutIndependentPngWithVisualAttestation({
  independentPngReview,
  visualAttestation,
  coordinatorIndependentAccept,
});

mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "layout-visual-packet-reconciliation.json");
writeFileSync(
  outPath,
  `${JSON.stringify({ ...reconciliation, recordedAt: new Date().toISOString() }, null, 2)}\n`,
);
console.log(`[reconcile-layout-packets] status=${reconciliation.status} wrote ${outPath}`);
