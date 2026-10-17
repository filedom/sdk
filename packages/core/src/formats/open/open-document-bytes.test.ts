import { describe, expect, it } from "vitest";
import { openDocumentFromBlob, openDocumentFromBytes } from "./open-document-bytes.js";

describe("F01 openDocumentFromBytes", () => {
  it("detects PDF bytes", () => {
    const result = openDocumentFromBytes(new TextEncoder().encode("%PDF-1.7\n"));
    expect(result.cancelled).toBe(false);
    expect(result.detection.kind).toBe("pdf");
  });

  it("cancels blob open when already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await openDocumentFromBlob(
      new Blob([new TextEncoder().encode("%PDF-1.7\n")]),
      { filename: "x.pdf" },
      controller.signal,
    );
    expect(result.cancelled).toBe(true);
    expect(result.bytes.byteLength).toBe(0);
  });
});
