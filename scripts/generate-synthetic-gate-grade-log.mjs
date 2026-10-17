#!/usr/bin/env node
/** Writes G3 synthetic gate-grade evidence (explicit synthetic — not gate pass). */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "evidence", "gates", "G3-feasibility", "logs");
mkdirSync(outDir, { recursive: true });

const { buildSyntheticGateGradeCaptureLog } = await import(
  "../packages/core/dist/input/input-evidence-synthetic-gate-grade-generator.js"
);

for (const kind of ["ime-gate-grade", "sr-gate-grade"]) {
  const log = buildSyntheticGateGradeCaptureLog(kind);
  writeFileSync(
    join(outDir, `gate-grade-${kind.replace(/-/g, "_")}-synthetic-ci.json`),
    `${JSON.stringify(log, null, 2)}\n`,
  );
}

console.log("[generate-synthetic-gate-grade-log] wrote synthetic gate-grade logs (G3 not-run)");
