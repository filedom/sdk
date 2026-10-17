#!/usr/bin/env node
/**
 * G1-PDF-05: honest build placeholder for domdoc-pdfium-wasm (C24 + C25).
 * Emscripten pipeline lives in the future domdoc-pdfium-wasm repo; this script
 * records evidence when no local build root is configured.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "evidence", "gates", "G1-feasibility");
mkdirSync(outDir, { recursive: true });

const buildRoot = process.env.PDFIUM_WASM_BUILD_ROOT?.trim();
const record = {
  builtAt: new Date().toISOString(),
  status: buildRoot && existsSync(buildRoot) ? "build-root-present-not-run" : "not-configured",
  buildRoot: buildRoot ?? null,
  note: "Set PDFIUM_WASM_BUILD_ROOT to a domdoc-pdfium-wasm checkout, then run its Emscripten build. Ingest output via PDFIUM_WASM_ARTIFACT_DIR + pnpm fetch:pdfium-wasm.",
};

writeFileSync(join(outDir, "pdfium-wasm-build-record.json"), `${JSON.stringify(record, null, 2)}\n`);
console.log(`[build-pdfium-wasm] ${record.status}`);
