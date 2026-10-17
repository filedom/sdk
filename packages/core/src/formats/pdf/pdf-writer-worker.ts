import { parentPort } from "node:worker_threads";
import {
  PDFIUM_RENDER_COMMIT,
  PDFIUM_SOURCE_COMMIT,
  PDFIUM_WASM_MODULE_SPEC,
} from "./pdfium-pin.js";
import {
  PdfiumWasmWriterBackend,
  tryLoadPdfiumWasmModule,
} from "./backends/pdfium-wasm-backend.js";
import type { PdfEditOperation } from "./types.js";

if (!parentPort) {
  throw new Error("pdf-writer-worker must run as a worker thread");
}

type WriterWorkerRequest =
  | {
      type: "pdf-writer/init";
      moduleUrl?: string;
      pdfiumSourceCommit: string;
      pdfiumRenderCommit: string;
    }
  | { type: "pdf-writer/preflight"; contextId: string; bytes: Uint8Array; checkpoint: { revision: number; sourceSha256: string; byteLength: number } }
  | {
      type: "pdf-writer/apply";
      contextId: string;
      operations: readonly PdfEditOperation[];
      expectedRevision: number;
    }
  | { type: "pdf-writer/save"; contextId: string }
  | { type: "pdf-writer/dispose"; contextId: string };

let backend: PdfiumWasmWriterBackend | null = null;
let initModuleUrl: string | undefined;

parentPort.on("message", async (msg: WriterWorkerRequest) => {
  try {
    switch (msg.type) {
      case "pdf-writer/init": {
        initModuleUrl = msg.moduleUrl ?? PDFIUM_WASM_MODULE_SPEC;
        const load = await tryLoadPdfiumWasmModule();
        backend = new PdfiumWasmWriterBackend(load);
        parentPort?.postMessage({
          ok: true,
          body: {
            moduleSpec: load.moduleSpec,
            pdfiumSourceCommit: msg.pdfiumSourceCommit || PDFIUM_SOURCE_COMMIT,
            pdfiumRenderCommit: msg.pdfiumRenderCommit || PDFIUM_RENDER_COMMIT,
            moduleLoaded: load.loaded,
            resolutionSource: load.resolutionSource ?? "npm-placeholder",
          },
        });
        break;
      }
      case "pdf-writer/preflight": {
        if (!backend) throw new Error("pdf-writer not initialized");
        backend.registerContext(msg.contextId, msg.checkpoint);
        const outcome = await backend.preflight(msg.bytes, msg.checkpoint);
        parentPort?.postMessage({ ok: true, body: outcome });
        break;
      }
      case "pdf-writer/apply": {
        if (!backend) throw new Error("pdf-writer not initialized");
        const outcome = await backend.apply(msg.contextId, msg.operations);
        parentPort?.postMessage({ ok: true, body: outcome });
        break;
      }
      case "pdf-writer/save": {
        if (!backend) throw new Error("pdf-writer not initialized");
        const outcome = await backend.save(msg.contextId);
        parentPort?.postMessage({ ok: true, body: outcome });
        break;
      }
      case "pdf-writer/dispose": {
        if (backend) await backend.disposeContext(msg.contextId);
        parentPort?.postMessage({ ok: true, body: { disposed: true } });
        break;
      }
      default:
        parentPort?.postMessage({ ok: false, error: "unknown pdf-writer message" });
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    parentPort?.postMessage({ ok: false, error });
  }
});
