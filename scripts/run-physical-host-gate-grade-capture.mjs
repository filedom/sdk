#!/usr/bin/env node
/**
 * G3-INPUT-20: physical-host capture execution helper (macOS/Windows only).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "evidence", "gates", "G3-feasibility");
const outPath = join(outDir, "physical-host-capture-execution-plan.json");

const platform = process.platform;
const host =
  platform === "darwin" ? "macos" : platform === "win32" ? "windows" : platform === "linux" ? "linux-ci" : "unknown";
const canRun = host === "macos" || host === "windows";

mkdirSync(outDir, { recursive: true });
const plan = {
  recordedAt: new Date().toISOString(),
  card: "G3-INPUT-20",
  gateStatus: "not-run",
  host,
  canExecuteCaptureOnThisHost: canRun,
  steps: canRun
    ? [
        "Start domdoc-web demo on this machine (Chromium or system browser)",
        "Enable real IME composition or SR session per docs/demo-ime-sr-capture-sessions.md",
        "Export capture JSON with synthetic:false and validated fields",
        "Run: PHYSICAL_HOST_GATE_GRADE_LOG=path/to/log.json pnpm ingest:physical-host-gate-grade-log",
      ]
    : [
        "Physical capture cannot run on linux-ci — use macOS or Windows host",
        "See evidence/gates/G3-feasibility/physical-host-gate-grade-manifest.json",
      ],
  note: "G3-INPUT-20 execution helper; gate G3 not-run until real logs ingested.",
};
writeFileSync(outPath, `${JSON.stringify(plan, null, 2)}\n`);

if (!canRun) {
  console.log(`[run-physical-host-gate-grade-capture] skip — host=${host} (not physical macOS/Windows)`);
  process.exit(0);
}

console.log("[run-physical-host-gate-grade-capture] ready — follow steps in physical-host-capture-execution-plan.json");
console.log("  Demo: cd domdoc-web/packages/demo && pnpm dev");
process.exit(0);
