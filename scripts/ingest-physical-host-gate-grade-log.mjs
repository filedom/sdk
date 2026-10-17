#!/usr/bin/env node
/**
 * G3-INPUT-20: ingest gate-grade physical-host capture JSON into evidence slot.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "evidence", "gates", "G3-feasibility");
const logPath = process.env.PHYSICAL_HOST_GATE_GRADE_LOG?.trim();

if (!logPath || !existsSync(logPath)) {
  console.error(
    "[ingest-physical-host-gate-grade-log] set PHYSICAL_HOST_GATE_GRADE_LOG to exported capture JSON path.",
  );
  process.exit(2);
}

const rawPayload = JSON.parse(readFileSync(logPath, "utf8"));
const { validatePhysicalHostGateGradeIngestPayload } = await import(
  "../packages/core/dist/input/input-evidence-physical-host-gate-grade.js"
);
const validated = validatePhysicalHostGateGradeIngestPayload(rawPayload);
if (!validated.ok) {
  console.error(`[ingest-physical-host-gate-grade-log] invalid gate-grade log: ${validated.detail}`);
  process.exit(2);
}
const payload = validated.payload;

const slotId = payload.slotId ?? "IME-01-real";
const outPath = join(outDir, `${slotId}-gate-grade-ingested.json`);
mkdirSync(outDir, { recursive: true });

const ingested = {
  ...payload,
  card: "G3-INPUT-20",
  gateStatus: "not-run",
  ingestedAt: new Date().toISOString(),
  sourcePath: logPath,
  note: "G3-INPUT-20 gate-grade log ingested; G3 gate not-run until coordinator accepts physical-host evidence.",
};
writeFileSync(outPath, `${JSON.stringify(ingested, null, 2)}\n`);
console.log(`[ingest-physical-host-gate-grade-log] wrote ${outPath}`);
