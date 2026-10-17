import {
  PDFIUM_RENDER_COMMIT,
  PDFIUM_SOURCE_COMMIT,
} from "./pdfium-pin.js";
import type {
  PdfApplyOutcome,
  PdfCheckpointRef,
  PdfEditOperation,
  PdfPreflightOutcome,
  PdfSaveOutcome,
} from "./types.js";

export interface PdfWriterWorkerClientOptions {
  workerScript: URL;
  workerOptions?: import("node:worker_threads").WorkerOptions;
  moduleUrl?: string;
}

export interface PdfWriterWorkerClient {
  preflight(
    contextId: string,
    bytes: Uint8Array,
    checkpoint: PdfCheckpointRef,
  ): Promise<PdfPreflightOutcome>;
  apply(
    contextId: string,
    operations: readonly PdfEditOperation[],
    expectedRevision: number,
  ): Promise<PdfApplyOutcome>;
  save(contextId: string): Promise<PdfSaveOutcome>;
  dispose(contextId: string): Promise<void>;
  terminate(): Promise<void>;
}

export async function createPdfWriterWorkerClient(
  options: PdfWriterWorkerClientOptions,
): Promise<PdfWriterWorkerClient> {
  const { Worker } = await import("node:worker_threads");
  const worker = new Worker(options.workerScript, {
    ...options.workerOptions,
    type: "module",
  } as import("node:worker_threads").WorkerOptions);

  await postWorker<{ moduleLoaded: boolean }>(worker, {
    type: "pdf-writer/init",
    moduleUrl: options.moduleUrl,
    pdfiumSourceCommit: PDFIUM_SOURCE_COMMIT,
    pdfiumRenderCommit: PDFIUM_RENDER_COMMIT,
  });

  return {
    preflight(contextId, bytes, checkpoint) {
      return postWorker(worker, {
        type: "pdf-writer/preflight",
        contextId,
        bytes,
        checkpoint,
      });
    },
    apply(contextId, operations, expectedRevision) {
      return postWorker(worker, {
        type: "pdf-writer/apply",
        contextId,
        operations,
        expectedRevision,
      });
    },
    save(contextId) {
      return postWorker(worker, { type: "pdf-writer/save", contextId });
    },
    async dispose(contextId) {
      await postWorker(worker, { type: "pdf-writer/dispose", contextId });
    },
    async terminate() {
      await worker.terminate();
    },
  };
}

function postWorker<T>(
  worker: import("node:worker_threads").Worker,
  msg: unknown,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const onMessage = (response: { ok: true; body: T } | { ok: false; error: string }) => {
      worker.off("message", onMessage);
      worker.off("error", onError);
      if (response.ok) resolve(response.body);
      else reject(new Error(response.error));
    };
    const onError = (err: Error) => {
      worker.off("message", onMessage);
      reject(err);
    };
    worker.on("message", onMessage);
    worker.on("error", onError);
    worker.postMessage(msg);
  });
}
