#!/usr/bin/env node
/**
 * Prints "true" or "false" — whether a vendored C24 module passes pdfium-proof-hooks runtime probe.
 */
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const candidates = [
  join(webRoot, "vendor", "domdoc-pdfium-wasm", "index.js"),
  join(webRoot, "vendor", "domdoc-pdfium-wasm", "index.mjs"),
];
if (process.env.DOMDOC_C24_PROBE_SIBLING === "1") {
  candidates.push(join(webRoot, "..", "domdoc-pdfium-wasm", "dist", "index.js"));
}

async function main() {
  const hooksUrl = pathToFileURL(
    join(webRoot, "packages", "core", "src", "formats", "pdf", "pdfium-proof-hooks.ts"),
  ).href;
  const { detectC24WriterExportsAtRuntime } = await import(hooksUrl);

  for (const path of candidates) {
    if (!existsSync(path)) continue;
    try {
      const mod = await import(pathToFileURL(path).href);
      if (await detectC24WriterExportsAtRuntime(mod.default)) {
        process.stdout.write("true");
        return;
      }
    } catch {
      /* try next candidate */
    }
  }
  process.stdout.write("false");
}

main().catch(() => {
  process.stdout.write("false");
});
