#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const webRoot = join(root, "..", "..");
const dist = join(root, "dist");
mkdirSync(dist, { recursive: true });

const C24_PIN = "7c55203ed66b0461378323e3fcf2efaf76755241";
const stubWasm = existsSync(join(dist, "domdoc_pdfium_contract_stub.wasm"));

/** In-repo scaffold default export is never DomdocPdfiumApi — stay false until vendor ingest replaces dist. */
const c24WriterExports = false;

function probeVendorWriterExportsReady() {
  const probe = spawnSync(
    "node",
    ["--import", "tsx/esm", join(root, "scripts", "probe-writer-exports.mjs")],
    { encoding: "utf8", cwd: webRoot },
  );
  return (probe.stdout ?? "").trim() === "true";
}

const vendorWriterExportsProbe = probeVendorWriterExportsReady();

writeFileSync(join(dist, "C24_PIN.txt"), `${C24_PIN}\n`);

writeFileSync(
  join(dist, "package.json"),
  `${JSON.stringify(
    {
      name: "domdoc-pdfium-wasm",
      version: "0.0.0-c24-scaffold",
      private: true,
      type: "module",
      main: "index.mjs",
      domdoc: {
        role: stubWasm ? "c24-scaffold-stub-wasm" : "c24-scaffold-manifest-only",
        c24WriterExports,
        vendorWriterExportsProbe,
      },
    },
    null,
    2,
  )}\n`,
);

writeFileSync(
  join(dist, "index.mjs"),
  `/** C24 contract scaffold — c24WriterExports false until vendored production module (G1 honest). */
export const PDFIUM_SOURCE_COMMIT = ${JSON.stringify(C24_PIN)};

export default {
  __domdocPdfiumContractScaffold: true,
  c24WriterExports: false,
  pdfiumSourceCommit: PDFIUM_SOURCE_COMMIT,
  stubWasmPresent: ${stubWasm},
  vendorWriterExportsProbe: ${vendorWriterExportsProbe},
  proofClassificationHook: "packages/core/src/formats/pdf/pdfium-proof-hooks.ts",
  requiredApi: "DomdocPdfiumApi (pdfium-native-api.ts)",
};
`,
);

writeFileSync(
  join(dist, "manifest-probe-sidecar.json"),
  `${JSON.stringify(
    {
      recordedAt: new Date().toISOString(),
      c24WriterExports,
      vendorWriterExportsProbe,
    },
    null,
    2,
  )}\n`,
);

console.log(
  `[domdoc-pdfium-wasm] manifest written stubWasm=${stubWasm} c24WriterExports=${c24WriterExports} vendorProbe=${vendorWriterExportsProbe}`,
);
