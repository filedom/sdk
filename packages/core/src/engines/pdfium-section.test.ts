import { embedPdfium, pdfiumBytes as embedderBytes } from "../../../../../wasm/scripts/pdfium-section.mjs";
import { describe, expect, it } from "vitest";
import { FiledomError } from "../errors.js";
import { PDFIUM_MISSING_DETAIL, pdfiumBytes } from "./pdfium-section.js";

const empty = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);

describe("pdfium section", () => {
  it("reads the renderer the bundle build embeds", () => {
    const combined = embedPdfium(empty, empty) as Uint8Array;
    expect(Array.from(combined.subarray(0, 4))).toEqual([0x00, 0x61, 0x73, 0x6d]);
    expect(WebAssembly.validate(combined)).toBe(true);
    const read = pdfiumBytes(combined);
    expect(Array.from(read)).toEqual(Array.from(empty));
    expect(Array.from(embedderBytes(combined))).toEqual(Array.from(empty));
    expect(WebAssembly.validate(read)).toBe(true);
    const again = embedPdfium(combined, empty) as Uint8Array;
    expect(Array.from(again)).toEqual(Array.from(combined));
  });

  it("rejects an engine wasm that does not carry its renderer, before the file opens", () => {
    expect(() => pdfiumBytes(empty)).toThrow(FiledomError);
    expect(() => pdfiumBytes(empty)).toThrow(/PDF engine bundle is incomplete/);
    try {
      pdfiumBytes(empty);
    } catch (error) {
      expect(error).toBeInstanceOf(FiledomError);
      expect((error as FiledomError).code).toBe("bundle-missing");
      expect((error as FiledomError).detail).toBe(PDFIUM_MISSING_DETAIL);
    }
  });
});
