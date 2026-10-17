import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createPdfWriterWorkerClient } from "./pdf-writer-worker-client.js";
import { sha256 } from "./writer.js";

const minimalPdf = new TextEncoder().encode("%PDF-1.4\n%%EOF\n");

describe("G1-PDF-05 pdf writer worker", () => {
  it("isolates PDFium backend in a worker thread (no artifact)", async () => {
    const workerUrl = new URL("./pdf-writer-worker.ts", import.meta.url);
    const client = await createPdfWriterWorkerClient({
      workerScript: workerUrl,
      workerOptions: { execArgv: ["--import", "tsx/esm"] },
    });
    const contextId = "ctx-test";
    const checkpoint = {
      revision: 1,
      sourceSha256: sha256(minimalPdf),
      byteLength: minimalPdf.byteLength,
    };
    const preflight = await client.preflight(contextId, minimalPdf, checkpoint);
    if (preflight.ok) {
      expect(
        preflight.capabilities.reason === "backend-not-configured" ||
          preflight.capabilities.reason === "render-only-probe-adapter" ||
          preflight.capabilities.nativeTextReplace === "native",
      ).toBe(true);
    } else {
      expect(preflight.code).toBe("invalid-bytes");
    }
    await client.dispose(contextId);
    await client.terminate();
  });
});
