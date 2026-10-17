import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { PdfiumLibProbeLayout, PdfiumLibProbeRenderStatus } from "./pdfium-lib-probe-render-stub.js";
import { PDFIUM_LIB_PROBE_RENDER_FEATURE_ID } from "./pdfium-lib-probe-render-stub.js";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "..");
const defaultProbeDir = join(webRoot, "vendor", "pdfium-lib-probe");

export function resolvePdfiumLibProbeDir(): string {
  const env = process.env.PDFIUM_LIB_PROBE_DIR?.trim();
  if (env && existsSync(env)) return env;
  return defaultProbeDir;
}

export function describePdfiumLibProbeLayoutNode(probeDir = resolvePdfiumLibProbeDir()): PdfiumLibProbeLayout {
  const adapterEntry = join(probeDir, "domdoc-probe-adapter.mjs");
  const packageJsonPresent = existsSync(join(probeDir, "package.json"));
  const wasmFiles: string[] = [];
  const jsGlueFiles: string[] = [];
  if (existsSync(probeDir)) {
    const walk = (dir: string, prefix = ""): void => {
      for (const name of readdirSync(dir, { withFileTypes: true })) {
        const rel = prefix ? `${prefix}/${name.name}` : name.name;
        const full = join(dir, name.name);
        if (name.isDirectory()) {
          walk(full, rel);
          continue;
        }
        if (name.name.endsWith(".wasm")) wasmFiles.push(rel);
        if (name.name.endsWith(".js") || name.name.endsWith(".mjs")) jsGlueFiles.push(rel);
      }
    };
    walk(probeDir);
  }
  return {
    probeDir,
    wasmFiles: wasmFiles.sort(),
    jsGlueFiles: jsGlueFiles.sort(),
    adapterEntry: existsSync(adapterEntry) ? adapterEntry : null,
    packageJsonPresent,
  };
}

export async function tryLoadPdfiumLibProbeRenderNode(): Promise<PdfiumLibProbeRenderStatus> {
  const layout = describePdfiumLibProbeLayoutNode();
  const base: PdfiumLibProbeRenderStatus = {
    featureId: PDFIUM_LIB_PROBE_RENDER_FEATURE_ID,
    renderOnly: true,
    nonProduction: true,
    probePresent: layout.wasmFiles.length > 0,
    moduleLoaded: false,
    layout,
  };
  if (!layout.adapterEntry) {
    return {
      ...base,
      error: layout.wasmFiles.length > 0
        ? "probe bytes present but domdoc-probe-adapter.mjs missing (run ci:build-pdfium-wasm with probe fetch)"
        : "pdfium-lib probe vendor empty",
    };
  }
  try {
    const mod = (await import(/* webpackIgnore: true */ pathToFileURL(layout.adapterEntry).href)) as {
      default?: { __domdocPdfiumLibProbeRender?: boolean };
    };
    if (!mod.default?.__domdocPdfiumLibProbeRender) {
      return { ...base, error: "probe adapter missing __domdocPdfiumLibProbeRender marker" };
    }
    return { ...base, moduleLoaded: true };
  } catch (err) {
    return {
      ...base,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function readPdfiumLibProbeManifestNode(): Record<string, unknown> | null {
  const path = join(resolvePdfiumLibProbeDir(), "probe-manifest.json");
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}
