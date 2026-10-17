import { describe, expect, it } from "vitest";
import { resolvePdfiumWasmModule } from "./pdfium-module-resolve.js";

describe("G1-PDF-06 pdfium module resolve", () => {
  it("falls back to npm placeholder without vendor artifact", () => {
    const resolved = resolvePdfiumWasmModule();
    expect(resolved.source).toBe("npm-placeholder");
    expect(resolved.spec).toContain("domdoc-pdfium-wasm");
  });
});
