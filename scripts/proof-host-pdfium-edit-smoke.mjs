#!/usr/bin/env node
/**
 * G1 host native smoke (honest): Node cannot dlopen/link macOS libpdfium.a without a native addon.
 * Records host archive discovery + pdfium-lib probe render status; writer path remains sibling Emscripten.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const evidenceDir = join(webRoot, "evidence", "gates", "G1-feasibility");
const outPath = join(evidenceDir, "g1-host-pdfium-native-smoke-attempt.json");

const hostCandidates = [
  join(webRoot, "tools/pdfium-checkout/pdfium/out/ReleaseComplete/obj/libpdfium.a"),
  join(webRoot, "tools/pdfium-checkout/pdfium/out/Release/obj/libpdfium.a"),
];
const hostStaticLib = hostCandidates.find((p) => existsSync(p)) ?? null;

let hostNinja = null;
const ninjaEvidence = join(evidenceDir, "g1-emscripten-gclient-host-ninja-attempt.json");
if (existsSync(ninjaEvidence)) {
  try {
    hostNinja = JSON.parse(readFileSync(ninjaEvidence, "utf8"));
  } catch {
    hostNinja = { parseError: true };
  }
}

const { tryLoadPdfiumLibProbeRenderNode, describePdfiumLibProbeLayoutNode } = await import(
  "../packages/core/src/formats/pdf/pdfium-lib-probe-render-node.ts"
);

const probeLayout = describePdfiumLibProbeLayoutNode();
const probeRender = await tryLoadPdfiumLibProbeRenderNode();

const payload = {
  recordedAt: new Date().toISOString(),
  gate: "G1",
  gateStatus: "not-run",
  nativeHostLinkPolicy: {
    nodeDlopenFeasible: false,
    reason:
      "macOS host libpdfium.a is Mach-O; Node smoke without native addon is classification-only. Use pdfium-lib WASM probe for render experiments; C24 writer requires sibling domdoc-pdfium-wasm Emscripten build.",
    siblingBuildDoc: "packages/domdoc-pdfium-wasm/build/EMSCRIPTEN_SIBLING_BUILD.md",
  },
  hostStaticLib,
  hostStaticLibBytes: hostStaticLib && existsSync(hostStaticLib) ? readFileSync(hostStaticLib).length : null,
  hostNinjaStatus: hostNinja?.status ?? null,
  hostPdfiumLinkableFound: hostNinja?.hostPdfiumLinkableFound ?? null,
  probeRender: {
    renderOnly: true,
    probePresent: probeRender.probePresent,
    moduleLoaded: probeRender.moduleLoaded,
    error: probeRender.error ?? null,
    layout: probeLayout,
  },
  c24WriterExports: false,
  nextStep:
    "Run ../domdoc-pdfium-wasm/build-wasm.sh (or ingest production dist/) then PDFIUM_WASM_CI_WORKER=1 pnpm proof:p01-p05 before any c24WriterExports claim.",
};

mkdirSync(evidenceDir, { recursive: true });
writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);

console.log(`[proof:host-pdfium-edit-smoke] wrote ${outPath}`);
console.log(
  `[proof:host-pdfium-edit-smoke] hostStaticLib=${hostStaticLib ? "present" : "missing"} probeModuleLoaded=${probeRender.moduleLoaded}`,
);
process.exit(0);
