import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export type PdfiumModuleResolutionSource =
  | "env-module-path"
  | "vendor-artifact"
  | "npm-placeholder";

export interface PdfiumModuleResolution {
  /** Dynamic import specifier (file URL or package name). */
  spec: string;
  source: PdfiumModuleResolutionSource;
  vendorPath: string | null;
}

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "..");
const vendorDir = join(webRoot, "vendor", "domdoc-pdfium-wasm");

function readPackageMain(dir: string): string | null {
  const pkgPath = join(dir, "package.json");
  if (!existsSync(pkgPath)) return null;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { main?: string };
    const main = pkg.main ?? "index.js";
    const entry = join(dir, main);
    return existsSync(entry) ? entry : null;
  } catch {
    return null;
  }
}

/** G1-PDF-06: resolve vendored PDFium WASM entry after fetch or manual artifact drop. */
export function resolvePdfiumWasmModule(): PdfiumModuleResolution {
  const envEntry = process.env.PDFIUM_WASM_MODULE_PATH?.trim();
  if (envEntry && existsSync(envEntry)) {
    return {
      spec: pathToFileURL(envEntry).href,
      source: "env-module-path",
      vendorPath: dirname(envEntry),
    };
  }

  const artifactDir = process.env.PDFIUM_WASM_ARTIFACT_DIR?.trim();
  if (artifactDir && existsSync(artifactDir)) {
    const entry = readPackageMain(artifactDir);
    if (entry) {
      return {
        spec: pathToFileURL(entry).href,
        source: "vendor-artifact",
        vendorPath: artifactDir,
      };
    }
  }

  const vendorEntry = readPackageMain(vendorDir);
  if (vendorEntry) {
    return {
      spec: pathToFileURL(vendorEntry).href,
      source: "vendor-artifact",
      vendorPath: vendorDir,
    };
  }

  return {
    spec: "domdoc-pdfium-wasm@0.0.0-not-published",
    source: "npm-placeholder",
    vendorPath: null,
  };
}
