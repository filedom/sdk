#!/usr/bin/env node
/**
 * CI-friendly stub for vendored domdoc-pdfium-wasm (G1-PDF-03).
 * Exits 0 without downloading until Origin/artifact hosting is configured.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "evidence", "gates", "G1-feasibility");
mkdirSync(outDir, { recursive: true });

const record = {
  fetchedAt: new Date().toISOString(),
  status: "stub-not-run",
  moduleSpec: "domdoc-pdfium-wasm@0.0.0-not-published",
  note: "Run full fetch/build pipeline locally per docs/pdfium-wasm-pin.md before enabling CI download.",
};

writeFileSync(join(outDir, "pdfium-wasm-fetch-stub.json"), `${JSON.stringify(record, null, 2)}\n`);
console.log("[fetch-pdfium-wasm-stub] wrote pdfium-wasm-fetch-stub.json (no artifact fetched)");
process.exit(0);
